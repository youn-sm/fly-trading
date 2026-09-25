import pytest

from flytrade.video import build_segments


ACTIONS = ["BUY", "HOLD", "HOLD", "SELL", "WAIT", "WAIT"]


def test_segments_are_contiguous_and_sum_to_total():
    segs = build_segments(ACTIONS, intro_sec=4, sec_per_day=0.5, event_sec=1.5, ending_sec=3)
    for a, b in zip(segs, segs[1:]):
        assert b.start == pytest.approx(a.start + a.dur)
    total = 4 + (len(ACTIONS) - 1) * 0.5 + 2 * 1.5 + 3
    assert segs[-1].start + segs[-1].dur == pytest.approx(total)


def test_events_pause_the_chart_on_their_day():
    segs = build_segments(ACTIONS, intro_sec=4, sec_per_day=0.5, event_sec=1.5, ending_sec=3)
    assert [s.kind for s in segs] == ["intro", "event", "move", "event", "move", "ending"]
    buy, sell = segs[1], segs[3]
    assert (buy.action, buy.day0, buy.day1) == ("BUY", 0, 0)
    assert (sell.action, sell.day0, sell.day1) == ("SELL", 3, 3)
    assert (segs[2].day0, segs[2].day1) == (0, 3)
    assert segs[-1].day0 == len(ACTIONS) - 1


def test_day_at_interpolates_during_moves():
    segs = build_segments(ACTIONS, intro_sec=4, sec_per_day=0.5, event_sec=1.5, ending_sec=3)
    move = segs[2]
    assert move.day_at(move.start + 0.75) == pytest.approx(1.5)
    assert segs[1].day_at(segs[1].start + 1.0) == 0
