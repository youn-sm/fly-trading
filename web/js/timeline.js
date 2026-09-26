// Playback schedule: the chart moves day by day and pauses on every BUY/SELL so each motion plays out alone.
export const SEC_PER_DAY = 0.2;
export const EVENT_SEC = 1.4; // motion ~1.1 s, then settles back to idle before the chart moves on
export const ENDING_SEC = 3;
export const LOSS_ENDING_SEC = 16; // room for the fly to read the result and fall apart

export function buildSegments(days, endingSec = ENDING_SEC) {
  const segs = [];
  let t = 0, cur = 0;
  const add = (kind, dur, day0, day1, action = '') => { segs.push({ kind, start: t, dur, day0, day1, action }); t += dur; };
  days.forEach((d, i) => {
    if (d.action !== 'BUY' && d.action !== 'SELL') return;
    if (i > cur) { add('move', (i - cur) * SEC_PER_DAY, cur, i); cur = i; }
    add('event', EVENT_SEC, i, i, d.action);
  });
  const last = days.length - 1;
  if (last > cur) add('move', (last - cur) * SEC_PER_DAY, cur, last);
  add('ending', endingSec, last, last);
  return { segs, total: t };
}

// what is on screen at loop time t
export function stateAt({ segs, total }, t) {
  t = ((t % total) + total) % total;
  const seg = segs.find((s) => t < s.start + s.dur) ?? segs[segs.length - 1];
  const p = (t - seg.start) / seg.dur;
  const day = seg.kind === 'move' ? seg.day0 + (seg.day1 - seg.day0) * p : seg.day0;
  return { day, kind: seg.kind, action: seg.action, p, dayIndex: Math.floor(day + 1e-6) };
}
