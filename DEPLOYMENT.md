# StreamFetch Deployment Guide

This guide explains how to deploy and run the StreamFetch web application.

## Quick Start (Development)

The easiest way to run both the backend and frontend together:

```bash
./start-web.sh
```

This will:
1. Install Python dependencies
2. Install Node.js dependencies (if needed)
3. Start the FastAPI backend on port 8000
4. Start the React frontend on port 5173

Access the application at: `http://localhost:5173`

## Manual Setup

### Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- FFmpeg (must be in system PATH)

### Backend Setup

1. Create a virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install Python dependencies:
```bash
pip install -e .
```

3. Run the FastAPI server:
```bash
python -m uvicorn streamfetch.api.main:app --host 0.0.0.0 --port 8000
```

Or with auto-reload for development:
```bash
python -m uvicorn streamfetch.api.main:app --reload --port 8000
```

The API will be available at:
- Main API: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- OpenAPI spec: `http://localhost:8000/openapi.json`

### Frontend Setup

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

4. Build for production:
```bash
npm run build
```

The production build will be in `web/dist/`

## Production Deployment

### Backend (FastAPI)

#### Using Uvicorn

```bash
# Activate virtual environment
source .venv/bin/activate

# Run with multiple workers
python -m uvicorn streamfetch.api.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4
```

#### Using Gunicorn + Uvicorn Workers

```bash
# Install gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn streamfetch.api.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

#### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml ./
COPY src ./src

# Install dependencies
RUN pip install -e .

# Expose port
EXPOSE 8000

# Run application
CMD ["python", "-m", "uvicorn", "streamfetch.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t streamfetch-api .
docker run -p 8000:8000 -v $(pwd)/downloads_music:/app/downloads_music streamfetch-api
```

### Frontend (React)

#### Static Hosting

1. Build the production bundle:
```bash
cd web
npm run build
```

2. The `web/dist/` directory contains static files that can be served by:
   - Nginx
   - Apache
   - Netlify
   - Vercel
   - GitHub Pages
   - Any static file hosting service

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/streamfetch/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE endpoint needs special handling
    location /api/download {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }
}
```

## Environment Variables

### Backend

Create a `.env` file in the project root (optional):

```env
# Download directory (optional, defaults from config.yml)
DOWNLOAD_DIR=./downloads_music

# CORS origins (optional)
CORS_ORIGINS=http://localhost:5173,https://your-domain.com
```

### Frontend

Create `web/.env` or `web/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

For production, set the actual backend URL:
```env
VITE_API_URL=https://api.your-domain.com
```

## Configuration

The application uses `config.yml` for settings. On first run, a default config is generated at:
- Linux/macOS: `~/.config/streamfetch/config.yml`
- Windows: `%APPDATA%\streamfetch\config.yml`

You can also place `config.yml` in the current directory for project-specific settings.

### Key Configuration Options

```yaml
general:
  download_dir: "./downloads_music"
  log_level: "INFO"

audio:
  max_quality: "HIRES_LOSSLESS"  # HI_RES_LOSSLESS, LOSSLESS, HIGH
  auto_fallback: True

network:
  api_urls:
    - "https://tidal.kinoplus.online"
    - "https://api.tidalhifi.com"
  concurrency: 10
  timeout: 30
  max_retries: 3

ffmpeg:
  binary: "ffmpeg"  # Or full path: /usr/bin/ffmpeg

naming:
  file_format: "{Artist}/{Album}/{Title}"
```

## Systemd Service (Linux)

Create `/etc/systemd/system/streamfetch.service`:

```ini
[Unit]
Description=StreamFetch API Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/streamfetch
Environment="PATH=/path/to/streamfetch/.venv/bin"
ExecStart=/path/to/streamfetch/.venv/bin/python -m uvicorn streamfetch.api.main:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable streamfetch
sudo systemctl start streamfetch
sudo systemctl status streamfetch
```

## Monitoring

### Health Check

The API provides a health check endpoint:

```bash
curl http://localhost:8000/health
```

Response: `{"status": "healthy"}`

### Logs

#### Backend Logs

Uvicorn logs to stdout by default. For production, redirect to a file:

```bash
python -m uvicorn streamfetch.api.main:app --log-config logging.json
```

Or use a logging configuration file.

#### Frontend Logs

Build logs:
```bash
npm run build 2>&1 | tee build.log
```

### Performance Monitoring

Monitor the API with tools like:
- Prometheus + Grafana
- New Relic
- DataDog
- Application Insights

## Security Considerations

1. **CORS**: Configure `allow_origins` in `api/main.py` for production
2. **Rate Limiting**: Consider adding rate limiting middleware
3. **Authentication**: Add authentication if deploying publicly
4. **HTTPS**: Always use HTTPS in production (use reverse proxy like Nginx)
5. **API Keys**: Consider requiring API keys for the backend
6. **File Access**: Ensure download directory permissions are appropriate

## Troubleshooting

### Backend Issues

**FFmpeg not found:**
```bash
# Verify FFmpeg is installed
ffmpeg -version

# If not, install it
# Ubuntu/Debian:
sudo apt install ffmpeg

# macOS:
brew install ffmpeg
```

**Port already in use:**
```bash
# Change the port
python -m uvicorn streamfetch.api.main:app --port 8001
```

**Import errors:**
```bash
# Reinstall dependencies
pip install -e . --force-reinstall
```

### Frontend Issues

**Node modules errors:**
```bash
# Clean install
cd web
rm -rf node_modules package-lock.json
npm install
```

**Build errors:**
```bash
# Clear Vite cache
cd web
rm -rf node_modules/.vite
npm run build
```

**API connection errors:**
- Check that the backend is running
- Verify `VITE_API_URL` in `.env`
- Check browser console for CORS errors
- Verify the proxy configuration in `vite.config.js`

## Scaling

### Horizontal Scaling

1. Run multiple backend instances behind a load balancer
2. Use a shared network filesystem for downloads, or implement file storage service
3. Consider using a message queue (Redis, RabbitMQ) for download jobs

### Database (Optional)

For tracking downloads across instances, consider adding:
- PostgreSQL for job tracking
- Redis for session management and caching

### CDN

Serve static frontend files via CDN:
- CloudFlare
- AWS CloudFront
- Azure CDN

## Development Tips

### Hot Reload

Both backend and frontend support hot reload in development:

**Backend:**
```bash
python -m uvicorn streamfetch.api.main:app --reload
```

**Frontend:**
```bash
cd web && npm run dev
```

### Debugging

**Backend:**
- Use `--log-level debug` with Uvicorn
- Add breakpoints with `import pdb; pdb.set_trace()`
- Use VS Code debugger configuration

**Frontend:**
- Use React DevTools browser extension
- Check browser console for errors
- Use `console.log()` for debugging
- Use VS Code debugger with Chrome

### Testing

**Backend:**
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

**Frontend:**
```bash
cd web
npm run test
```

## Support

For issues and questions:
- Check the main README.md
- Review API documentation at `http://localhost:8000/docs`
- Open an issue on GitHub
