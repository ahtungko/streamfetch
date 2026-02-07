# Changelog

## [0.2.0] - Web Application Release

### Added

#### Backend (FastAPI)
- **FastAPI Web API** (`src/streamfetch/api/main.py`)
  - RESTful API endpoints for search, metadata, and download operations
  - Server-Sent Events (SSE) for real-time download progress
  - Background task processing for concurrent downloads
  - File serving endpoint to download completed files
  - Interactive API documentation (Swagger UI) at `/docs`
  - Health check endpoint at `/health`
  - CORS middleware for frontend integration

#### Frontend (React + Vite)
- **Modern React Web Interface** (`web/`)
  - Beautiful, responsive UI built with React 18
  - Tailwind CSS for modern styling
  - Real-time download progress via EventSource (SSE)
  - Mobile-friendly, responsive design
  - Quality badges for track display (Hi-Res, Lossless, High)
  - Download status indicators with progress bars
  - Track search with instant results
  - Download management dashboard

#### Components
- **SearchBar** - Search input with loading states
- **TrackList** - Display search results with download buttons
- **DownloadManager** - Real-time download progress tracking

#### Development Tools
- **start-web.sh** - Unified startup script for both backend and frontend
- **DEPLOYMENT.md** - Comprehensive deployment guide
- **Web README** - Frontend-specific documentation

### Changed

#### Core Downloader Refactoring
- **TidalDownloader** now supports optional `progress_callback` parameter
  - Allows headless operation without Rich progress bars
  - Emits progress events for web integration
  - Maintains backward compatibility with CLI mode
- Progress callbacks emit stage-based updates:
  - `metadata` - Fetching track metadata
  - `manifest` - Getting stream manifest
  - `downloading` - Downloading audio segments
  - `cover` - Downloading cover art
  - `lyrics` - Fetching lyrics
  - `muxing` - FFmpeg processing
  - `completed` - Download finished
  - `error` - Error occurred

- `process_track` now returns the final file path on success
- Download methods now handle both CLI (with Rich) and Web (with callbacks) modes

#### Configuration
- Added FastAPI, Uvicorn, and python-multipart dependencies
- Updated `.gitignore` to exclude web-specific files
- Updated README with web application documentation

### Technical Details

**Backend Architecture:**
- FastAPI for async API endpoints
- Background task processing for downloads
- SSE for real-time progress streaming
- File response handling for completed downloads
- In-memory download state management

**Frontend Architecture:**
- Vite for fast development and building
- React functional components with hooks
- EventSource API for SSE connection
- Proxy configuration for API requests
- Environment variable support for configuration

**API Endpoints:**
- `POST /api/search` - Search for tracks
- `GET /api/metadata/{track_id}` - Get track metadata
- `GET /api/album/{album_id}` - Get album information
- `GET /api/playlist/{playlist_id}` - Get playlist information
- `POST /api/download` - Start track download
- `GET /api/download/{download_id}/progress` - Get download progress
- `GET /api/download/{download_id}/stream` - SSE progress stream
- `GET /api/download/{download_id}/file` - Download completed file
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation

### Migration Guide

**For CLI Users:**
- No changes needed! The CLI remains fully functional with all existing commands
- Use `streamfetch` or `sf` commands as before

**For New Web Users:**
1. Install dependencies: `pip install -e .` and `cd web && npm install`
2. Run the application: `./start-web.sh`
3. Access at `http://localhost:5173`

**For Developers:**
- The downloader now supports progress callbacks - see `TidalDownloader.__init__(api, progress_callback=None)`
- To use in headless mode, pass a callback function that receives progress dictionaries
- The CLI mode automatically uses Rich progress bars when no callback is provided

### Dependencies Added

**Python:**
- `fastapi` (>=0.115.0, <0.116.0)
- `uvicorn[standard]` (>=0.32.0, <0.33.0)
- `python-multipart` (>=0.0.12, <0.1.0)

**Node.js (Frontend):**
- `react` (^19.1.0)
- `react-dom` (^19.1.0)
- `vite` (^6.2.3)
- `tailwindcss` (^3.x)
- `postcss` (^8.x)
- `autoprefixer` (^10.x)

### Backward Compatibility

- **100% backward compatible** with existing CLI functionality
- All CLI commands work exactly as before
- Configuration file format unchanged
- No breaking changes to existing API

### Known Issues

None at this time.

### Future Enhancements

Potential features for future releases:
- User authentication and multi-user support
- Download history and favorites
- Playlist creation and management
- Quality presets and user preferences
- Download queue management
- Batch download support
- Search filters and advanced search
- Album/Artist pages
- Integration with music players
- Docker images for easy deployment
- Mobile apps (iOS/Android)

## [0.1.0] - Initial CLI Release

### Added
- Command-line interface for TIDAL music download
- Support for Hi-Res/Master, Lossless, and High quality audio
- Automatic metadata and cover art embedding
- Lyrics fetching with fallback to LRCLib
- DASH manifest parsing and concurrent segment downloading
- Configurable output path templates
- Interactive search mode
- Album and playlist download support
- Server rotation and automatic retry
- Rich terminal UI with progress bars
