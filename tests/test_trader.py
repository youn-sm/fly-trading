import numpy as np
import pytest

from flytrade.trader import backtest, taste_rates


def test_rising_prices_taste_sweet_only():
    closes = np.array([100, 101, 102, 103, 104, 105.0])
    sugar, bitter = taste_rates(closes, 5)
    assert sugar > 0 and bitter == 0


def test_falling_prices_taste_bitter_only():
    closes = np.array([105, 104, 103, 102, 101, 100.0])
    sugar, bitter = taste_rates(closes, 5)
    assert sugar == 0 and bitter > 0


def test_taste_saturates_at_max_hz():
    closes = np.array([100, 150, 200, 250, 300, 350.0])
    assert taste_rates(closes, 5) == (200.0, 0.0)


def test_backtest_buys_on_sweet_sells_on_bitter():
    closes = np.array([100, 101, 102, 103, 104, 105, 110, 100, 95, 90, 85, 80.0])
    dates = [f"d{i}" for i in range(len(closes))]
    fake_brain = lambda sugar, bitter: (sugar - bitter, 7)  # "MN9" = sugar minus bitter

    days = backtest(closes, dates, fake_brain, threshold=1.0, lookback=5, cash=1000)

    actions = [d.action for d in days]
    assert actions[:5] == ["WAIT"] * 5
    assert actions[5] == "BUY"  # first day with 5 days of history, all up
    sell = actions.index("SELL")
    assert all(a == "HOLD" for a in actions[6:sell])
    # bought at 105, sold at closes[sell]
    assert days[sell].equity == pytest.approx(1000 * closes[sell] / 105)
    assert days[-1].equity == pytest.approx(days[sell].equity)  # flat after selling
    assert days[5].n_active == 7


def test_days_are_json_serializable():
    import json
    from dataclasses import asdict

    closes = np.array([100, 101, 102, 103, 104, 105, 99.0])
    days = backtest(closes, list("abcdefg"), lambda s, b: (s - b, 1), threshold=1.0)
    json.dumps([asdict(d) for d in days])
    assert taste_rates(np.array([100, 101, 102, 103, 104, 105.0]), 5)[1] == 0.0
