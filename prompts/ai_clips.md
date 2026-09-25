# AI 초파리 클립 만들기

AI로 만들 건 **캐릭터 이미지 1장**과 **영상 클립 4개**다. 차트, 뇌 HUD, BUY!/SELL! 글씨는 코드가 올리므로 영상 안에 글자나 UI를 넣지 않는다.

**스타일:** 과학 시뮬레이션 렌더처럼 보이는 실사풍 초파리. 무광 흰회색 반투명 몸, 크고 짙은 빨간 겹눈, 어두운 회색 배경이다.
만화 캐릭터처럼 표정을 짓거나 사람 흉내를 내지 않는다. **진짜 초파리가 하는 행동**만 쓴다: 주둥이 뻗기, 앞다리로 머리 닦기, 날개 떨기.
"진짜 뇌 시뮬레이션"이라는 컨셉과 맞추기 위해서다.

## 순서

1. 캐릭터 이미지를 고른다. Canva에서 3장을 뽑아 두었다: `MAHWK26G9eg`, `MAHWK_yCUt4`, `MAHWK_ZAczs`.
2. 고른 이미지를 **첫 프레임(시작 이미지)**으로 넣고 클립 4개를 각각 이미지→영상으로 만든다 (Kling, Veo, Sora, Runway 등).
   - 네 클립이 모두 같은 프레임에서 시작하므로 클립이 바뀌어도 캐릭터가 달라지지 않고, 컷이 자연스럽게 이어진다.
3. 파일 이름을 맞춰 `assets/clips/`에 넣는다: `idle.mp4`, `buy.mp4`, `sell.mp4`, `ending.mp4`
4. `.venv/bin/python -m flytrade.video` 실행 → `output/reel.mp4`

## 화면 배치 (중요)

코드 오버레이가 이 영역을 덮는다. **초파리 머리는 화면 한가운데**에 오게 한다.

```
┌──────────────────────┐  0
│  주가 · 수익률 카드   │
│            ┌───────┐ │  ~290
│            │뇌 HUD │ │
│            └───────┘ │  ~630
│                      │
│    🪰 초파리 머리     │  ← 650~1150 : 여기가 주인공 자리
│    + 모니터          │
│                      │
│ ┌──────────────────┐ │  1180
│ │     차트          │ │
│ └──────────────────┘ │  1480
│  (릴스 캡션/버튼)     │
└──────────────────────┘  1920
```

## 캐릭터 이미지 프롬프트 (레퍼런스 이미지 2장과 함께)

```
Use the fruit fly from the reference images: the same 3D scientific simulation render style —
matte whitish-gray semi-translucent body, soft fuzzy texture, large deep-red compound eyes,
thin pale legs, translucent wings, soft studio lighting, dark gray background.
Now this exact fly sits upright in a small black ergonomic office chair at a desk, facing a computer
monitor that glows with a green-and-red stock candlestick chart, the screen light casting a soft cyan
glow on its body and red eyes. One front leg rests on a keyboard. Three-quarter view so the fly's head
and the monitor are both visible. Fly and monitor in the vertical center of the frame,
dark empty space above, desk surface below. Vertical 9:16. No text, no logos, no watermark.
```

## 클립 프롬프트 (이미지→영상, 9:16, 5초, 카메라 고정)

> 매수/매도 클립은 영상에서 **처음 1.3초만** 쓰인다. 핵심 동작이 **시작하자마자** 나와야 한다.
> 동작이 늦게 나오면 클립을 넣어두기만 하면 된다. 해당 구간을 잘라서 맞추는 건 코드 쪽에서 처리할 수 있다.

공통 뒤에 붙일 문장:
`Keep the exact same fly, render style, lighting and framing as the start image. Realistic fruit fly behavior, no cartoon expressions. Static camera.`

### idle.mp4 — 모니터 보며 대기 (루프)

```
The fly sits still watching the monitor. Its antennae twitch slightly, it briefly rubs its two front
legs together, wings give a tiny shiver. Very subtle motion. It ends in the same pose it started in,
for a seamless loop.
```

### buy.mp4 — 주둥이 쭉, 매수 (MN9 발화)

```
Immediately the fly leans toward the monitor and extends its long proboscis, pressing the tip against
the glowing green candlestick on the screen as if feeding on it, the proboscis pumping gently,
wings quivering with excitement. The action starts in the first second.
```

### sell.mp4 — 쓴맛, 매도

```
Immediately the fly jerks its head back from the monitor, quickly retracts its proboscis, and
vigorously rubs its head and mouthparts with its front legs as if cleaning off a bitter taste,
then turns its body slightly away from the screen. The action starts in the first second.
```

### ending.mp4 — 결과 리액션

현재 결과는 **초파리 −5.4% vs 존버 +13.8%**라서 패배 버전을 쓴다.

```
The fly slowly turns to face the monitor, freezes for a moment, then its wings droop, its antennae
lower, and it slowly slides down in the office chair, front legs dropping off the keyboard.
Slow camera push-in toward its red eyes.
```

기간을 바꿔서 초파리가 이기면 이 버전을 쓴다:

```
The fly lifts its front legs off the keyboard, buzzes its wings rapidly in a blur, and hops up onto
the edge of the desk facing the glowing green chart. Slow camera push-in.
```

## 마무리 편집 (릴스 앱에서)

- 효과음: BUY는 "쪼옥" 빨아먹는 소리, SELL은 "퉤" 소리를 넣으면 잘 산다.
- 효과음을 넣을 매매 시점은 `python -m flytrade.video` 실행 로그에 초 단위로 찍힌다.
- BGM은 릴스 앱에서 트렌딩 음원을 쓰면 된다 (영상 파일에는 소리가 없다).
