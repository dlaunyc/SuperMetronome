# Research links: browser metronome

This list separates normative standards and research papers from implementation guides. For a first implementation, read items 1-4 in **Start here**.

## Product intent

Build a public metronome as a client-side HTML/CSS/TypeScript web application that works on current desktop and mobile browsers. It should require no account, plug-in, native installation, or server round-trip while keeping time. Hosting only needs to deliver static assets over HTTPS.

Deliver it as an installable PWA while preserving normal website behavior. It can be added to a home screen and, after the first successful load, continue working through a weak or absent connection.

## Recommended technical shape

- **Build tooling:** TypeScript with Vite (or an equivalent static bundler). There is no need for a server-rendering framework for the core app.
- **UI:** Plain DOM code is sufficient for a focused metronome. React, Vue, Svelte, or another UI framework is acceptable if desired, but it must not own musical timing.
- **Audio engine:** A small framework-independent TypeScript module built directly on the Web Audio API. It owns `AudioContext`, beat phase, look-ahead scheduling, click synthesis, and transport state.
- **Scheduler:** A coarse main-thread wake-up fills a rolling queue of events scheduled on `AudioContext.currentTime`. The UI reads scheduled beat times; it never drives the clicks.
- **Persistence:** Store preferences such as BPM, meter, subdivision, accent, volume, and theme locally. No database or account is required for an initial release.
- **Delivery:** Static HTTPS hosting, a web app manifest, and a service worker that caches the application shell. Do not make playback dependent on connectivity after the app has loaded.
- **Portability:** Core playback and controls use broadly available browser features. Installation support is optional for the user and never blocks normal website use.

Suggested module boundary:

```text
UI controls and display
        |
        v
transport commands and observable state
        |
        v
framework-independent metronome engine
  - AudioContext clock
  - look-ahead scheduler
  - click voice/envelope
  - beat and measure phase
```

This boundary makes the audio implementation testable and allows the UI framework to be replaced without rewriting the timing engine.

## Start here

1. [A tale of two clocks - Chris Wilson](https://web.dev/articles/audio-scheduling)  
   The canonical explanation of accurate musical scheduling in a browser. Use a short JavaScript look-ahead loop to schedule clicks ahead of time on the Web Audio clock; do not fire each click directly from `setInterval()`.

2. [Advanced techniques: creating and sequencing audio - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)  
   A maintained step-sequencer/metronome example implementing the two-clock scheduling pattern. Especially useful for the note queue, tempo changes, and syncing animation to audio.

3. [Web Audio API 1.1 specification](https://webaudio.github.io/web-audio-api/)  
   Normative reference for `AudioContext.currentTime`, `AudioScheduledSourceNode.start()`, `AudioParam` automation, `baseLatency`, `outputLatency`, `getOutputTimestamp()`, and render-quantum behavior.

4. [HTML Standard: timers](https://html.spec.whatwg.org/multipage/timers.html)  
   Explains what `setTimeout()` and `setInterval()` actually guarantee, including the minimum delay for deeply nested timers. Important evidence for treating JS timers as scheduler wake-ups, not as the musical clock.

## Timing, clocks, and scheduling standards

- [High Resolution Time Level 3](https://www.w3.org/TR/hr-time-3/)  
  Defines `performance.now()`, time origins, monotonic versus wall clocks, time coarsening, and the fact that callbacks may be throttled or frozen in a background tab even though the clock itself remains accurate.

- [Page Visibility Level 2](https://www.w3.org/TR/page-visibility-2/)  
  Defines `document.visibilityState` and `visibilitychange`. Use it to make an explicit pause/continue/recovery policy when the metronome is backgrounded.

- [Synchronizing audio and video playback on the web](https://web.dev/articles/audio-output-latency)  
  Practical explanation of `AudioContext.outputLatency` and aligning a visual presentation with when audio actually reaches the output device.

## Web-audio research and white papers

### Post-2020 evidence update

- [Design and Implementation of Music Application using Web Audio API, Part 1: Timer, Metronome, Variable Player (2021)](https://doi.org/10.15119/00003079)  
  - **Evidence type:** Departmental research paper and evaluated cross-platform prototype; the paper is primarily in Japanese and includes an English abstract.
  - **What it brings:** This is the closest match to the product being built. The author implemented a timer, an advanced metronome, and a variable-speed player with JavaScript, React, Web Audio, and WAAClock, using `AudioContext.currentTime` for scheduling. The prototypes were evaluated in standard browsers on Windows, macOS, Android, and iOS and were reported as compatible and practically performant.
  - **Capacity and role in this project:** **Direct feasibility and architecture corroboration.** It supports a web-first implementation and the use of an audio-clock scheduler without a native application or timing server.
  - **Project action:** Keep the timing engine independent of React and schedule against the audio clock. Use the paper as corroboration, not as the implementation specification; the underlying prototypes date from 2017-2020 and do not replace testing on the current browser matrix.
  - **Priority:** High relevance, moderate evidentiary strength. It is a close case study rather than a large modern stress test.

- [The timing mega-study: comparing a range of experiment generators, both lab-based and online (2020)](https://doi.org/10.7717/peerj.9414)  
  - **Evidence type:** Instrumented comparison of timing across laboratory software, browser experiment packages, operating systems, and browsers.
  - **What it brings:** It demonstrates why software timestamps and a successful desktop test are not enough to establish when a stimulus physically reached a user. Browser-based systems could be precise in some conditions, but audio presentation was a weak area and results varied by stack.
  - **Capacity and role in this project:** **External-timing QA reference and counterpoint.** It challenges claims of universal or laboratory-grade timing while leaving the Web Audio look-ahead design intact.
  - **Project action:** Test interval regularity separately from absolute output latency. Use an external recording or loopback path for serious timing validation, and exercise multiple browser/OS/device combinations.
  - **Priority:** MVP validation requirement. Its browser versions and online experiment generators reflect roughly 2019-era systems, and it did not specifically test this project's ahead-scheduled Web Audio graph; its exact lag values must not be presented as current metronome measurements.

- [Realistic precision and accuracy of online experiment platforms, web browsers, and devices (2021)](https://doi.org/10.3758/s13428-020-01501-5)  
  - **Evidence type:** Cross-platform timing validation using realistic consumer devices and input hardware rather than an idealized laboratory computer.
  - **What it brings:** It shows that device, operating-system, browser, and application choices introduce materially different delays and occasional outliers. It complements the timing mega-study by emphasizing the uncontrolled machines people actually use at home.
  - **Capacity and role in this project:** **Real-world test-matrix design.** It supports testing ordinary and slower consumer hardware under background load rather than certifying the app from a single high-end machine.
  - **Project action:** Include physical phones and laptops, low-power mode, CPU/UI load, route changes, and repeated long runs in QA. Record medians, variability, and worst cases rather than reporting only average timing.
  - **Priority:** Adjacent QA evidence. Its experiments focus mainly on visual presentation and response logging, not the regularity of future-scheduled Web Audio beats.

- [REPP: A robust cross-platform solution for online sensorimotor synchronization experiments (2022)](https://doi.org/10.3758/s13428-021-01722-2)  
  - **Evidence type:** Open-source timing method validated through calibration plus laboratory and online tapping experiments.
  - **What it brings:** REPP records the metronome stimulus and a participant's physical taps together through the same microphone path, avoiding the unknown offset between browser timestamps and physical sound. The authors report average latency and jitter within 2 ms for the measurement method, laboratory test-retest reliability of `r = .87`, online reliability of `r = .80`, and concurrent validity of `r = .94`.
  - **Capacity and role in this project:** **Objective tap-along QA method and future analytics reference.** It provides a defensible way to distinguish a steady metronome from device output delay and human anticipation.
  - **Project action:** For development tests, capture emitted clicks and taps on one recording timeline or use an electrical loopback. Do not infer scheduler error directly from keyboard or touch event timestamps. Shipping REPP-style recording is not required for the MVP.
  - **Priority:** High for validation; deferred for user-facing tap scoring.

- [Hi-precision audio in listening tests - also in the browser? (PDF)](https://qmro.qmul.ac.uk/xmlui/bitstream/handle/123456789/26144/28.pdf?isAllowed=y&sequence=1)  
  - **Evidence type:** Browser playback measurement and validation paper.
  - **What it brings:** Demonstrates that nominally identical Web Audio code can produce browser-specific sample-level behavior, particularly for parameter curves and events scheduled at the current instant. It also reports that steady-state rendering works well across browsers and devices and shows that scheduling sufficiently ahead can remove some observed deviations.
  - **Capacity and role in this project:** **Quality-assurance and risk reference.** It prevents the project from treating specification compliance or one successful browser test as proof of identical audio output everywhere.
  - **Project action:** Build repeatable tests for beat interval, drift, missed deadlines, click envelope, and first-beat behavior. Schedule clicks and envelope changes ahead of `currentTime`; test Chromium, Firefox, and Safari on physical desktop and mobile hardware.
  - **Priority:** MVP validation requirement. The paper is older, so its specific browser defects are historical examples rather than claims about current versions.

- [Media Synchronization on the Web / Timing Object model (PDF)](https://www.w3.org/community/webtiming/files/2018/05/arntzen_mediasync_web_author_edition.pdf)  
  - **Evidence type:** Web synchronization model and proposed programming architecture.
  - **What it brings:** Introduces external timing: independent media components follow one authoritative timeline instead of attempting to keep one another synchronized through ad hoc play/pause commands. It distinguishes the clock, timeline position, movement/velocity, control state, and the component that renders against that state.
  - **Capacity and role in this project:** **Transport and state-model reference.** It supports one metronome transport/phase model that the audio scheduler, beat display, and animation observe independently.
  - **Project action:** Model BPM, phase, playing state, and position as authoritative transport state. Let audio and visuals derive their behavior from that state.
  - **Priority:** MVP architectural guidance.

Research that applies only to deferred capabilities is collected in [future.md](future.md).

## Psychoacoustics and human synchronization

- [Less effortful auditory-motor synchronization with low-frequency tones in isochronous sound sequence (2021)](https://doi.org/10.1016/j.neulet.2021.135945)  
  - **Evidence type:** Controlled finger-tapping and pupillometry study with 30 adults, comparing 100 Hz and 1000 Hz tones at 1-second and 2-second inter-stimulus intervals.
  - **What it brings:** Participants aligned more accurately and showed less measured listening effort with the low-frequency tone. This is newer evidence that click pitch, not only timestamp and envelope, can change how easy a pulse is to follow.
  - **Capacity and role in this project:** **Click-voice hypothesis generator.** It supports testing lower-pitched regular beats and a clearly differentiated accent instead of assuming that the sharpest or highest click is always easiest to follow.
  - **Project action:** Compare several short click voices in musician testing and on actual phone speakers. Do not turn the paper's 100 Hz versus 1000 Hz comparison into a universal rule: many phone speakers reproduce 100 Hz poorly, and the study did not compare complete metronome timbres across consumer devices.
  - **Priority:** Useful MVP sound-design experiment, not a fixed requirement.

- [The Effect of Cue Frequency, Modality and Rhythmicity on Finger Tapping Behaviour and Movement-Related Cortical Activity (2025)](https://doi.org/10.1111/ejn.70112)  
  - **Evidence type:** Exploratory EEG and tapping study with 17 participants using auditory and visual cues at 1 Hz and 3.2 Hz, in isorhythmic and polyrhythmic conditions.
  - **What it brings:** Auditory cues supported more accurate synchronization than flashing visual cues, especially at the faster rate; complex auditory cue structure also shifted tapping phase. It reinforces that the audible pulse is primary and that visual motion or flashing is not an interchangeable timing source.
  - **Capacity and role in this project:** **Audio-first interaction and visual-indicator boundary.** The display should follow the audio clock and assist orientation, while the click remains the precision cue.
  - **Project action:** Test the beat indicator at high BPM without letting animation drive or redefine the beat. Keep subdivision and accent sounds perceptually distinct without producing an unnecessarily confusing competing rhythm.
  - **Priority:** Adjacent UX evidence. The sample is small and the experiment is a laboratory neuroscience task, not a comparison of web metronome interfaces.

- [The perceptual centre of a stimulus as the cue for synchronization to a metronome](https://pubmed.ncbi.nlm.nih.gov/8559964/)  
  - **Evidence type:** Controlled human tapping experiments.
  - **What it brings:** Across three experiments, stimulus duration and rise time changed participants' negative asynchrony: taps commonly preceded physical stimulus onset, and longer stimuli or slower attacks reduced that anticipation. The authors conclude that people synchronize to a stimulus's perceptual center rather than merely its first nonzero sample.
  - **Capacity and role in this project:** **Click-sound and UX design evidence.** It explains why two technically on-time sounds can feel differently aligned and why an accent cannot be designed only by changing a buffer timestamp.
  - **Project action:** Give click and accent voices short, controlled, repeatable envelopes. Align their perceived attacks, avoid long or soft fade-ins for precision cues, and include subjective tap-along evaluation alongside timestamp measurements.
  - **Priority:** Directly relevant to MVP click design.

- [Delayed feedback embedded in perception-action coordination cycles results in anticipation behavior](https://pmc.ncbi.nlm.nih.gov/articles/PMC6822724/)  
  - **Evidence type:** Dynamical-systems model evaluated against previously published human tapping data.
  - **What it brings:** Models the common tendency to tap before a metronome and reproduces changes associated with tempo, musical experience, self/partner auditory feedback, and transmission delay. It shows that measured tap offset is partly a property of human prediction and feedback coupling, not simply playback or input latency.
  - **Capacity and role in this project:** **Measurement-interpretation reference.** It explains why subjective tap-along testing cannot treat every early tap as evidence of an audio-engine timing fault.
  - **Project action:** During click evaluation, distinguish human anticipatory behavior from measured scheduler or output-device latency.
  - **Priority:** MVP test interpretation.

## Developer field reports: anecdotal, non-normative evidence

These reports are useful for finding failure modes and test cases. They are not controlled studies, compatibility guarantees, or substitutes for the standards and measured papers above.

- [Chris Wilson's Web Audio metronome repository](https://github.com/cwilso/metronome)  
  - **Reported experience:** Browser power-saving changes once throttled the scheduler's main-thread timer to approximately one callback per second in hidden tabs, so Wilson added a worker to wake the scheduler. The repository now says audible audio may make that workaround unnecessary, but explicitly notes that this assumption has not been retested.
  - **Project use:** Treat background behavior as changeable browser policy. Test the plain look-ahead scheduler first, detect suspension/interruption, and do not add or promise a worker-based background solution without current physical-device evidence.

- [Accurately Timing Sounds In-Browser For A Metronome (Stack Overflow, 2020)](https://stackoverflow.com/questions/62512755/accurately-timing-sounds-in-browser-for-a-metronome)  
  - **Reported experience:** A developer found `setTimeout()` and `setInterval()` too inaccurate for a metronome and susceptible to delays or dropped beats. The practical answer schedules oscillator starts on an `AudioContext` timeline and uses a timer only to replenish future events.
  - **Project use:** This independently reproduces the naive-timer failure that motivates the two-clock design. It adds no measured accuracy claim beyond the formal sources.

- [Loop Supreme: adding a metronome and click (2022)](https://blog.ericyd.com/loop-supreme-part-2-adding-a-metronome/)  
  - **Reported experience:** The author initially kept the interval inside React context, saw two intervals appear under React's development double-mount behavior, and described direct `useInterval` playback as merely seeming “good enough” without scientific testing. Adding Web Audio also exposed the user-gesture requirement.
  - **Project use:** Make `start()` and `stop()` idempotent, keep scheduler ownership outside component lifecycle, and test development and production builds. A UI framework must observe and command the engine, not create the musical clock through renders or effects.

- [Building a polyrhythm metronome (developer write-up, 2021; Japanese)](https://miso-soup3.hateblo.jp/entry/2021/12/14/164208)  
  - **Reported experience:** Look-ahead scheduling proved simpler to implement than it first appeared, but changing tempo exposed a harder problem: already-scheduled audio events could not simply be taken back. The developer used the blunt workaround of closing and recreating the `AudioContext` and was unsure whether it was a good design.
  - **Project use:** Define a short commit horizon and a deliberate tempo-change policy. Track scheduled nodes when cancellation is required; do not destroy the entire audio context for ordinary control changes.

- [Tone.js issue: resuming an `interrupted` audio context (2020)](https://github.com/Tonejs/Tone.js/issues/767)  
  - **Reported experience:** A music-app developer found that Safari and mobile Safari could put audio into an `interrupted` state after events such as an incoming call, browser dialog, or headphone removal. A wrapper that only handled `suspended` did not recover, while direct access to the underlying context did in the reported reproduction.
  - **Project use:** Listen for audio-context state changes and test calls, route changes, dialogs, lock/unlock, and app switching. Keep a visible recovery action available instead of assuming `resume()` covers every lifecycle state.

- [PixiJS Sound issue: audio does not resume after leaving the browser on iOS (2025)](https://github.com/pixijs/sound/issues/278)  
  - **Reported experience:** On iOS 18.3.2, a developer could reproduce silence after switching away from and returning to the browser, including in two library demos; a direct `AudioContext.resume()` attempt did not restore sound in that report. Later commenters report mixed workaround results.
  - **Project use:** Add this exact transition to the mobile test matrix and provide an explicit stop/restart recovery path. Because it is an open issue with anecdotal and conflicting reports, it does not prove that every current iPhone has the defect.

## Browser behavior and deployment notes

- [Web Audio autoplay policy and games](https://developer.chrome.com/blog/web-audio-autoplay)  
  Explains why the `AudioContext` should be created or resumed from a user gesture. Treat autoplay behavior as browser policy, not a scheduling primitive.

- [Making progressive web apps installable - MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)  
  Current installability requirements, manifest fields, and the HTTPS requirement. Installation is optional for the user; unsupported browsers can still use the site normally.

- [CycleTracker: service workers - MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/CycleTracker/Service_workers)  
  A compact example of caching a web-app shell, updating cached assets, and supporting offline use.

- [Web Application Manifest specification](https://www.w3.org/TR/appmanifest/)  
  Normative definition of app name, icons, start URL, display mode, orientation, scope, shortcuts, and theme metadata.

- [Web Audio API best practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)  
  Cross-browser guidance and the requirement to begin or resume audio in response to user interaction.

- [WCAG: audio control](https://www.w3.org/WAI/WCAG21/Understanding/audio-control)  
  Accessibility rationale for user-initiated sound plus obvious stop and volume controls. A metronome should never start automatically on page load.

## Initial compatibility contract

The first release promises a small, dependable baseline on modern, maintained browsers:

- Current Chrome, Edge, Firefox, and Safari on desktop; current Chrome on Android; current Safari on iPhone and iPad.
- Vite's current `baseline-widely-available` output target, without a legacy bundle or obsolete-browser polyfill strategy.
- Older devices are best-effort only. A device may work if it can run the generated standards-based application, but its age does not add it to the release test matrix.
- Mouse, touch, and keyboard operation, with visible focus and semantic native controls.
- An explicit Play button that creates or resumes the audio context.
- Responsive layout usable in portrait or landscape without hover-only interactions.
- No deferred capability is required for the core metronome to function.
- A visible warning or recovery state if the audio context becomes suspended or interrupted.
- No requirement for network access during an active session; the timing engine must be entirely local.

## Design conclusions supported by the reading

- Schedule sound against `audioContext.currentTime`; never use `Date.now()` or a repeating JS timer as the beat clock.
- Use a small recurring wake-up (the common teaching example uses 25 ms) to keep roughly 100 ms of future clicks scheduled. Tune and test those values instead of treating them as universal constants.
- Keep visual animation separate. Consume a queue of scheduled beat times and render with `requestAnimationFrame()` using the audio clock as the source of truth.
- On tempo changes, preserve a clearly defined phase policy and reschedule only events that have not yet been committed to the audio graph.
- Measure jitter, drift, missed scheduler deadlines, and device output latency across browsers, mobile devices, Bluetooth, foreground/background transitions, and CPU load.
- Give clicks a short, consistent attack. Because perceived onset depends on the envelope, do not compare two click sounds solely by their buffer start time.
- Start/resume audio from an explicit Play gesture, and decide deliberately what happens on visibility loss, device sleep, route changes, and `AudioContext` interruption.
