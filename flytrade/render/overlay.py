"""Transparent trading HUD drawn over the fly clip: price, P&L, brain meters, chart, BUY!/SELL! pops."""
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageDraw

from flytrade.render.cloud import BrainCloud, glow
from flytrade.render.common import (BITTER, BRAIN, DOWN, MN9, PANEL, SUGAR, UP, WHITE, H, W,
                                    colorize, ease_out_back, font)

CHART = (50, 1180, 1030, 1480)  # x0, y0, x1, y1
HUD = (560, 290, 1030, 630)
POP_X = 300  # BUY!/SELL! sit in the empty column left of the HUD, clear of the fly below
MINI = (440, 170)  # mini brain size inside the HUD
EVENT_TEXT = {"BUY": ("BUY!", "냠냠 · 매수", UP), "SELL": ("SELL!", "퉤! · 매도", DOWN)}


@dataclass
class State:
    day: float  # chart position in days (fractional while the chart is moving)
    event: str = ""  # BUY / SELL while an event pop is on screen
    event_p: float = 0.0  # 0..1 progress through the event
    ending_p: float = -1.0  # 0..1 progress through the ending card, -1 before it


class Overlay:
    def __init__(self, timeline: dict, positions: np.ndarray):
        self.days = timeline["days"]
        self.summary = timeline["summary"]
        self.ticker = timeline["ticker"]
        self.closes = np.array([d["close"] for d in self.days])
        self.start_cash = self.summary["start_cash"]
        self._mini = self._mini_brain(positions, timeline["brain"])

    # ---------- mini brain ----------
    def _mini_brain(self, positions, brain):
        w, h = MINI
        cloud = BrainCloud(positions, width_px=w * 0.9, center_px=(w / 2, h / 2), shape=(h, w))

        def layer(neurons, weight, color):
            rows = np.arange(len(cloud.pts)) if neurons is None else cloud.rows(neurons)
            dens = glow(cloud.splat(rows, np.full(len(rows), weight)), 0.8, 6, 1.5, down=2)
            return colorize(1 - np.exp(-dens), color)

        return {
            "base": layer(None, 0.08, BRAIN),
            "sugar": layer([i for i, _ in brain["sugar_wave"]], 3.0, SUGAR),
            "bitter": layer(brain["bitter_active"], 3.0, BITTER),
            "mn9": layer(brain["mn9"], 30.0, MN9),
        }

    def _mini_image(self, day: dict, pulse: float) -> Image.Image:
        m = self._mini
        rgb = (m["base"] * 0.7 + m["sugar"] * day["sugar_hz"] / 200 + m["bitter"] * day["bitter_hz"] / 200
               + m["mn9"] * min(day["mn9_hz"] / 60, 1.5) * (1 + pulse))
        rgb = np.clip(rgb, 0, 1)
        alpha = np.clip(rgb.max(axis=-1) * 1.6, 0, 1)
        rgba = np.dstack([rgb, alpha]) * 255
        return Image.fromarray(rgba.astype(np.uint8), "RGBA")

    # ---------- frame ----------
    def frame(self, s: State) -> Image.Image:
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        i = int(np.clip(np.floor(s.day), 0, len(self.days) - 1))
        day = self.days[i]
        pulse = max(0.0, 1 - s.event_p * 2) if s.event else 0.0

        self._top(d, day)
        self._hud(img, d, day, pulse)
        if s.ending_p < 0:
            self._chart(d, s.day)
        if s.event:
            self._pop(img, s.event, s.event_p, day)
        if s.ending_p >= 0:
            self._ending(img, s.ending_p)
        return img

    def _top(self, d, day):
        d.rounded_rectangle((50, 110, 1030, 270), 36, fill=PANEL)
        d.text((90, 140), f"{self.ticker} · {day['date']}", font=font(34), fill=(170, 180, 210))
        d.text((90, 185), f"${day['close']:,.2f}", font=font(66, display=True), fill=WHITE)
        ret = day["equity"] / self.start_cash - 1
        d.text((990, 140), "초파리 계좌", font=font(34), fill=(170, 180, 210), anchor="ra")
        d.text((990, 185), f"{ret:+.1%}", font=font(66, display=True), fill=UP if ret >= 0 else DOWN, anchor="ra")

    def _hud(self, img, d, day, pulse):
        x0, y0, x1, y1 = HUD
        d.rounded_rectangle(HUD, 30, fill=PANEL)
        img.alpha_composite(self._mini_image(day, pulse), (x0 + 15, y0 + 5))
        rows = [("단맛", day["sugar_hz"], 200, SUGAR), ("쓴맛", day["bitter_hz"], 200, BITTER),
                ("MN9", day["mn9_hz"], 120, MN9)]
        for k, (label, hz, full, color) in enumerate(rows):
            y = y0 + 185 + k * 46
            d.text((x0 + 30, y), label, font=font(32), fill=color)
            bx0, bx1 = x0 + 125, x1 - 130
            d.rounded_rectangle((bx0, y + 8, bx1, y + 30), 11, fill=(255, 255, 255, 40))
            fill_w = (bx1 - bx0) * min(hz / full, 1.0)
            if fill_w > 4:
                d.rounded_rectangle((bx0, y + 8, bx0 + fill_w, y + 30), 11, fill=color)
            d.text((x1 - 25, y), f"{hz:.0f}Hz", font=font(30), fill=WHITE, anchor="ra")

    def _chart(self, d, day_f):
        x0, y0, x1, y1 = CHART
        d.rounded_rectangle(CHART, 30, fill=PANEL)
        px0, px1, py0, py1 = x0 + 30, x1 - 30, y0 + 30, y1 - 30
        lo, hi = self.closes.min(), self.closes.max()
        n = len(self.closes)
        xs = lambda i: px0 + (px1 - px0) * i / (n - 1)
        ys = lambda c: py1 - (py1 - py0) * (c - lo) / (hi - lo)

        k = int(np.floor(day_f))
        pts = [(xs(i), ys(c)) for i, c in enumerate(self.closes[: k + 1])]
        if k + 1 < n and day_f > k:
            frac = day_f - k
            c = self.closes[k] + (self.closes[k + 1] - self.closes[k]) * frac
            pts.append((xs(k + frac), ys(c)))

        # shade the stretches where the fly holds shares
        for i in range(min(k, n - 2) + 1):
            if self.days[i]["position"] and i + 1 < len(pts):
                (ax, ay), (bx, by) = pts[i], pts[i + 1]
                d.polygon([(ax, ay), (bx, by), (bx, py1), (ax, py1)], fill=UP + (55,))
        if len(pts) > 1:
            d.line(pts, fill=WHITE, width=6, joint="curve")
        for i, day in enumerate(self.days[: k + 1]):
            if day["action"] in EVENT_TEXT:
                x, y = pts[i]
                color = EVENT_TEXT[day["action"]][2]
                tri = [(x, y + 18), (x - 16, y + 46), (x + 16, y + 46)] if day["action"] == "BUY" \
                    else [(x, y - 18), (x - 16, y - 46), (x + 16, y - 46)]
                d.polygon(tri, fill=color)
        x, y = pts[-1]
        d.ellipse((x - 18, y - 18, x + 18, y + 18), fill=(255, 255, 255, 70))
        d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=WHITE)

    def _pop(self, img, action, p, day):
        big, small, color = EVENT_TEXT[action]
        scale = ease_out_back(p / 0.22)
        fade = 1.0 if p < 0.8 else max(0.0, 1 - (p - 0.8) / 0.2)
        if scale <= 0.01 or fade <= 0:
            return
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.text((POP_X, 410), big, font=font(max(1, int(150 * scale)), display=True), fill=color,
               anchor="mm", stroke_width=9, stroke_fill=(0, 0, 0))
        d.text((POP_X, 540), small, font=font(max(1, int(58 * scale))), fill=WHITE,
               anchor="mm", stroke_width=5, stroke_fill=(0, 0, 0))
        d.text((POP_X, 605), f"MN9 {day['mn9_hz']:.0f}Hz", font=font(max(1, int(40 * scale))), fill=MN9,
               anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
        if fade < 1:
            layer.putalpha(Image.eval(layer.getchannel("A"), lambda a: int(a * fade)))
        img.alpha_composite(layer)

    def _ending(self, img, p):
        """Results panel over the chart area, leaving the fly's reaction visible above it."""
        pop = ease_out_back(p / 0.25)
        if pop <= 0.01:
            return
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.rounded_rectangle((50, 1080, 1030, 1560), 36, fill=(10, 12, 28, 235))
        fly, hold = self.summary["fly_return"], self.summary["hold_return"]
        d.text((W / 2, 1140), f"{len(self.days)}거래일 결과", font=font(50), fill=WHITE, anchor="mm")
        for x, label, ret in ((290, "초파리", fly), (790, "존버", hold)):
            d.text((x, 1225), label, font=font(46), fill=(200, 205, 230), anchor="mm")
            d.text((x, 1340), f"{ret:+.1%}", font=font(110, display=True), fill=UP if ret >= 0 else DOWN, anchor="mm")
        d.text((W / 2, 1340), "vs", font=font(44), fill=(140, 145, 170), anchor="mm")
        d.text((W / 2, 1490), f"매매 {self.summary['n_trades']}회 · 과거 데이터 모의투자 · 투자 조언 아님",
               font=font(32), fill=(140, 145, 170), anchor="mm")
        scale = min(max(pop, 0.05), 1.0)
        box = layer.crop((0, 1080, W, 1560)).resize((int(W * scale), int(480 * scale)))
        img.alpha_composite(box, (int(W * (1 - scale) / 2), int(1320 - 240 * scale)))
