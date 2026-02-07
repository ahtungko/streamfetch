import os
import random
import string
import logging
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from streamfetch.utils.lrclib import LRCLib

from rich.progress import (
    Progress,
    SpinnerColumn,
    BarColumn,
    TextColumn,
    TimeRemainingColumn,
    MofNCompleteColumn,
)
from streamfetch.utils.logging_config import console
from streamfetch.utils.http import fetch_get
from streamfetch.utils.filename import sanitize_filename, format_file_path
from streamfetch.dash.parser import DashParser
from streamfetch.media.ffmpeg import embed_metadata
from streamfetch.config.settings import config
from streamfetch.config.api_targets import get_base_url

logger = logging.getLogger("streamfetch")


class TidalDownloader:
    def __init__(self, api):
        self.api = api

    def download_dash(self, manifest_xml, output_path, progress_callback=None):
        parsed = DashParser.parse(manifest_xml)
        if not parsed:
            raise Exception("DASH Manifest 解析失败 (API 返回了无效数据)")

        urls = DashParser.build_urls(parsed)
        total_segments = len(urls)
        if total_segments == 0:
            raise Exception("解析出的分段列表为空")

        downloaded_parts = {}
        max_workers = config["network"]["concurrency"]

        if progress_callback:
            progress_callback("start", total=total_segments)

        with Progress(
            SpinnerColumn(),
            TextColumn("[bold cyan]{task.description}"),
            BarColumn(bar_width=30),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            "•",
            MofNCompleteColumn(),
            "•",
            TimeRemainingColumn(),
            transient=True,
            disable=bool(progress_callback) # Disable rich progress if callback is provided
        ) as progress:
            task_id = progress.add_task("⬇️  Downloading...", total=total_segments)
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_index = {
                    executor.submit(lambda u: fetch_get(u).content, url): i
                    for i, url in enumerate(urls)
                }
                completed_count = 0
                for future in as_completed(future_to_index):
                    idx = future_to_index[future]
                    try:
                        data = future.result()
                        downloaded_parts[idx] = data
                        progress.advance(task_id)
                        completed_count += 1
                        if progress_callback:
                            progress_callback("progress", completed=completed_count, total=total_segments)
                    except Exception as e:
                        raise Exception(f"分段 {idx} 下载失败: {e}")
        
        if progress_callback:
            progress_callback("finish")

        with open(output_path, "wb") as outfile:
            for i in range(total_segments):
                outfile.write(downloaded_parts[i])

    def process_track(self, track_id, download_dir, progress_callback=None):
        """处理单首歌曲的完整流程"""
        download_dir = Path(download_dir)
        temp_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
        temp_audio = download_dir / f"tmp_aud_{temp_id}.mp4"
        temp_cover = download_dir / f"tmp_cov_{temp_id}.jpg"
        temp_lyrics = download_dir / f"tmp_lyr_{temp_id}.txt"

        try:
            meta = self.api.get_metadata(track_id)
            final_path = format_file_path(
                config["naming"]["file_format"], meta, download_dir, extension=".flac"
            )

            if final_path.exists():
                logger.info(
                    f"⏭️  [dim]Skipped:[/dim] {meta['title']} (Exists)",
                    extra={"markup": True},
                )
                return

            # 获取流并下载
            quality_map = {
                "HI_RES": "HI_RES_LOSSLESS",
                "LOSSLESS": "LOSSLESS",
                "HIGH": "HIGH",
            }
            priority = ["HI_RES", "LOSSLESS", "HIGH"]

            user_q = config["audio"]["max_quality"]
            song_q = meta.get("audioQuality", "LOSSLESS")
            start_idx = max(
                priority.index(user_q) if user_q in priority else 0,
                priority.index(song_q) if song_q in priority else 1,
            )

            qualities = (
                priority[start_idx:]
                if config["audio"]["auto_fallback"]
                else [priority[start_idx]]
            )

            success = False
            for q in [quality_map[v] for v in qualities]:
                try:
                    manifest = self.api.get_stream_manifest(track_id, q)
                    self.download_dash(manifest, temp_audio, progress_callback)
                    success = True
                    break
                except Exception as e:
                    logger.debug(f"Quality {q} failed: {e}")

            if not success:
                logger.error(f"❌ Failed to download: {meta['title']}")
                if progress_callback:
                    progress_callback("error", error="Failed to download (No suitable quality found)")
                return

            # 后处理
            # For web progress, we might want to signal post-processing too
            if progress_callback:
                progress_callback("processing", step="metadata")

            with console.status("[bold green]Processing...") as status:
                has_cover = False
                if meta.get("coverId"):
                    status.update("[bold green]Cover...")
                    try:
                        cover_url = f"https://resources.tidal.com/images/{
                            meta['coverId'].replace('-', '/')
                        }/1280x1280.jpg"
                        c_resp = fetch_get(cover_url)
                        if c_resp.content:
                            with open(temp_cover, "wb") as f:
                                f.write(c_resp.content)
                            has_cover = True
                    except:
                        pass

                status.update("[bold green]Lyrics...")
                lyrics = self.api.get_lyrics(track_id)
                if not lyrics:
                    track_duration = meta.get("duration", 0)
                    if track_duration > 0:
                        lyrics = LRCLib.get_lyrics(
                            meta["title"], meta["artist"], track_duration
                        )
                if lyrics:
                    with open(temp_lyrics, "w", encoding="utf-8") as f:
                        f.write(lyrics["text"])
                    if lyrics["isLrc"] and config["lyrics"]["save_lrc"]:
                        with open(
                            final_path.with_suffix(".lrc"), "w", encoding="utf-8"
                        ) as f:
                            f.write(lyrics["text"])

                status.update("[bold green]Muxing...")
                embed_metadata(
                    temp_audio,
                    temp_cover if has_cover else None,
                    temp_lyrics if lyrics else None,
                    meta,
                    final_path,
                )

            logger.info(
                f"✅ [bold green]Done:[/bold green] {final_path.name}",
                extra={"markup": True},
            )
            return final_path

        except Exception as e:
            logger.error(f"❌ Error processing track {track_id}: {e}")
            return None
        finally:
            for p in [temp_audio, temp_cover, temp_lyrics]:
                if p.exists():
                    p.unlink()

    def download_album(self, album_id, download_dir):
        """下载整张专辑"""
        data = self.api.get_album(album_id)
        album_info = data["albumInfo"]
        tracks = data["tracks"]

        artist = album_info.get("artist", {}).get("name") or "Unknown Artist"
        title = album_info.get("title", "Unknown Album")

        logger.info(
            f"💿 Album: [bold cyan]{title}[/bold cyan] - {artist} ({
                len(tracks)
            } tracks)",
            extra={"markup": True},
        )

        for track in tracks:
            self.process_track(track["id"], download_dir)

    def download_playlist(self, tracks, download_dir):
        """下载歌单中的所有歌曲"""
        for i, track in enumerate(tracks):
            logger.info(
                f"\n[bold]Progress {i + 1}/{len(tracks)}:[/bold] {track.get('title')}",
                extra={"markup": True},
            )
            self.process_track(track["id"], download_dir)

