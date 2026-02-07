# StreamFetch Web

StreamFetch is a modern web application for searching and downloading high-quality music from Tidal. It features a responsive dark-themed UI, real-time progress updates, and automatic browser downloads.

## Features 🌟

- **Web Interface**: Clean, responsive dark mode UI.
- **Interactive Search**: Real-time search of the Tidal library.
- **One-Click Download**: Queue tracks for download instantly.
- **Browser Integration**: 
    - Downloads differ from typical web apps: The server fetches the high-quality stream, processes it (tags, lyrics, cover art), and then **stream-pipes it to your browser**. 
    - **Zero Clutter**: Files are automatically deleted from the server once the transfer to your device begins.
- **Batteries Included**: No need to install FFmpeg manually; it's bundled!

## Quick Start 🚀

### 1. Install Dependencies

Ensure you have Python 3.12+ and Poetry installed.

```bash
pip install poetry
poetry install
```

### 2. Run the Application

```bash
poetry run python run_web.py
```

### 3. Open in Browser

Visit [http://localhost:8000](http://localhost:8000) to start downloading!

---

## Configuration

On first run, a `config.yml` file is generated. You can customize:
- Audio Quality (Master/HiFi)
- Download concurrency
- Lyric settings

Location:
- **Windows**: `%APPDATA%\streamfetch\config.yml`
- **Linux/macOS**: `~/.config/streamfetch/config.yml`

## Disclaimer ⚠️

This project is for educational purposes only. Please support artists by using official platforms. Delete downloaded files within 24 hours.
