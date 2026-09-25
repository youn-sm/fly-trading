"""Project neuron positions to the screen and splat them into glowing images."""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


class BrainCloud:
    def __init__(self, positions: np.ndarray, width_px: float, center_px: tuple[float, float], shape: tuple[int, int]):
        """positions: (N, 3) µm with NaN rows for neurons without coordinates (they are skipped)."""
        self.shape = shape  # (h, w)
        self.cx, self.cy = center_px
        valid = ~np.isnan(positions).any(axis=1)
        self.row_of = np.full(len(positions), -1)
        self.row_of[valid] = np.arange(valid.sum())
        pts = positions[valid]
        lo, hi = np.percentile(pts, 1, axis=0), np.percentile(pts, 99, axis=0)
        self.pts = (pts - (lo + hi) / 2).astype(np.float32)
        self.scale = width_px / (hi[0] - lo[0])

    def rows(self, neuron_idx) -> np.ndarray:
        """Cloud rows for model neuron indices that have coordinates."""
        r = self.row_of[np.asarray(neuron_idx, dtype=np.int64)]
        return r[r >= 0]

    def project(self, rows, theta: float) -> tuple[np.ndarray, np.ndarray]:
        """Screen x, y after rotating by theta (radians) about the vertical axis."""
        p = self.pts[rows]
        x = p[:, 0] * np.cos(theta) + p[:, 2] * np.sin(theta)
        return self.cx + x * self.scale, self.cy + p[:, 1] * self.scale

    def splat(self, rows=None, weights=None, theta: float = 0.0) -> np.ndarray:
        """Accumulate points into a float image of self.shape."""
        rows = np.arange(len(self.pts)) if rows is None else rows
        h, w = self.shape
        x, y = self.project(rows, theta)
        xi, yi = x.astype(np.int64), y.astype(np.int64)
        ok = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
        wts = None if weights is None else np.asarray(weights, dtype=np.float64)[ok]
        img = np.bincount(yi[ok] * w + xi[ok], weights=wts, minlength=h * w)
        return img.reshape(h, w).astype(np.float32)


def glow(img: np.ndarray, sharp_sigma: float, wide_sigma: float, wide_gain: float, down: int = 4) -> np.ndarray:
    """Sharp blur plus a wide halo computed at 1/down resolution."""
    h, w = img.shape
    out = gaussian_filter(img, sharp_sigma)
    small = img[: h - h % down, : w - w % down].reshape(h // down, down, w // down, down).sum(axis=(1, 3))
    halo = gaussian_filter(small, wide_sigma / down)
    halo = np.asarray(Image.fromarray(halo).resize((w, h), Image.BILINEAR)) / (down * down)
    return out + wide_gain * halo
