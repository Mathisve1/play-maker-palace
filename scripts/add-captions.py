#!/usr/bin/env python3
"""
add-captions.py
───────────────
Adds timed text overlays (orange pill) to finalvideo.mp4
and blacks-out the progress bar at the bottom.

Usage
-----
    pip install moviepy imageio-ffmpeg pillow
    cd play-maker-palace
    python scripts/add-captions.py

Output
------
    public/story/finalvideo_captioned.mp4
"""

import os
import sys
import textwrap
import numpy as np

# ── Auto-install ─────────────────────────────────────────────────────────────
def _pip(pkg: str):
    os.system(f'"{sys.executable}" -m pip install {pkg} -q')

try:
    # MoviePy 2.x
    from moviepy import VideoFileClip, VideoClip
except ImportError:
    print("Installing moviepy + imageio-ffmpeg (first-time, downloads ~50 MB) …")
    _pip("moviepy imageio-ffmpeg")
    from moviepy import VideoFileClip, VideoClip

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Installing pillow …")
    _pip("pillow")
    from PIL import Image, ImageDraw, ImageFont

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT       = os.path.dirname(SCRIPT_DIR)
INPUT      = os.path.join(ROOT, "public", "story", "finalvideo.mp4")
OUTPUT     = os.path.join(ROOT, "public", "story", "finalvideo_captioned.mp4")

# ── Settings ──────────────────────────────────────────────────────────────────
COVER_HEIGHT  = 70      # px — black bar that hides the unwanted progress bar
FADE_SECS     = 0.5     # fade-in and fade-out duration in seconds
TEXT_MARGIN   = 24      # px gap between pill bottom and black bar
PILL_PAD_X    = 28      # horizontal padding inside the pill
PILL_PAD_Y    = 14      # vertical padding inside the pill
PILL_RADIUS   = 14      # corner radius of the pill
PILL_COLOR    = (249, 115, 22)   # #F97316 orange
PILL_ALPHA    = 225              # pill opacity (0-255)
TEXT_COLOR    = (255, 255, 255)  # white

# ── Captions: (start_sec, end_sec, text) ─────────────────────────────────────
CAPTIONS = [
    ( 1,  5, "Vind eenvoudig jouw favoriete club en kies een shift die perfect bij je past."),
    ( 6, 10, "Bekijk direct alle belangrijke details en voorwaarden van je aankomende shift."),
    (11, 14, "Teken je contract snel en volledig digitaal. Geen gedoe meer met papierwerk!"),
    (15, 23, "Alles geregeld? Spring op je fiets en vertrek vlot en zonder stress naar het stadion."),
    (24, 28, "Krijg snelle toegang op locatie door simpelweg je persoonlijke QR-code te scannen."),
    (29, 38, "Volg de briefing met je team en bereid je samen voor op een veilige wedstrijd."),
    (39, 45, "Beheer jouw vak als steward en ontvang live meldingen bij incidenten."),
    (46, 52, "Klaar met je shift? Krijg direct en succesvol uitbetaald, rechtstreeks via de app."),
]

# ── Font loading ──────────────────────────────────────────────────────────────
FONT_PATHS = [
    "C:/Windows/Fonts/arialbd.ttf",       # Arial Bold  (Windows)
    "C:/Windows/Fonts/Arialbd.ttf",
    "C:/Windows/Fonts/calibrib.ttf",      # Calibri Bold
    "C:/Windows/Fonts/segoeui.ttf",       # Segoe UI
    "C:/Windows/Fonts/verdanab.ttf",      # Verdana Bold
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",   # Linux
    "/System/Library/Fonts/Helvetica.ttc",                    # macOS
]

def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_PATHS:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    print("  ⚠  No TrueType font found – using bitmap fallback (quality reduced)")
    return ImageFont.load_default()


def draw_rounded_rect(draw: ImageDraw.ImageDraw, xy, radius: int, fill):
    """PIL rounded rectangle with Pillow < 8.2 fallback."""
    x0, y0, x1, y1 = xy
    try:
        draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)
    except AttributeError:
        # Pillow < 8.2 fallback: approximate with ellipses + rectangles
        draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
        draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
        for cx, cy in [(x0 + radius, y0 + radius),
                       (x1 - radius, y0 + radius),
                       (x0 + radius, y1 - radius),
                       (x1 - radius, y1 - radius)]:
            draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=fill)


# ── Text pill compositor ──────────────────────────────────────────────────────
def composite_pill(frame_rgb: np.ndarray, text: str, font, bottom_y: int, alpha_mult: float) -> np.ndarray:
    """
    Composite an orange pill with white text onto `frame_rgb`.
    `bottom_y` = y-coordinate of the BOTTOM of the pill.
    `alpha_mult` = 0.0 (invisible) … 1.0 (fully opaque).
    """
    W, H = frame_rgb.shape[1], frame_rgb.shape[0]

    # Wrap text so it doesn't exceed ~55 % of video width
    avg_char_px = font.size * 0.55
    max_chars   = max(20, int(W * 0.55 / avg_char_px))
    lines       = textwrap.wrap(text, width=max_chars) or [text]

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw    = ImageDraw.Draw(overlay)

    # Measure each line
    bboxes   = [draw.textbbox((0, 0), line, font=font) for line in lines]
    line_h   = max(bb[3] - bb[1] for bb in bboxes)
    spacing  = max(4, int(line_h * 0.2))
    block_h  = len(lines) * line_h + (len(lines) - 1) * spacing
    block_w  = max(bb[2] - bb[0] for bb in bboxes)

    pill_w = block_w + 2 * PILL_PAD_X
    pill_h = block_h + 2 * PILL_PAD_Y
    pill_x = (W - pill_w) // 2
    pill_y = bottom_y - pill_h

    p_alpha = int(PILL_ALPHA  * alpha_mult)
    t_alpha = int(255         * alpha_mult)

    draw_rounded_rect(
        draw,
        (pill_x, pill_y, pill_x + pill_w, pill_y + pill_h),
        PILL_RADIUS,
        fill=(*PILL_COLOR, p_alpha),
    )

    y_cur = pill_y + PILL_PAD_Y
    for line, bbox in zip(lines, bboxes):
        line_w = bbox[2] - bbox[0]
        x_line = pill_x + PILL_PAD_X + (block_w - line_w) // 2  # centred
        draw.text((x_line, y_cur), line, font=font, fill=(*TEXT_COLOR, t_alpha))
        y_cur += line_h + spacing

    base   = Image.fromarray(frame_rgb).convert("RGBA")
    merged = Image.alpha_composite(base, overlay)
    return np.array(merged.convert("RGB"))


# ── Frame processor ───────────────────────────────────────────────────────────
def make_processor(video_w: int, video_h: int, font):
    bottom_y = video_h - COVER_HEIGHT - TEXT_MARGIN
    black_bar = np.zeros((COVER_HEIGHT, video_w, 3), dtype=np.uint8)

    def process(get_frame, t: float) -> np.ndarray:
        frame = get_frame(t).copy()

        # 1 — Black out progress bar
        frame[video_h - COVER_HEIGHT:, :] = black_bar

        # 2 — Find active caption
        for start, end, text in CAPTIONS:
            if start <= t <= end:
                if t - start < FADE_SECS:
                    alpha = (t - start) / FADE_SECS
                elif end - t < FADE_SECS:
                    alpha = (end - t) / FADE_SECS
                else:
                    alpha = 1.0
                frame = composite_pill(frame, text, font, bottom_y, alpha)
                break

        return frame

    return process


# ── Progress tracker ──────────────────────────────────────────────────────────
class Progress:
    def __init__(self, total_secs: float, fps: float):
        self.total   = total_secs
        self.fps     = fps
        self.n_frames = int(total_secs * fps)
        self.count    = 0

    def tick(self):
        self.count += 1
        if self.count % max(1, self.n_frames // 20) == 0:
            pct = self.count / self.n_frames * 100
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            print(f"\r  [{bar}] {pct:5.1f}%  ({self.count}/{self.n_frames} frames)", end="", flush=True)


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    if not os.path.exists(INPUT):
        print(f"ERROR: Input file not found: {INPUT}")
        sys.exit(1)

    print(f"\nLoading  {INPUT}")
    video = VideoFileClip(INPUT)
    W, H  = int(video.w), int(video.h)
    FPS   = video.fps
    DUR   = video.duration
    print(f"   {W}×{H} px  |  {DUR:.1f} s  |  {FPS:.0f} fps")

    # Font: ~3.5 % of video height, min 26 px
    font_size = max(26, int(H * 0.035))
    print(f"   Font size : {font_size} px")
    sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

    font      = load_font(font_size)
    processor = make_processor(W, H, font)
    progress  = Progress(DUR, FPS)

    # Wrap processor to show progress
    def tracked(get_frame, t):
        progress.tick()
        return processor(get_frame, t)

    print(f"\nProcessing frames ...")
    # MoviePy 2.x uses .transform() instead of .fl()
    result = video.transform(tracked, apply_to=["video"])

    print(f"\n\nWriting  {OUTPUT}  (this may take a minute) ...")
    result.write_videofile(
        OUTPUT,
        codec      = "libx264",
        audio      = False,     # no audio needed for auto-play web video
        fps        = FPS,
        bitrate    = "4000k",
        preset     = "fast",
        logger     = "bar",
    )

    size_mb = os.path.getsize(OUTPUT) / 1_048_576
    print(f"\nDone! -> {OUTPUT}  ({size_mb:.1f} MB)\n")
    print("Next step: rename/replace finalvideo.mp4 with the captioned version,")
    print("  or update VIDEO_SRC in VolunteerStorySection.tsx to 'finalvideo_captioned.mp4'")


if __name__ == "__main__":
    main()
