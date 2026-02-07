# StreamFetch Web Frontend

Modern React-based web interface for StreamFetch music downloader.

## Features

- 🔍 Search tracks from TIDAL
- 📥 Download with real-time progress
- 🎨 Beautiful, responsive UI with Tailwind CSS
- 📊 Live download status updates via Server-Sent Events

## Development

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` and will proxy API requests to the FastAPI backend running on port 8000.

## Build

```bash
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `VITE_API_URL`: FastAPI backend URL (default: `http://localhost:8000`)
