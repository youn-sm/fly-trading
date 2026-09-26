# Fly Trading 🪰📈

**실제 초파리 뇌(FlyWire 커넥톰)가 엔비디아 주식을 사고판다.** 릴스용 재미 프로젝트.

초파리는 주가를 **맛**으로 느낀다.

- 최근 5일간 오른 만큼 → **단맛** 뉴런(GRN) 21개를 자극
- 최근 5일간 내린 만큼 → **쓴맛** 뉴런 21개를 자극
- 신호가 실제 뇌 배선(뉴런 127,400개, 시냅스 5,279만개)을 타고 퍼져서
- 먹이를 빨아먹는 운동 뉴런 **MN9**가 강하게 발화하면 → **매수** (냠냠)
- 발화하지 않으면 → **매도** (퉤!)

"단맛은 MN9를 켜고, 쓴맛은 그걸 억제한다"는 건 [Shiu et al. 2024, *Nature*](https://www.nature.com/articles/s41586-024-07763-9)의 전뇌 시뮬레이션 결과다. 이 저장소는 그 모델을 numpy로 다시 구현했고, 같은 결과를 재현한다 (단맛 150Hz → MN9 약 110Hz, 쓴맛을 섞으면 약 4Hz).

> 과거 데이터로 하는 모의투자다. 실제 주문은 없고, 투자 조언도 아니다.

## 실행

```bash
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
scripts/download_data.sh                 # 커넥톰 + 뉴런 좌표 (~120MB)
.venv/bin/python -m flytrade.trader      # 60거래일 매매 → output/timeline.json (~1.5분)
.venv/bin/python -m flytrade.video       # → output/reel.mp4 (1080×1920, ~36초)
```

- `python -m flytrade.video --preview`는 스틸 컷 몇 장만 빠르게 뽑는다 (`output/preview/reel_sheet.png`).
- AI로 만든 초파리 클립을 `assets/clips/{idle,buy,sell,ending}.mp4`에 넣으면 배경으로 쓰인다. 크기는 상관없고 9:16으로 자동 크롭된다. 없는 클립은 자리표시 화면으로 대체된다.
- 테스트: `.venv/bin/python -m pytest` (실제 커넥톰 통합 테스트까지 돌리려면 `-m slow`)

## 3D 웹 페이지 (폰으로 찍는 버전)

`web/`는 Three.js로 만든 3D 페이지다. 코드로 만든 주황색 초파리가 사무실 의자에 앉아서 NVDA를 매매한다.

```bash
.venv/bin/python -m flytrade.export_web          # timeline + 캔들 + 뇌 좌표 → web/data/
.venv/bin/python -m http.server 8765 --directory web
# → http://localhost:8765  (전체 화면으로 띄우고 폰으로 촬영)
```

- **모니터:** 실제 NVDA 60거래일 캔들이 배속으로 흘러간다. 한 바퀴는 약 33초이고, 끝나면 무한 반복한다.
- **매수/매도:** 매매하는 날에는 차트가 멈추고 모션이 나온다. 매수 때는 초록 설탕 방울에 주둥이를 뻗고, 매도 때는 보라 쓴맛 방울을 맛본 뒤 입을 닦는다. 모션끼리는 겹치지 않는다.
- **오른쪽 아래:** 실제 뉴런 좌표 4만 개와 그날 활성화된 단맛 경로(금색), 쓴맛 경로(초록), MN9(분홍) 하이라이트가 보인다.
- **왼쪽 위:** 초파리 수익률, 존버 수익률, 최근 매매 기록.
- **조작:** 스페이스는 일시정지, `r`은 처음부터, 마우스 드래그는 카메라 회전, `?speed=2`는 배속.

## 영상 구성

| 구간 | 내용 |
|---|---|
| 0–4초 | 실제 뉴런 좌표로 그린 3D 뇌 → 단맛 뉴런에서 MN9까지 실제 시뮬레이션 스파이크가 퍼지는 순서대로 점등 |
| 본편 | AI 초파리 클립 위에 차트, 수익률, 뇌 HUD(단맛/쓴맛/MN9)를 합성. 매매할 때마다 BUY!/SELL! 클립으로 전환 |
| 엔딩 | 초파리 수익률 vs 존버 수익률 |

## 코드

| 파일 | 역할 |
|---|---|
| `flytrade/brain.py` | 전뇌 LIF 모델 (논문과 같은 식·상수, 스파이크가 난 뉴런만 sparse 전파 → 1초 시뮬레이션에 약 3초) |
| `flytrade/trader.py` | 주가 → 맛 자극 → MN9 → 매수/매도 백테스트 |
| `flytrade/render/intro.py` | 3D 뇌 인트로 |
| `flytrade/render/overlay.py` | 트레이딩 UI 오버레이 |
| `flytrade/video.py` | 클립 + 오버레이 합성, ffmpeg 인코딩 |

## 데이터 출처

- FlyWire 커넥톰: Dorkenwald et al. 2024, *Nature* / Schlegel et al. 2024, *Nature* — [flywire.ai](https://flywire.ai), 뉴런 좌표는 [flyconnectome/flywire_annotations](https://github.com/flyconnectome/flywire_annotations)
- 뇌 모델, 연결 데이터(v630), 뉴런 ID: [philshiu/Drosophila_brain_model](https://github.com/philshiu/Drosophila_brain_model) (MIT)
- 주가: Yahoo Finance (yfinance)

데이터 이용 조건은 각 출처를 따른다.
