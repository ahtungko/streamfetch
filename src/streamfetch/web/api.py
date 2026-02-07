from fastapi import APIRouter, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
import logging
import json
from pathlib import Path

from streamfetch.tidal.api import TidalApi
from streamfetch.tidal.downloader import TidalDownloader
from streamfetch.config.api_targets import get_base_url
from streamfetch.config.settings import config

router = APIRouter()
logger = logging.getLogger("streamfetch")

# --- Manager & State ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Global State (Simplified for single user)
download_queue = []
is_downloading = False

# Initialize API and Downloader
base_url = get_base_url()
api = TidalApi(base_url)
downloader = TidalDownloader(api)

# Ensure download dir
download_dir = Path(config["general"]["download_dir"])
if not download_dir.is_absolute():
    download_dir = Path.cwd() / download_dir
download_dir.mkdir(parents=True, exist_ok=True)


# --- Background Worker ---

async def process_queue():
    global is_downloading
    if is_downloading:
        return
    
    is_downloading = True
    try:
        while download_queue:
            item = download_queue.pop(0)
            track_id = item["id"]
            title = item["title"]
            
            await manager.broadcast({
                "type": "queue_update", 
                "queue": download_queue,
                "current": item
            })

            def progress_callback(status, **kwargs):
                # This runs in a thread, so we need to schedule async broadcast
                # ideally we should use a loop, but for simplicity we rely on fire-and-forget logic or polling
                # BUT since broadcast is async, we can't await it effectively from sync callback easily without a loop
                # Hack: define a synchronous wrapper that creates a task
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                payload = {"type": "progress", "trackId": track_id, "status": status}
                payload.update(kwargs)
                
                # We can't easily broadcast from threaded callback to async websocket in different loop
                # Better approach: The worker should be async or we use a queue to communicate back to main loop
                pass 

            # Refined Approach: 
            # We will use a wrapper that puts messages into an asyncio Queue, 
            # and a separate coroutine broadcasting them.
            # For this MVP, we will just blocking-wait on a thread and emit events? 
            # No, FastAPI handles async.
            
            # Let's run the blocking synchronous download in a threadpool
            # And use a queue-based callback maybe?
            
            # Simple Solution for MVP:
            # We define a callback that uses `asyncio.run_coroutine_threadsafe` if we have access to the main loop.
            # But getting the main loop is tricky here.
            
            # Let's try to just use a sync wrapper that updates a global state, and frontend polls?
            # Or better: ConnectionManager broadcast can be called if we have the loop.
            
            loop = asyncio.get_running_loop()
            
            def sync_progress_callback(status, **kwargs):
                payload = {"type": "progress", "trackId": track_id, "status": status}
                payload.update(kwargs)
                asyncio.run_coroutine_threadsafe(manager.broadcast(payload), loop)

            try:
                # process_track now returns the path to the downloaded file (we need to ensure downloader returns it)
                # Currently downloader.process_track returns None. We need to modify it or assume filename.
                # Let's modify downloader.py to return the final path first. 
                # For now, let's assume we need to modify downloader.py.
                
                # Wait, I better modify downloader.py first to return the path.
                # But I can't do two files at once easily with replace_content in valid way if I depend on it here.
                # I'll effectively change this to capture the result, assuming I will fix downloader next.
                
                final_path = await asyncio.to_thread(downloader.process_track, track_id, download_dir, sync_progress_callback)
            except Exception as e:
                logger.error(f"Download error: {e}")
                await manager.broadcast({"type": "error", "message": str(e)})
                continue # Skip completion broadcast on error
            
            download_url = None
            if final_path:
                # Use the new file endpoint
                # We need to make sure we can identify the file. 
                # Ideally we pass a unique ID or relative path. 
                # For security and simplicity, let's use the relative path but encode it safely if needed.
                # Here we assume final_path is within download_dir.
                try:
                    relative_path = final_path.relative_to(download_dir)
                    # We will serve via /api/files/?path=... to handle subdirs if needed, or just flatten.
                    # Let's simple use the full relative path string
                    encoded_path = str(relative_path).replace("\\", "/")
                    download_url = f"/api/files?path={encoded_path}"
                except Exception:
                    pass

            await manager.broadcast({"type": "complete", "trackId": track_id, "downloadUrl": download_url})

    finally:
        is_downloading = False
        await manager.broadcast({"type": "queue_update", "queue": [], "current": None})

from fastapi.responses import FileResponse
import os

@router.get("/files")
async def get_file(path: str, background_tasks: BackgroundTasks):
    # Security check: ensure path is within download_dir
    safe_path = (download_dir / path).resolve()
    if not str(safe_path).startswith(str(download_dir.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not safe_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Schedule deletion after response
    background_tasks.add_task(os.remove, safe_path)
    
    return FileResponse(safe_path, filename=safe_path.name)


# --- Models ---

class SearchQuery(BaseModel):
    query: str

class DownloadRequest(BaseModel):
    items: List[Dict] # Expects {id, title, ...}

# --- Endpoints ---

@router.get("/search")
async def search(q: str):
    try:
        results = await asyncio.to_thread(api.search_tracks, q)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/download")
async def add_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    global download_queue
    # Add items to queue
    for item in req.items:
        # Avoid duplicates
        if not any(x['id'] == item['id'] for x in download_queue):
            download_queue.append(item)
    
    # Trigger background processing
    background_tasks.add_task(process_queue)
    
    return {"status": "added", "queue_length": len(download_queue)}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial state
        await websocket.send_json({
            "type": "queue_update",
            "queue": download_queue,
            "current": None # TODO: track current properly
        })
        while True:
            await websocket.receive_text() # Keep alive / minimal interaction
    except WebSocketDisconnect:
        manager.disconnect(websocket)
