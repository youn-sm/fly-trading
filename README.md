# Fly Trading 🪰📈

> **지금 릴스 버전은 [3D 웹 페이지](#3d-웹-페이지-폰으로-찍는-릴스용)다.** 클럽 조명이 도는 방, 술병과 담배로 어질러진 책상에 초파리가 엎드려 뻗어 있고, TV에서는 카라멜댄스가 나온다. 주식 요소는 없다.
> 아래의 주식 매매 내용은 처음 버전인 Python 영상 파이프라인 이야기이고, 웹 페이지와는 연결돼 있지 않다.

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

## 3D 웹 페이지 (폰으로 찍는 릴스용)

`web/`는 Three.js로 만든 3D 방이다. 코드로 만든 주황색 초파리가 클럽 조명이 도는 방에서 책상에 엎드려 뻗어 있다. 큰 TV에서는 카라멜댄스(Caramelldansen)가 흘러나온다. 주식 요소는 없다.

```bash
.venv/bin/python scripts/serve.py                 # 캐시 없이 web/ 서빙 (수정하면 새로고침만 하면 됨)
# → http://localhost:8765  (전체 화면으로 띄우고 폰으로 촬영)
```

- **구도:** 초파리 등 뒤 어깨 너머에서 TV를 바라본다. 세로로 긴 창에서도 가로 화각이 유지된다.
- **초파리:** 의자에 앉은 채 책상에 얼굴을 묻고 엎드려 있다. 배는 의자에 늘어져 있고, 앞다리는 머리 밑에 접혀 있으며, 가운뎃다리는 축 늘어져 있다. 4초에 한 번 느리게 숨 쉬는 것 말고는 움직이지 않는다.
- **TV:** 실제 유튜브 영상(`6-8E4Nirh9s`)을 임베드한다. CSS3DRenderer로 플레이어를 TV 화면 위치에 맞추고, WebGL 캔버스의 그 자리를 투명하게 뚫어서 앞에 놓인 캔이 화면을 제대로 가린다. 음소거로 자동재생되며, 화면을 한 번 클릭하거나 아무 키나 누르면 소리가 켜진다. 인터넷 연결이 필요하다.
- **책상:** TV 앞에 줄 세운 에너지 드링크 캔, 위스키·보드카 병(쓰러져서 새는 병 포함), 꽁초 가득한 재떨이와 타고 있는 담배(연기가 올라감), 담뱃갑. 실제 브랜드 로고는 쓰지 않았다.
- **조명:** 천장 무빙 스포트라이트 4개(빛줄기 포함), 책상 아래·의자 밑 LED, 바닥 그리드, PC 본체 팬 RGB가 곡 템포(약 165 BPM)에 맞춰 색이 계속 바뀐다. TV 불빛도 박자마다 색이 바뀌며 초파리를 비춘다.
- **조작:** 스페이스는 일시정지, `r`은 카메라 원위치, 마우스 드래그는 카메라 회전.

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
