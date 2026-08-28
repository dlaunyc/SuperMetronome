# Metronome MVP roadmap

This roadmap is sequence-based. Dates are intentionally omitted until delivery capacity and release targets are known. Post-MVP work is tracked in [future.md](future.md).

```mermaid
flowchart TB
    S0["0. Product boundary<br/>One public HTTPS link<br/>Responsive desktop + mobile<br/>Foreground playback is the universal promise"]

    S1["1. Project foundation<br/>HTML + responsive CSS<br/>TypeScript + Vite<br/>Framework-independent engine boundary<br/>Automated production build"]

    S2["2. Timing-engine proof<br/>AudioContext-owned clock<br/>Look-ahead scheduler<br/>Authoritative transport + phase<br/>Click and accent envelopes<br/>Scheduler instrumentation"]

    G1{"Timing proof passes?<br/>No drift or missed beats under UI/CPU load<br/>Tempo changes preserve defined phase"}

    S3["3. Universal MVP experience<br/>Play / stop<br/>BPM + tap tempo<br/>Meter + subdivisions + accents<br/>Volume + local preferences<br/>Touch, pointer, and keyboard access"]

    S4["4. Cross-device hardening<br/>Chromium + Gecko + WebKit<br/>Desktop + physical Android + iPhone/iPad<br/>Built-in, wired, and Bluetooth output<br/>Visibility, interruption, sleep/wake recovery<br/>Objective timing + subjective click tests"]

    G2{"Release contract passes?<br/>Accurate foreground timing<br/>Accessible responsive controls<br/>Graceful browser differences"}

    S5["5. Public web/PWA launch<br/>Cloudflare Pages HTTPS deployment<br/>Web app manifest + icons<br/>Service-worker application-shell cache<br/>Installable where supported<br/>Normal website everywhere else"]

    L["MVP released<br/>Public, installable, offline-capable metronome"]

    S0 --> S1 --> S2 --> G1
    G1 -- "No: measure and revise" --> S2
    G1 -- "Yes" --> S3 --> S4 --> G2
    G2 -- "No: fix and retest" --> S2
    G2 -- "Yes" --> S5 --> L

    subgraph EVIDENCE["Research evidence feeding the MVP"]
        R1["Two clocks + Web Audio specification<br/>Scheduling architecture"]
        R2["Timing Object model<br/>Authoritative transport state"]
        R3["Perceptual-centre experiments<br/>Click-envelope design"]
        R4["Browser precision study<br/>Cross-browser QA method"]
        R5["Human anticipation model<br/>Avoid misreading tap offsets as engine errors"]
    end

    R1 -. "defines" .-> S2
    R2 -. "structures" .-> S2
    R3 -. "shapes" .-> S2
    R4 -. "validates" .-> S4
    R5 -. "guards interpretation" .-> S4

    classDef foundation fill:#e0e7ff,stroke:#4338ca,color:#1e1b4b,stroke-width:2px;
    classDef core fill:#dcfce7,stroke:#15803d,color:#052e16,stroke-width:2px;
    classDef release fill:#dbeafe,stroke:#1d4ed8,color:#172554,stroke-width:2px;
    classDef gate fill:#ffedd5,stroke:#c2410c,color:#431407,stroke-width:2px;
    classDef evidence fill:#f3f4f6,stroke:#6b7280,color:#111827,stroke-width:1px;

    class S0,S1 foundation;
    class S2,S3 core;
    class S4,S5,L release;
    class G1,G2 gate;
    class R1,R2,R3,R4,R5 evidence;
```

## Phase outcomes and exit criteria

| Phase | Outcome required before advancing |
|---|---|
| 0. Product boundary | Foreground web use and the installable/offline PWA are accepted as the MVP contract. |
| 1. Foundation | The production build succeeds and the audio engine has no dependency on the UI framework. |
| 2. Timing proof | The audio clock drives every beat; instrumentation shows stable intervals, no cumulative drift, and defined behavior during live tempo changes. |
| 3. Universal experience | A user can complete a normal practice session using touch, mouse, or keyboard on both narrow and wide layouts. |
| 4. Hardening | The compatibility matrix passes on physical Chromium, Gecko, and WebKit devices, including interruption and output-route scenarios. |
| 5. Launch | The HTTPS URL works normally, installation succeeds where supported, and the cached application shell launches without connectivity. |

## MVP release contents

- Accurate Web Audio look-ahead scheduling.
- Start/stop, BPM, tap tempo, meter, subdivisions, accents, and volume.
- Responsive and accessible desktop/mobile controls.
- Local preference storage.
- Cross-browser/device validation and interruption recovery.
- Cloudflare Pages deployment, PWA manifest, icons, and offline application-shell caching.
