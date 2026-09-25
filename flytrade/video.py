"""Assemble the reel: brain intro, then the fly clips under the trading overlay.

Run:  python -m flytrade.video            ->  output/reel.mp4
      python -m flytrade.video --preview  ->  output/preview/reel_sheet.png (a few stills, fast)

Put AI-generated clips in assets/clips/{idle,buy,sell,ending}.mp4 — any size, they are
cover-cropped to 1080x1920. Missing clips are replaced by labelled placeholders.
"""
import argparse
import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from flytrade.data import ROOT, load_ids, load_positions
from flytrade.render.common import FPS, H, W, WHITE, font
from flytrade.render.intro import INTRO_SEC, Intro
from flytrade.render.overlay import Overlay, State

CLIPS = ROOT / "assets" / "clips"
OUTPUT = ROOT / "output"
SEC_PER_DAY = 0.2  # chart speed between trades
EVENT_SEC = 1.3  # how long each BUY/SELL clip plays
ENDING_SEC = 3.5
FLASH_OUT = 0.3  # white flash fading from the intro into the trading scene

PLACEHOLDER_TEXT = {
    "idle": "모니터 보는 초파리",
    "buy": "주둥이로 쭉~ 냠냠 (매수)",
    "sell": "퉤! 뱉기 (매도)",
    "ending": "결과 보고 리액션",
}


@dataclass
class Segment:
    kind: str  # intro | move | event | ending
    start: float
    dur: float
    day0: int
    day1: int
    action: str = ""  # BUY / SELL for events

    @property
    def clip(self) -> str:
        return {"move": "idle", "event": self.action.lower(), "ending": "ending"}.get(self.kind, "")

    def day_at(self, t: float) -> float:
        if self.kind != "move":
            return self.day0
        return self.day0 + (self.day1 - self.day0) * (t - self.start) / self.dur

    def state_at(self, t: float) -> State:
        p = (t - self.start) / self.dur
        if self.kind == "event":
            return State(day=self.day0, event=self.action, event_p=p)
        if self.kind == "ending":
            return State(day=self.day0, ending_p=p)
        return State(day=self.day_at(t))


def build_segments(actions, intro_sec=INTRO_SEC, sec_per_day=SEC_PER_DAY, event_sec=EVENT_SEC, ending_sec=ENDING_SEC):
    """Chart moves day by day; every BUY/SELL pauses it for an event clip."""
    segs = [Segment("intro", 0.0, intro_sec, 0, 0)]

    def add(kind, dur, day0, day1, action=""):
        segs.append(Segment(kind, segs[-1].start + segs[-1].dur, dur, day0, day1, action))

    cur = 0
    for i, action in enumerate(actions):
        if action in ("BUY", "SELL"):
            if i > cur:
                add("move", (i - cur) * sec_per_day, cur, i)
                cur = i
            add("event", event_sec, i, i, action)
    last = len(actions) - 1
    if last > cur:
        add("move", (last - cur) * sec_per_day, cur, last)
    add("ending", ending_sec, last, last)
    return segs


class ClipReader:
    """Streams frames of assets/clips/<name>.mp4 cover-cropped to 9:16, or a placeholder."""

    def __init__(self, clips_dir: Path):
        self.dir = clips_dir
        self.offset: dict[str, float] = {}  # idle continues where it left off instead of restarting

    def frames(self, name: str, n: int, resume: bool = False):
        path = self.dir / f"{name}.mp4"
        if not path.exists():
            img = placeholder(name)
            for _ in range(n):
                yield img
            return
        start = self.offset.get(name, 0.0) % _duration(path) if resume else 0.0
        cmd = ["ffmpeg", "-v", "error", "-stream_loop", "-1", "-ss", f"{start:.3f}", "-i", str(path),
               "-vf", f"fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}",
               "-frames:v", str(n), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        last = placeholder(name)
        for _ in range(n):
            buf = proc.stdout.read(W * H * 3)
            if len(buf) == W * H * 3:
                last = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
            yield last
        proc.stdout.close()
        proc.wait()
        self.offset[name] = start + n / FPS


def _duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return max(float(out.stdout.strip()), 1 / FPS)


def placeholder(name: str) -> np.ndarray:
    y = np.linspace(0, 1, H)[:, None, None]
    img = Image.fromarray(((1 - y) * np.array([34, 40, 70]) + y * np.array([12, 14, 30])).astype(np.uint8)
                          .repeat(W, axis=1))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((140, 640, 940, 1060), 40, outline=(120, 130, 180), width=6)
    d.text((W / 2, 780), f"AI 클립: {name}.mp4", font=font(56), fill=WHITE, anchor="mm")
    d.text((W / 2, 890), PLACEHOLDER_TEXT.get(name, ""), font=font(44), fill=(180, 190, 230), anchor="mm")
    return np.asarray(img)


def composite(bg: np.ndarray, overlay: Image.Image, flash: float = 0.0) -> np.ndarray:
    img = Image.alpha_composite(Image.fromarray(bg).convert("RGBA"), overlay).convert("RGB")
    if flash > 0:
        img = Image.blend(img, Image.new("RGB", img.size, WHITE), flash)
    return np.asarray(img)


class Reel:
    def __init__(self, timeline: dict, clips_dir: Path = CLIPS):
        positions = load_positions(load_ids())
        self.intro = Intro(positions, timeline["brain"])
        self.overlay = Overlay(timeline, positions)
        self.segments = build_segments([d["action"] for d in timeline["days"]])
        self.clips = ClipReader(clips_dir)
        self.duration = self.segments[-1].start + self.segments[-1].dur

    def _frame(self, seg: Segment, t: float, bg: np.ndarray | None) -> np.ndarray:
        if seg.kind == "intro":
            return self.intro.frame(t)
        flash = max(0.0, 1 - (t - INTRO_SEC) / FLASH_OUT)
        return composite(bg, self.overlay.frame(seg.state_at(t)), flash)

    def render(self, out: Path):
        if not shutil.which("ffmpeg"):
            raise SystemExit("ffmpeg not found — install it (brew install ffmpeg)")
        out.parent.mkdir(parents=True, exist_ok=True)
        enc = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
             "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", str(out)],
            stdin=subprocess.PIPE,
        )
        for seg in self.segments:
            f0, f1 = round(seg.start * FPS), round((seg.start + seg.dur) * FPS)
            bgs = self.clips.frames(seg.clip, f1 - f0, resume=seg.kind == "move") if seg.clip else None
            for f in range(f0, f1):
                enc.stdin.write(self._frame(seg, f / FPS, next(bgs) if bgs else None).tobytes())
            print(f"  {seg.kind:6s} {seg.action:4s} {seg.start:5.1f}s → {seg.start + seg.dur:5.1f}s")
        enc.stdin.close()
        enc.wait()
        print(f"{out}  ({self.duration:.1f}s)")

    def preview(self, out: Path):
        """Contact sheet of stills: intro, chart moving, first BUY, first SELL, ending."""
        picks = [(self.segments[0], 2.6)]
        for kind, action in (("move", ""), ("event", "BUY"), ("event", "SELL"), ("ending", "")):
            seg = next(s for s in self.segments if s.kind == kind and s.action == action)
            picks.append((seg, seg.start + seg.dur * 0.5))
        sheet = Image.new("RGB", (550 * len(picks), 960), (40, 40, 40))
        for k, (seg, t) in enumerate(picks):
            bg = next(self.clips.frames(seg.clip, 1)) if seg.clip else None
            sheet.paste(Image.fromarray(self._frame(seg, t, bg)).resize((540, 960)), (k * 550, 0))
        out.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(out)
        print(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--timeline", type=Path, default=OUTPUT / "timeline.json")
    ap.add_argument("--clips", type=Path, default=CLIPS)
    ap.add_argument("--out", type=Path, default=OUTPUT / "reel.mp4")
    ap.add_argument("--preview", action="store_true", help="only save a contact sheet of stills")
    args = ap.parse_args()

    reel = Reel(json.loads(args.timeline.read_text()), args.clips)
    if args.preview:
        reel.preview(OUTPUT / "preview" / "reel_sheet.png")
    else:
        reel.render(args.out)


if __name__ == "__main__":
    main()
