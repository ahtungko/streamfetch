# StreamFetch

A Python-based music downloader for TIDAL with both CLI and Web interfaces. Supports Hi-Res/Master audio download, metadata embedding, and lyrics retrieval.

## 🌟 Features

- 🎵 **Dual Interface**: Command-line tool + Modern web application
- 🎧 **High Quality**: Supports Hi-Res/Master, Lossless (FLAC), and High (AAC) quality
- 🖼️ **Complete Metadata**: Auto-embeds cover art, tags, and lyrics
- 🌐 **Web UI**: Beautiful React-based interface with real-time download progress
- ⚡ **Fast Downloads**: Concurrent segment downloading with progress tracking
- 🔄 **Auto Fallback**: Automatically tries lower quality if requested quality unavailable

## 📋 Prerequisites

Ensure **FFmpeg** is installed and added to your system PATH:

- **Windows**: [Download FFmpeg](https://ffmpeg.org/download.html) and add `bin` directory to Path
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

For the web application, you'll also need:
- **Node.js** 18+ and npm
- **Python** 3.12+
- **Poetry** for dependency management

## 🚀 Installation

### CLI Installation (via pipx)

```bash
pipx install git+https://github.com/Rkorona/streamfetch.git
```

### Web Application Setup

1. Clone the repository:
```bash
git clone https://github.com/Rkorona/streamfetch.git
cd streamfetch
```

2. Install dependencies:
```bash
# Install Python dependencies
poetry install

# Install frontend dependencies
cd web
npm install
cd ..
```

3. Start the web application:
```bash
./start-web.sh
```

This will start both the FastAPI backend (port 8000) and React frontend (port 5173).

**Alternatively**, start them separately:

```bash
# Terminal 1: Start FastAPI backend
poetry run python -m uvicorn streamfetch.api.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Start React frontend
cd web && npm run dev
```

## 📖 Usage

### Web Interface

1. Open your browser to `http://localhost:5173`
2. Search for tracks using the search bar
3. Click "Download" on any track
4. Monitor real-time progress in the Downloads section
5. Download the completed file to your device

### Command Line Interface

After installation, use `streamfetch` or `sf` command:

#### 1. Interactive Search

Search and select tracks to download:

```bash
sf search "Track Title"
# Search with artist: Artist + Track or Track + Artist for precise results
sf search "Artist - Track Title"
```

#### 2. Download Single Track

Supports URLs or IDs:

```bash
sf track 123456          # Using ID
sf track https://tidal.com/browse/track/123456  # Using URL
```

#### 3. Download Album

```bash
sf album https://tidal.com/browse/album/123456
```

#### 4. Download Playlist

```bash
sf playlist uuid-string
sf playlist https://tidal.com/browse/playlist/uuid-string
```

## ⚙️ Configuration

On first run, a configuration file `config.yml` is automatically generated:

- **Linux/macOS**: `~/.config/streamfetch/config.yml`
- **Windows**: `%APPDATA%\streamfetch\config.yml`

You can also place `config.yml` in the current working directory for project-specific settings.

### Key Configuration Options

```yaml
audio:
  max_quality: "HIRES_LOSSLESS"  # HI_RES_LOSSLESS, LOSSLESS, HIGH
  auto_fallback: True             # Auto-downgrade if quality unavailable

network:
  concurrency: 10                 # Parallel segment downloads
  timeout: 30                     # Request timeout (seconds)

naming:
  file_format: "{Artist}/{Album}/{Title}"  # Customizable path template

lyrics:
  save_lrc: False                 # Save synced lyrics as .lrc file
```

## 🏗️ Architecture

### Backend (FastAPI)
- RESTful API endpoints for search, metadata, and downloads
- Server-Sent Events (SSE) for real-time progress updates
- Background task processing for concurrent downloads
- Reuses existing TIDAL API and downloader logic

### Frontend (React + Vite)
- Modern, responsive UI built with React and Tailwind CSS
- Real-time download progress via EventSource (SSE)
- Mobile-friendly design
- Quality badges and download status indicators

### Core Components
- **TidalApi**: TIDAL API client with server rotation and retries
- **TidalDownloader**: Download orchestration with optional progress callbacks
- **DashParser**: DASH manifest parser for segment extraction
- **FFmpeg wrapper**: Metadata and cover art embedding

## 🛠️ Development

### Backend Development

```bash
# Install dependencies
poetry install

# Run with auto-reload
poetry run uvicorn streamfetch.api.main:app --reload --port 8000

# View API documentation
open http://localhost:8000/docs
```

### Frontend Development

```bash
cd web

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
streamfetch/
├── src/streamfetch/
│   ├── main.py           # CLI entrypoint (Typer)
│   ├── api/              # FastAPI web application
│   │   ├── main.py       # API routes and SSE
│   │   └── __init__.py
│   ├── tidal/            # TIDAL API client & downloader
│   ├── dash/             # DASH manifest parser
│   ├── media/            # FFmpeg wrapper
│   ├── config/           # Configuration management
│   ├── utils/            # HTTP, logging, filename utils
│   └── cli/              # Interactive CLI components
├── web/                  # React frontend
│   ├── src/
│   │   ├── App.jsx       # Main app component
│   │   ├── components/   # React components
│   │   └── index.css     # Tailwind styles
│   ├── package.json
│   └── vite.config.js
├── pyproject.toml        # Python dependencies
├── start-web.sh          # Unified startup script
└── README.md
```

## 🌐 API Endpoints

- `POST /api/search` - Search for tracks
- `GET /api/metadata/{track_id}` - Get track metadata
- `POST /api/download` - Start track download
- `GET /api/download/{download_id}/stream` - SSE progress stream
- `GET /api/download/{download_id}/file` - Download completed file
- `GET /docs` - Interactive API documentation (Swagger UI)

## ⚠️ Disclaimer

This project is for Python learning and technical research purposes only. Please delete downloads within 24 hours and support official music platforms. Users are solely responsible for any legal consequences arising from the use of this tool.

## 📄 License

For educational and research purposes only.
