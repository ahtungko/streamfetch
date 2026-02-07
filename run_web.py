import uvicorn
import os
import sys
from pathlib import Path

# Add src to sys.path to ensure modules can be imported
src_path = Path(__file__).parent / "src"
sys.path.append(str(src_path))

if __name__ == "__main__":
    print("🚀 Starting StreamFetch Web...")
    print("🌐 Open http://localhost:8000 in your browser")
    uvicorn.run("streamfetch.web.app:app", host="0.0.0.0", port=8000, reload=True)
