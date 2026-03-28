#!/usr/bin/env python3
"""
prepare-web-video.py
Re-encodes finalvideo_clean.mp4 for universal mobile + desktop compatibility.

Key flags:
  -movflags +faststart   → metadata at front → mobile can stream without full download
  -profile:v baseline    → iOS Safari requires this (not High profile)
  -pix_fmt yuv420p       → universal chroma format (required by iOS)
  -crf 22                → good quality/size balance

Usage:
    python scripts/prepare-web-video.py
"""
import subprocess, os, sys

try:
    import imageio_ffmpeg
except ImportError:
    os.system(f'"{sys.executable}" -m pip install imageio-ffmpeg -q')
    import imageio_ffmpeg

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT  = os.path.join(ROOT, "public", "story", "finalvideo_clean.mp4")
OUTPUT = os.path.join(ROOT, "public", "story", "finalvideo_web.mp4")

if not os.path.exists(INPUT):
    # Fallback: use the original if clean version doesn't exist
    INPUT = os.path.join(ROOT, "public", "story", "finalvideo.mp4")
    print(f"Using original: {INPUT}")

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
print(f"Input:  {INPUT}")
print(f"Output: {OUTPUT}")
print("Re-encoding for mobile compatibility...")

cmd = [
    ffmpeg, "-y",
    "-i", INPUT,
    "-c:v", "libx264",
    "-profile:v", "baseline",   # iOS Safari compatibility
    "-level", "3.1",             # broad device support
    "-pix_fmt", "yuv420p",       # required by iOS
    "-crf", "22",                # quality (lower = better, 18-28 range)
    "-preset", "fast",
    "-movflags", "+faststart",   # CRITICAL: metadata first → mobile streaming
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",  # ensure even dimensions
    "-an",                       # no audio (muted autoplay video)
    OUTPUT,
]

result = subprocess.run(cmd, capture_output=True, text=True)
if result.returncode == 0:
    size_mb = os.path.getsize(OUTPUT) / 1_048_576
    print(f"Done! -> {OUTPUT} ({size_mb:.1f} MB)")
else:
    print("ERROR:", result.stderr[-1000:])
    sys.exit(1)
