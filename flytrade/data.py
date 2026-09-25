"""Load the fly connectome, neuron positions and stock prices from ./data."""
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import sparse

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
COMPLETENESS = DATA / "2023_03_23_completeness_630_final.csv"
CONNECTIVITY = DATA / "2023_03_23_connectivity_630_final.parquet"
ANNOTATIONS = DATA / "Supplemental_file1_neuron_annotations.tsv"

# FlyWire voxel size in nm (x, y, z)
VOXEL_NM = np.array([4.0, 4.0, 40.0])


def _require(path: Path) -> Path:
    if not path.exists():
        raise FileNotFoundError(f"{path} missing — run scripts/download_data.sh first")
    return path


def load_connectome() -> tuple[np.ndarray, sparse.csr_matrix]:
    """Return (flywire ids, signed synapse-count matrix W[pre, post])."""
    ids = pd.read_csv(_require(COMPLETENESS), index_col=0).index.to_numpy(np.int64)
    df = pd.read_parquet(
        _require(CONNECTIVITY),
        columns=["Presynaptic_Index", "Postsynaptic_Index", "Excitatory x Connectivity"],
    )
    n = len(ids)
    W = sparse.csr_matrix(
        (
            df["Excitatory x Connectivity"].to_numpy(np.float32),
            (df["Presynaptic_Index"].to_numpy(), df["Postsynaptic_Index"].to_numpy()),
        ),
        shape=(n, n),
    )
    return ids, W


def load_positions(ids: np.ndarray) -> np.ndarray:
    """Neuron positions in µm, shape (len(ids), 3). NaN where the id has no v783 match."""
    ann = pd.read_csv(
        _require(ANNOTATIONS), sep="\t", usecols=["root_id", "pos_x", "pos_y", "pos_z"]
    ).set_index("root_id")
    pos = ann.reindex(ids)[["pos_x", "pos_y", "pos_z"]].to_numpy(float)
    return pos * VOXEL_NM / 1000.0


def load_prices(ticker: str = "NVDA", n_days: int = 60, refresh: bool = False) -> pd.Series:
    """Daily closes for the last n_days trading days, cached in data/prices_<ticker>.csv."""
    cache = DATA / f"prices_{ticker}.csv"
    if refresh or not cache.exists():
        import yfinance as yf

        closes = yf.Ticker(ticker).history(period="1y")["Close"]
        closes.index = closes.index.tz_localize(None).normalize()
        DATA.mkdir(exist_ok=True)
        closes.to_csv(cache)
    closes = pd.read_csv(cache, index_col=0, parse_dates=True).iloc[:, 0]
    return closes.tail(n_days)
