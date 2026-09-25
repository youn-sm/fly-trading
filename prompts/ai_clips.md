# AI 초파리 클립 만들기

AI로 만들 건 **캐릭터 이미지 1장**과 **영상 클립 4개**다. 차트, 뇌 HUD, BUY!/SELL! 글씨는 코드가 올리므로 영상 안에 글자나 UI를 넣지 않는다.

## 순서

1. 아래 **캐릭터 이미지 프롬프트**로 9:16 이미지를 뽑고, 가장 귀여운 한 장을 고른다.
2. 그 이미지를 **첫 프레임(시작 이미지)**으로 넣고 클립 4개를 각각 이미지→영상으로 만든다 (Kling, Veo, Sora, Runway 등).
   - 네 클립이 모두 같은 프레임에서 시작하므로 클립이 바뀌어도 캐릭터가 달라지지 않고, 컷이 자연스럽게 이어진다.
3. 파일 이름을 맞춰 `assets/clips/`에 넣는다: `idle.mp4`, `buy.mp4`, `sell.mp4`, `ending.mp4`
4. `.venv/bin/python -m flytrade.video` 실행 → `output/reel.mp4`

## 화면 배치 (중요)

코드 오버레이가 이 영역을 덮는다. **초파리 얼굴은 화면 한가운데**에 오게 한다.

```
┌──────────────────────┐  0
│  주가 · 수익률 카드   │
│            ┌───────┐ │  ~290
│            │뇌 HUD │ │
│            └───────┘ │  ~630
│                      │
│    🪰 초파리 얼굴     │  ← 650~1150 : 여기가 주인공 자리
│    + 모니터          │
│                      │
│ ┌──────────────────┐ │  1180
│ │     차트          │ │
│ └──────────────────┘ │  1480
│  (릴스 캡션/버튼)     │
└──────────────────────┘  1920
```

## 캐릭터 이미지 프롬프트

```
A super cute chibi fruit fly character, Pixar-style 3D render.
Huge glossy bright-red compound eyes with sparkly highlights, round fuzzy tan-orange body,
soft brown stripes on the abdomen, two tiny curly antennae, translucent iridescent wings,
six thin little legs. Wears a tiny navy necktie.
Sits upright in a black ergonomic mesh office chair at a small wooden desk,
three-quarter view, facing a computer monitor that glows with a green-and-red stock candlestick chart.
Cozy modern office at night, warm desk lamp, soft cyan rim light from the monitor.
The fly and the monitor are in the vertical center of the frame, plain wall above, desk surface below.
Vertical 9:16, cinematic lighting, shallow depth of field. No text, no logos.
```

제외(negative): `text, watermark, logo, realistic gross insect, hairy close-up, extra limbs, human hands`

## 클립 프롬프트 (이미지→영상, 9:16, 5초, 카메라 고정)

> 매수/매도 클립은 영상에서 **처음 1.3초만** 쓰인다. 핵심 동작이 **시작하자마자** 나와야 한다.
> 동작이 늦게 나오면 클립을 넣어두기만 하면 된다. 해당 구간을 잘라서 맞추는 건 코드 쪽에서 처리할 수 있다.

### idle.mp4 — 모니터 보며 대기 (루프)

```
The fly calmly watches the monitor, blinking its big red eyes, antennae twitching,
one front leg tapping the desk, wings gently fluttering.
Subtle motion only, static camera. It ends in the same pose it started in, for a seamless loop.
```

### buy.mp4 — 냠냠 매수

```
Immediately the fly's eyes light up with excitement. It leans toward the monitor, extends its long
straw-like proboscis and happily slurps the glowing green candlestick right off the screen,
wings buzzing fast with joy, tiny sparkles around it. The action starts in the first second. Static camera.
```

### sell.mp4 — 퉤! 매도

```
Immediately the fly makes a disgusted face, pulls back from the monitor and spits out a cartoon splash,
shaking its head, wings drooping, pushing its chair back with its legs. Comical, exaggerated.
The action starts in the first second. Static camera.
```

### ending.mp4 — 결과 리액션

현재 결과는 **초파리 −5.4% vs 존버 +13.8%**라서 패배 버전을 쓴다.

```
The fly stares at the monitor in shock, then slowly slumps back into the office chair and covers its
big red eyes with its front legs, a tiny cartoon sweat drop, antennae drooping. Dramatic, funny, sad.
Slow camera push-in.
```

기간을 바꿔서 초파리가 이기면 이 버전을 쓴다:

```
The fly jumps up on the chair and celebrates, wings buzzing, spinning the chair around,
tiny confetti falling, big proud smile. Slow camera push-in.
```

## 마무리 편집 (릴스 앱에서)

- 효과음: BUY는 "쪼옥" 빨아먹는 소리, SELL은 "퉤" 소리를 넣으면 잘 산다.
- 효과음을 넣을 매매 시점은 `python -m flytrade.video` 실행 로그에 초 단위로 찍힌다.
- BGM은 릴스 앱에서 트렌딩 음원을 쓰면 된다 (영상 파일에는 소리가 없다).
