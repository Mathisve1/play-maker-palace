#!/usr/bin/env python3
"""
remove-progressbar.py
Crops the AI tool progress bar from the bottom of finalvideo.mp4.
Uses bundled FFmpeg — very fast (~15 seconds, no frame-by-frame processing).

Usage:
    python scripts/remove-progressbar.py
"""
import subprocess, os, sys

try:
    import imageio_ffmpeg
except ImportError:
    os.system(f'"{sys.executable}" -m pip install imageio-ffmpeg -q')
    import imageio_ffmpeg

ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT   = os.path.join(ROOT, "public", "story", "finalvideo.mp4")
OUTPUT  = os.path.join(ROOT, "public", "story", "finalvideo_clean.mp4")
CROP_PX = 70  # pixels to remove from the bottom (the AI progress bar)

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
print(f"Input:  {INPUT}")
print(f"Output: {OUTPUT}")
print(f"Cropping bottom {CROP_PX}px (AI progress bar)...")

cmd = [
    ffmpeg, "-y",
    "-i", INPUT,
    "-vf", f"crop=iw:ih-{CROP_PX}:0:0",
    "-c:v", "libx264",
    "-crf", "18",
    "-preset", "fast",
    "-an",
    OUTPUT,
]

result = subprocess.run(cmd, capture_output=True, text=True)
if result.returncode == 0:
    size_mb = os.path.getsize(OUTPUT) / 1_048_576
    print(f"Done! -> {OUTPUT} ({size_mb:.1f} MB)")
else:
    print("ERROR:", result.stderr[-800:])
    sys.exit(1)
