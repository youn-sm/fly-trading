// The fly's trading screen: NVDA candles replayed day by day, drawn into the monitor's canvas texture.
export const SCREEN_W = 1024, SCREEN_H = 590;
const UP = '#28dc78', DOWN = '#ff4650', MUTED = '#8a92b8';

export class Monitor {
  constructor(days, ticker) {
    this.days = days;
    this.ticker = ticker;
    this.canvas = document.createElement('canvas');
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.g = this.canvas.getContext('2d');
    const lows = days.map((d) => d.low), highs = days.map((d) => d.high);
    const pad = (Math.max(...highs) - Math.min(...lows)) * 0.08;
    this.lo = Math.min(...lows) - pad;
    this.hi = Math.max(...highs) + pad;
  }

  draw({ day, kind, action, p }) {
    const { g, days } = this;
    const n = days.length, k = Math.min(Math.floor(day + 1e-6), n - 1), frac = day - k;
    const x0 = 40, x1 = SCREEN_W - 110, y0 = 120, y1 = SCREEN_H - 40;
    const X = (i) => x0 + (x1 - x0) * (i + 0.5) / n;
    const Y = (v) => y1 - (y1 - y0) * (v - this.lo) / (this.hi - this.lo);
    const cw = (x1 - x0) / n * 0.62;

    g.fillStyle = '#0b0f1d';
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.strokeStyle = '#1a2038';
    g.lineWidth = 1;
    for (let v = Math.ceil(this.lo / 10) * 10; v < this.hi; v += 10) {
      g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke();
      g.fillStyle = MUTED; g.font = '20px system-ui'; g.fillText(`${v}`, x1 + 12, Y(v) + 7);
    }

    // shade the days the fly holds shares
    g.fillStyle = 'rgba(40,220,120,0.09)';
    for (let i = 0; i <= k; i++) if (days[i].position) g.fillRect(X(i) - (x1 - x0) / n / 2, y0, (x1 - x0) / n, y1 - y0);

    // candles; the next one grows in while the chart is moving
    const candle = (i, o, h, l, c) => {
      const color = c >= o ? UP : DOWN;
      g.strokeStyle = g.fillStyle = color;
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(X(i), Y(h)); g.lineTo(X(i), Y(l)); g.stroke();
      const top = Y(Math.max(o, c)), bot = Y(Math.min(o, c));
      g.fillRect(X(i) - cw / 2, top, cw, Math.max(2, bot - top));
    };
    for (let i = 0; i <= k; i++) candle(i, days[i].open, days[i].high, days[i].low, days[i].close);
    if (frac > 0.05 && k + 1 < n) {
      const d = days[k + 1], c = d.open + (d.close - d.open) * frac;
      candle(k + 1, d.open, Math.max(d.open, c) + (d.high - Math.max(d.open, d.close)) * frac,
        Math.min(d.open, c) - (Math.min(d.open, d.close) - d.low) * frac, c);
    }

    // trade markers
    g.font = 'bold 22px system-ui';
    g.textAlign = 'center';
    for (let i = 0; i <= k; i++) {
      const a = days[i].action;
      if (a !== 'BUY' && a !== 'SELL') continue;
      const buy = a === 'BUY', x = X(i), y = buy ? Y(days[i].low) + 16 : Y(days[i].high) - 16;
      g.fillStyle = buy ? UP : DOWN;
      g.beginPath();
      g.moveTo(x, y + (buy ? -8 : 8)); g.lineTo(x - 10, y + (buy ? 10 : -10)); g.lineTo(x + 10, y + (buy ? 10 : -10));
      g.fill();
    }

    // header
    const now = days[k], first = days[0];
    const chg = now.close / first.close - 1;
    g.textAlign = 'left';
    g.fillStyle = '#fff';
    g.font = 'bold 50px system-ui';
    g.fillText(this.ticker, 40, 72);
    g.fillText(`$${now.close.toFixed(2)}`, 200, 72);
    g.fillStyle = chg >= 0 ? UP : DOWN;
    g.font = 'bold 34px system-ui';
    g.fillText(`${chg >= 0 ? '+' : ''}${(chg * 100).toFixed(1)}%`, 440, 70);
    g.textAlign = 'right';
    g.fillStyle = MUTED;
    g.font = '26px system-ui';
    g.fillText(now.date, SCREEN_W - 40, 50);
    g.fillStyle = now.position ? UP : MUTED;
    g.font = 'bold 24px system-ui';
    g.fillText(now.position ? '● HOLDING' : '○ CASH', SCREEN_W - 40, 84);

    // BUY / SELL flash across the screen
    if (kind === 'event') {
      const a = Math.max(0, 1 - p * 1.1);
      const color = action === 'BUY' ? '40,220,120' : '255,70,80';
      g.fillStyle = `rgba(${color},${0.18 * a})`;
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      g.strokeStyle = `rgba(${color},${a})`;
      g.lineWidth = 12;
      g.strokeRect(6, 6, SCREEN_W - 12, SCREEN_H - 12);
      g.textAlign = 'center';
      g.fillStyle = `rgba(${color},${Math.min(1, a * 1.5)})`;
      g.font = 'bold 150px system-ui';
      g.fillText(action, SCREEN_W / 2, SCREEN_H / 2 + 50);
    }
    g.textAlign = 'left';
  }
}
