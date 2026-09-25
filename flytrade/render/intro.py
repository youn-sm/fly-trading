"""Opening shot: the real fly brain as a glowing point cloud, then the sugar signal racing to MN9."""
import numpy as np
from PIL import Image, ImageDraw

from flytrade.render.cloud import BrainCloud, glow
from flytrade.render.common import BG, BRAIN, H, MN9, SUGAR, WHITE, W, colorize, ease_out_back, font

INTRO_SEC = 4.0
WAVE = (1.3, 3.1)  # video seconds over which the simulated first spikes play out
FLASH = 3.6  # white flash into the trading scene starts here


class Intro:
    def __init__(self, positions: np.ndarray, brain: dict):
        self.cloud = BrainCloud(positions, width_px=W * 0.92, center_px=(W / 2, H * 0.47), shape=(H, W))
        wave = np.array(brain["sugar_wave"], dtype=float)
        idx, t_ms = wave[:, 0].astype(int), wave[:, 1]
        keep = self.cloud.row_of[idx] >= 0
        self.wave_rows, self.wave_ms = self.cloud.rows(idx), t_ms[keep]
        self.sugar_rows = self.cloud.rows(brain["sugar"])
        self.mn9_rows = self.cloud.rows(brain["mn9"])
        mn9_t = [ms for i, ms in zip(idx, t_ms) if i in set(brain["mn9"])]
        self.mn9_ms = float(min(mn9_t)) if mn9_t else 25.0
        self.wave_span = 2 * self.mn9_ms  # MN9 fires halfway through the wave
        self.n_neurons, self.n_synapses = brain["n_neurons"], brain["n_synapses"]

    def sim_ms(self, t: float) -> float:
        """Simulated brain time shown at video time t."""
        return min((t - WAVE[0]) / (WAVE[1] - WAVE[0]), 1.0) * self.wave_span

    def frame(self, t: float) -> np.ndarray:
        theta = np.radians(-35 + 70 * t / INTRO_SEC)
        fade = min(t / 0.6, 1.0)

        ms = self.sim_ms(t)
        dim = 1 - 0.6 * np.clip((t - WAVE[0] + 0.3) / 0.4, 0, 1)  # dim the brain so the signal pops
        base = glow(self.cloud.splat(theta=theta), 0.7, 10, 3.0)
        b = 1 - np.exp(-1.2 * base)
        rgb = colorize(b * fade * 0.9 * dim, BRAIN) + colorize(b**3 * fade * 0.5 * dim, WHITE)

        if ms > 0:
            dt = ms - self.wave_ms
            lit = dt >= 0
            flash = np.where(lit, np.exp(-np.clip(dt, 0, None) / 6.0) * 6 + 1.5, 0.0)
            hot = glow(self.cloud.splat(self.wave_rows, flash, theta), 2.5, 28, 14.0)
            h = 1 - np.exp(-1.5 * hot)
            rgb += colorize(h, SUGAR) * 1.3 + colorize(h**2, WHITE)

        img = Image.fromarray((np.clip(rgb, 0, 1) * 255 + np.array(BG) * (1 - np.clip(rgb.max(-1, keepdims=True), 0, 1))).astype(np.uint8))
        self._labels(ImageDraw.Draw(img), t, ms, theta)
        if t > FLASH:
            white = min((t - FLASH) / (INTRO_SEC - FLASH), 1.0)
            img = Image.blend(img, Image.new("RGB", img.size, WHITE), white)
        return np.asarray(img)

    def _labels(self, d: ImageDraw.ImageDraw, t: float, ms: float, theta: float):
        pop = ease_out_back((t - 0.2) / 0.5)
        if pop > 0.05:
            d.text((W / 2, 250), "초파리 뇌", font=font(int(110 * pop)), fill=WHITE, anchor="mm")
            d.text((W / 2, 360), f"뉴런 {self.n_neurons:,}개 · 시냅스 {self.n_synapses / 1e4:,.0f}만개",
                   font=font(46), fill=(190, 210, 255), anchor="mm")
            d.text((W / 2, 420), "실제 FlyWire 커넥톰 데이터", font=font(36), fill=(120, 140, 190), anchor="mm")

        if ms > 0:
            d.text((W / 2, 1420), "주가 상승 = 단맛", font=font(64), fill=SUGAR, anchor="mm")
            d.text((W / 2, 1500), f"미각 뉴런 자극 → {ms:5.1f} ms", font=font(40), fill=(230, 220, 190), anchor="mm")
            xs, ys = self.cloud.project(self.sugar_rows, theta)
            x, y = xs.min(), ys.mean()
            d.line((x - 20, y, x - 90, y), fill=SUGAR, width=4)
            d.text((x - 100, y), "단맛 뉴런", font=font(40), fill=SUGAR, anchor="rm")

        if ms >= self.mn9_ms and len(self.mn9_rows):
            k = min((ms - self.mn9_ms) / (self.wave_span * 0.25), 1.0)
            x, y = (v[0] for v in self.cloud.project(self.mn9_rows[:1], theta))
            r = 30 + 40 * k
            d.ellipse((x - r, y - r, x + r, y + r), outline=MN9, width=8)
            d.text((x + r + 20, y), "MN9 발화!", font=font(54), fill=MN9, anchor="lm")
            d.text((W / 2, 1600), "먹는다 = 매수", font=font(72), fill=MN9, anchor="mm")
