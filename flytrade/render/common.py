"""Shared canvas size, colors and fonts for the reel."""
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import ImageFont

W, H, FPS = 1080, 1920, 30

BG = (8, 10, 22)
BRAIN = (70, 150, 255)
SUGAR = (255, 196, 64)
BITTER = (120, 230, 120)
MN9 = (255, 70, 160)
UP = (40, 220, 120)
DOWN = (255, 70, 80)
WHITE = (255, 255, 255)
PANEL = (10, 12, 28, 215)

_KO = "/System/Library/Fonts/AppleSDGothicNeo.ttc"  # index 6 = Bold, 4 = SemiBold
_DISPLAY = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"


@lru_cache(maxsize=64)
def font(size: int, display: bool = False) -> ImageFont.FreeTypeFont:
    """Korean-capable bold font; display=True for the chunky Latin headline font."""
    path, index = (_DISPLAY, 0) if display else (_KO, 6)
    if Path(path).exists():
        return ImageFont.truetype(path, size, index=index)
    return ImageFont.load_default(size)


def ease_out_back(x: float) -> float:
    """0→1 with a little overshoot, for pop-in animations."""
    x = min(max(x, 0.0), 1.0)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def colorize(intensity: np.ndarray, color) -> np.ndarray:
    """Map a 0..1 float image to RGB float by tinting with color."""
    return intensity[..., None] * (np.asarray(color, dtype=np.float32) / 255.0)
