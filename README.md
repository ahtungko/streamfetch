# StreamFetch

基于 Python 的命令行 Tidal 音乐下载工具。支持高解析度音频 (Hi-Res/Master) 下载、元数据嵌入及歌词获取。

## 前置要求

确保系统中已安装 **FFmpeg** 并将其添加到环境变量中。

- **Windows**: [下载 FFmpeg](https://ffmpeg.org/download.html) 并添加 `bin` 目录到 Path。
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

## 安装

推荐使用 `pipx` 进行安装，以便在隔离环境中运行：

```bash
pipx install git+https://github.com/Rkorona/streamfetch.git
```

## Web Interface (New!) 🌐

StreamFetch now includes a modern Web UI for easier searching and downloading.

### 快速开始

1.  **安装依赖**:
    ```bash
    pip install poetry
    poetry install
    ```

2.  **启动 Web 服务**:
    ```bash
    poetry run python run_web.py
    ```

3.  **访问**:
    打开浏览器访问: `http://localhost:8000`

### 功能特性
- **交互式搜索**: 实时搜索 Tidal 乐库。
- **一键下载**: 点击即下，支持队列管理。
- **浏览器直连**: 下载完成后自动触发浏览器文件下载。
- **无需配置 FFmpeg**: 内置 FFmpeg 支持，开箱即用。

---

## 命令行使用方法 (CLI)

如果您更喜欢命令行，依然可以使用 `streamfetch` 或 `sf` 命令。

### 1. 交互式搜索

搜索并选择下载歌曲：

```bash
sf search "Title"
# 歌名 + 歌手 或 歌手 + 歌名  精确搜索
sf search "Title - Artist"
```

### 2. 下载单曲

支持链接或 ID：

```bash
sf track 123456          # 使用 ID
sf track https://tidal.com/browse/track/123456  # 使用链接
```

### 3. 下载专辑

```bash
sf album https://tidal.com/browse/album/123456
```

### 4. 下载歌单

```bash
sf playlist uuid-string
sf playlist https://tidal.com/browse/playlist/uuid-string
```

## 配置文件

程序**首次运行**时，会自动在以下位置生成默认配置文件 `config.yml`：

- **Linux/macOS**: `~/.config/streamfetch/config.yml`
- **Windows**: `%APPDATA%\streamfetch\config.yml`

## 免责声明

本项目仅供 Python 学习与技术研究使用。请在下载后 24 小时内删除，支持正版音乐。使用者需自行承担因使用本工具而产生的任何法律后果。
