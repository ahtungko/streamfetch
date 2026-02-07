from fastapi import FastAPI, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from streamfetch.web.api import router as api_router
from streamfetch.config.settings import config
from pathlib import Path

# Initialize FastAPI
app = FastAPI(title="StreamFetch Web", version="0.1.0")

# Mount static files
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Mount downloads
download_dir = Path(config["general"]["download_dir"])
if not download_dir.is_absolute():
    download_dir = Path.cwd() / download_dir
download_dir.mkdir(parents=True, exist_ok=True)
app.mount("/downloads", StaticFiles(directory=str(download_dir)), name="downloads")

# Templates
templates_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(templates_dir))

# Include API Router
app.include_router(api_router, prefix="/api")

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
