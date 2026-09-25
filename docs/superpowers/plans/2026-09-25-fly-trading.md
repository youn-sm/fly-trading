# Fly Trading Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 초파리 커넥톰 LIF 시뮬레이션으로 NVDA 매수/매도를 결정하고, 그 결과를 세로 릴스 영상으로 렌더링한다.

**Architecture:** `flytrade/` 패키지 — data(로드) → brain(LIF) → trader(timeline.json) → intro/overlay(프레임 렌더) → video(ffmpeg 합성). 모든 렌더는 numpy+PIL 프레임을 ffmpeg stdin으로 파이프.

**Tech Stack:** Python 3.12 venv, numpy, scipy.sparse, pandas/pyarrow, Pillow, yfinance, ffmpeg, pytest.

---

### Task 1: data.py — 로더
- Create: `flytrade/__init__.py`, `flytrade/data.py`, `scripts/download_data.sh`
- `load_connectome() -> (ids: np.ndarray[int64], W: scipy.sparse.csr_matrix[float32] (pre×post, 단위 mV = ExcxConn × 0.275))`
- `load_positions(ids) -> np.ndarray (N,3) µm, NaN for missing` (annotations v783, pos × (4,4,40) nm)
- `load_prices(ticker, n_days) -> pd.Series` (yfinance Close, 캐시 `data/prices_<ticker>.csv`)
- 다운로드 스크립트는 curl로 3개 파일을 `data/`에 받음

### Task 2: brain.py — LIF 시뮬레이터 (TDD)
- Create: `flytrade/neurons.py` (SUGAR, BITTER, MN9 ID 리스트), `flytrade/brain.py`, `tests/test_brain.py`
- `Brain(ids, W, dt=0.1ms)`; `Brain.run(stim: dict[int, float Hz], t_ms, seed) -> SimResult(rates: np.ndarray Hz per neuron, first_spike_ms: np.ndarray (NaN if none))`
- 정확 적분(선형 ODE 해석해), 지연 18스텝 링버퍼, 불응기 22스텝(자극 뉴런은 0), Poisson 입력 = v += 68.75mV
- Tests (소형 합성 네트워크): 자극 없으면 무발화 / 자극 뉴런 발화율 ≈ 입력률 / 강한 흥분 연결이 하위 뉴런을 발화시킴 / 억제 연결이 발화를 막음
- Integration test (`-m slow`, 실제 커넥톰): sugar 150Hz → MN9 > 0Hz, sugar 150 + bitter 150 → MN9 감소

### Task 3: trader.py — 매매 규칙 (TDD)
- Create: `flytrade/trader.py`, `tests/test_trader.py`
- `taste_rates(closes, i, lookback=5, full_scale=0.08, max_hz=200) -> (sugar_hz, bitter_hz)`
- `backtest(closes, dates, decide: Callable[[float,float], (bool, dict)], cash=10_000) -> list[Day]` — long-only 전액 진입/청산, 액션 BUY/SELL/HOLD/WAIT
- `main()` → 실제 Brain으로 decide, `output/timeline.json` (days, trades, 최종 수익률, 존버 수익률, intro용 sugar 전파 first_spike)
- Tests: 가짜 decide로 BUY/SELL 발생 시점·수익 계산 검증, taste_rates 경계값

### Task 4: intro.py — 3D 뇌 인트로
- Create: `flytrade/render/common.py` (캔버스 크기, 폰트, 색), `flytrade/render/intro.py`
- `IntroRenderer(positions, first_spike_ms, highlight ids)`; `.frame(t_sec) -> RGB np.ndarray(1920,1080,3)`
- y축 회전 투영 → 2D 누적 히스토그램 → 가우시안 블러 2단 글로우; 전파 파동은 first_spike 순서로 점등; 텍스트 "139,255 neurons" 등
- 검증: 대표 프레임 PNG 저장 후 육안 확인

### Task 5: overlay.py — 트레이딩 UI 오버레이
- Create: `flytrade/render/overlay.py`
- `Overlay(timeline)`; `.frame(state) -> RGBA PIL.Image` — 상단 티커/수익률, 하단 차트(진행 + 마커), 뇌 HUD(단맛/쓴맛/MN9 바), BUY!/SELL! 팝(스케일 바운스), 엔딩 카드
- 검증: 대표 프레임 PNG 육안 확인

### Task 6: video.py — 합성 (TDD for segment builder)
- Create: `flytrade/video.py`, `tests/test_video.py`
- `build_segments(days, sec_per_day=0.3, event_sec=1.8) -> list[Segment(kind, start, dur, day_from, day_to)]`
- `ClipSource(path)` — mp4 있으면 ffmpeg로 1080×1920 크롭 디코딩, 없으면 자리표시 프레임
- `render(timeline, out='output/reel.mp4')` — 인트로 + 세그먼트별 배경 + 오버레이 알파 합성 → ffmpeg libx264
- Tests: 세그먼트 총 길이, 이벤트 위치, 연속성

### Task 7: README + GitHub
- README(개념, 실행법, 데이터 출처/라이선스, 면책), `.gitignore`(data/, output/, .venv, assets/clips/*.mp4)
- `gh repo create youn-sm/fly-trading --public --source . --push`
