"""FastAPI application for StreamFetch web interface"""
import asyncio
import json
import uuid
from pathlib import Path
from typing import Optional, Dict
from collections import defaultdict
import logging

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from streamfetch.config.api_targets import get_base_url
from streamfetch.tidal.api import TidalApi
from streamfetch.tidal.downloader import TidalDownloader
from streamfetch.config.settings import config
from streamfetch.main import extract_id

logger = logging.getLogger("streamfetch")

# Create FastAPI app
app = FastAPI(
    title="StreamFetch API",
    description="Music search and download API for TIDAL",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for download management
download_progress: Dict[str, Dict] = defaultdict(dict)
download_queues: Dict[str, asyncio.Queue] = {}

# Initialize download directory
download_dir = Path(config["general"]["download_dir"])
if not download_dir.is_absolute():
    download_dir = Path.cwd() / download_dir
download_dir.mkdir(parents=True, exist_ok=True)


# Request/Response Models
class SearchRequest(BaseModel):
    query: str


class DownloadRequest(BaseModel):
    track_id: str


class DownloadResponse(BaseModel):
    download_id: str
    message: str


# API Endpoints
@app.get("/")
async def root():
    return {
        "name": "StreamFetch API",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/search")
async def search_tracks(request: SearchRequest):
    """Search for tracks on TIDAL"""
    try:
        base_url = get_base_url()
        api = TidalApi(base_url)
        results = api.search_tracks(request.query)
        return {"results": results}
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metadata/{track_id}")
async def get_track_metadata(track_id: str):
    """Get metadata for a specific track"""
    try:
        base_url = get_base_url()
        api = TidalApi(base_url)
        metadata = api.get_metadata(track_id)
        return metadata
    except Exception as e:
        logger.error(f"Metadata error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/album/{album_id}")
async def get_album(album_id: str):
    """Get album information and tracks"""
    try:
        base_url = get_base_url()
        api = TidalApi(base_url)
        album_data = api.get_album(album_id)
        return album_data
    except Exception as e:
        logger.error(f"Album error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/playlist/{playlist_id}")
async def get_playlist(playlist_id: str):
    """Get playlist information and tracks"""
    try:
        base_url = get_base_url()
        api = TidalApi(base_url)
        playlist_id = extract_id(playlist_id)
        playlist_data = api.get_playlist(playlist_id)
        return playlist_data
    except Exception as e:
        logger.error(f"Playlist error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def progress_callback_factory(download_id: str):
    """Factory to create progress callback for a specific download"""
    queue = asyncio.Queue()
    download_queues[download_id] = queue
    
    def callback(progress_data):
        try:
            # Store the latest progress
            download_progress[download_id] = progress_data
            # Put in queue for SSE
            asyncio.create_task(queue.put(progress_data))
        except Exception as e:
            logger.error(f"Progress callback error: {e}")
    
    return callback


def download_track_task(download_id: str, track_id: str):
    """Background task to download a track"""
    try:
        base_url = get_base_url()
        api = TidalApi(base_url)
        
        # Create callback
        def sync_callback(progress_data):
            download_progress[download_id] = progress_data
            # Try to put in queue if it exists
            if download_id in download_queues:
                try:
                    download_queues[download_id].put_nowait(progress_data)
                except:
                    pass
        
        downloader = TidalDownloader(api, progress_callback=sync_callback)
        result = downloader.process_track(track_id, download_dir)
        
        if result:
            # Store the final file path
            download_progress[download_id]["file_path"] = str(result)
            download_progress[download_id]["file_name"] = result.name
            sync_callback({
                "stage": "completed",
                "message": f"Download completed: {result.name}",
                "file_path": str(result),
                "file_name": result.name
            })
        else:
            sync_callback({
                "stage": "error",
                "message": "Download failed"
            })
    except Exception as e:
        logger.error(f"Download task error: {e}")
        download_progress[download_id] = {
            "stage": "error",
            "message": str(e)
        }
        if download_id in download_queues:
            try:
                download_queues[download_id].put_nowait({
                    "stage": "error",
                    "message": str(e)
                })
            except:
                pass


@app.post("/api/download", response_model=DownloadResponse)
async def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Start downloading a track"""
    download_id = str(uuid.uuid4())
    
    # Initialize progress
    download_progress[download_id] = {
        "stage": "queued",
        "message": "Download queued"
    }
    
    # Add to background tasks
    background_tasks.add_task(download_track_task, download_id, request.track_id)
    
    return DownloadResponse(
        download_id=download_id,
        message="Download started"
    )


@app.get("/api/download/{download_id}/progress")
async def get_download_progress(download_id: str):
    """Get current progress of a download"""
    if download_id not in download_progress:
        raise HTTPException(status_code=404, detail="Download not found")
    
    return download_progress[download_id]


@app.get("/api/download/{download_id}/stream")
async def stream_download_progress(download_id: str):
    """Stream download progress via Server-Sent Events"""
    if download_id not in download_progress:
        raise HTTPException(status_code=404, detail="Download not found")
    
    async def event_generator():
        # Create queue for this connection
        queue = asyncio.Queue()
        download_queues[download_id] = queue
        
        # Send initial state
        current_progress = download_progress.get(download_id, {})
        yield f"data: {json.dumps(current_progress)}\n\n"
        
        try:
            while True:
                # Wait for new progress updates
                progress_data = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield f"data: {json.dumps(progress_data)}\n\n"
                
                # Break if completed or error
                if progress_data.get("stage") in ["completed", "error"]:
                    break
        except asyncio.TimeoutError:
            # Keep connection alive with heartbeat
            yield f"data: {json.dumps({'stage': 'heartbeat'})}\n\n"
        except Exception as e:
            logger.error(f"SSE error: {e}")
        finally:
            # Clean up queue
            if download_id in download_queues:
                del download_queues[download_id]
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.get("/api/download/{download_id}/file")
async def download_file(download_id: str):
    """Download the completed file"""
    if download_id not in download_progress:
        raise HTTPException(status_code=404, detail="Download not found")
    
    progress_data = download_progress[download_id]
    
    if progress_data.get("stage") != "completed":
        raise HTTPException(status_code=400, detail="Download not completed yet")
    
    file_path = progress_data.get("file_path")
    if not file_path or not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_name = progress_data.get("file_name", "download.flac")
    
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="audio/flac"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
