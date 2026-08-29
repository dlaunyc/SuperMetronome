# English translation: Design and Implementation of Music Applications Using the Web Audio API

## Part 1: Timer, Metronome, and Variable-Speed/Pitch Player

**Author:** Kunio Goto, Faculty of Global Liberal Studies, Nanzan University  
**Original publication:** *Academia: Sciences and Engineering, Journal of the Nanzan Academic Society*, Vol. 21, pp. 5-25, March 2021  
**DOI:** [10.15119/00003079](https://doi.org/10.15119/00003079)

> Translator's note: This is a readable English translation of the complete Japanese paper. Section numbering, tables, figure and listing captions, measured values, and references are preserved. Code is language-independent, so formatting has been normalized and Japanese comments have been translated. Apparent typographical errors in the original code are not presented as current best practices. Software versions, browser behavior, and compatibility statements describe the author's 2020-2021 test environment and should not be read as current compatibility guarantees.

## Abstract

The author has developed prototype applications useful for practicing instrumental performance and singing. The work began with a C++ application without a graphical user interface (GUI), followed by an Android version with a GUI and then a Java version with a GUI. Adoption did not spread, however, because installing the Java runtime environment was difficult for general users.

This paper therefore investigates, through prototype development and evaluation, whether compatible applications can be written in JavaScript for the standard web browsers on Windows, macOS, Android, and iOS. The prototype applications, in order of development, were: (1) a presentation timer (2017), (2) an advanced metronome (2018), (3) a variable-speed/pitch audio player (2019), and (4) a percussive/sustained-sound separator (2020). Application 4 is discussed in Part 2.

The prototypes were built using Node.js and React as the development environment. Evaluation showed that this approach can produce applications with compatible and practical performance in standard web browsers. Timing accuracy was achieved with WAAClock, a scheduling library based on the audio clock's current time.

**Keywords:** Web Audio API, JavaScript, music applications

## 1. Introduction

The author has been developing prototype applications useful for practicing instrumental performance and singing. Around 2014, one objective was to separate percussion and sustained sounds in stereo music [11]. A command-line application was completed in C++.

Commands are difficult for general users, so an Android version with a GUI was prototyped by cross-compiling the existing C++ library. It did not operate satisfactorily because insufficient CPU resources caused audio dropouts. Writing a separate program for iOS would also have required too much work, so smartphone development was temporarily abandoned.

A Java version for PCs was then prototyped and confirmed to run comfortably on Linux, Windows, and macOS [8]. The author encouraged acquaintances to use it, but adoption did not spread because installing the Java runtime environment was difficult for general users.

Meanwhile, previously incompatible versions of JavaScript were standardized as ES5 in 2008, making it possible to run the same JavaScript program in most web browsers, including those on smartphones [12]. Modern web browsers also include video and audio playback facilities that can be accessed easily through the Web Audio API [14]. This is a major advantage of writing audio applications in JavaScript.

With percussion/sustained-sound separation as the eventual objective, this paper explains the pitfalls and techniques encountered while developing the preceding JavaScript applications and evaluates their functions and performance.

The applications are, in development order:

1. Presentation timer (2017)
2. Advanced metronome (2018)
3. Variable-speed/pitch audio player (2019)
4. Percussive/sustained-sound separator (2020)

This paper introduces the programming precautions, pitfalls, and techniques involved in applications 1 through 3. Application 4 requires a lengthy explanation involving mathematical analysis with the Fourier transform, so it is presented in Part 2.

Sections 2 and 3 describe the development environment and construction process underlying the research. Sections 4, 5, and 6 respectively describe the programming techniques and experimental evaluations for the presentation timer, advanced metronome, and variable-speed/pitch audio player. The author hopes that these experiences and findings will be useful to developers prototyping similar applications.

Executable programs are available in [8], and source code is available in [7].

## 2. Development environment

Programming was performed mainly on a Windows PC with 16 GB of memory and a dual-core Intel Core i7-7500U at 2.7 GHz, running Ubuntu 18.04 LTS. The software and validation devices are described below.

### 2.1 Software

When the programs were updated for this paper, the principal software versions were:

- Node.js 12.18.3 [15]
- React 16.14.0 [5]
- GitHub for version control and public web hosting
- Any text editor capable of saving UTF-8

Node.js is an environment for executing JavaScript without a web browser and includes development tools such as the npm package manager. React is an open-source library from Facebook and its community for constructing client-side user interfaces in JavaScript.

Using React within the Node.js environment is straightforward. The first step is to install the `create-react-app` module using npm. Creating a project with `create-react-app` generates an application skeleton in a directory with the same name and downloads the required React packages.

**Listing 1. Installing React in Node.js**

```console
npm install -g create-react-app
npx create-react-app projectName
```

In newer versions of `create-react-app`, add the `--template cra-template-pwa` option when a service worker is needed.

React specializes in client-side user interfaces, while Node.js can also be used to write server-side code. This paper does not use Node.js server features. React Native [6] can use device-specific Android and iOS capabilities, but it was not used here for two reasons: the applications do not require device-specific capabilities, and React Native would require the separate Android Studio and Xcode development kits.

Any text editor can be used, including Vim, Windows Notepad, or macOS TextEdit. Microsoft Visual Studio Code, which runs on Windows, macOS, and Linux, is commonly used. Files containing Japanese or any characters outside ASCII must be saved as UTF-8 to match the React environment.

Semicolons at the ends of lines can be inserted automatically during later processing and are therefore optional. The code excerpts in the paper include them. No semicolon is placed after the closing brace of a class, method, or function.

### 2.2 Validation devices

**Table 1. Devices used for testing**

| Device | Operating system | Memory | CPU |
|---|---|---:|---|
| ThinkPad X1 Carbon (2018) | Windows 10 / Ubuntu 18.04 LTS | 16 GB | Dual-core Intel i7-7500U at 2.5 GHz |
| Mac mini (2012) | macOS 10.15.6 | 4 GB | Dual-core Intel i5 at 2.5 GHz |
| Sony SO-02H (2015) | Android 7.0 | 2 GB | Quad-core Qualcomm Snapdragon 810 at 1.5 GHz |
| iPod touch, 6th generation (2015) | iOS 12.4.8 | 1 GB | Dual-core Apple A8 at 1.1 GHz |
| iPhone 6 (2014) | iOS 12.4.8 | 1 GB | Dual-core Apple A8 at 1.1 GHz |

Testing used Chrome on PCs as well as the browsers supplied with each operating system: Firefox on Linux, Microsoft Edge on Windows (by then Chromium-based), Safari on macOS, Chrome on Android, and Safari on iOS. Testing on iPads, recent iPadOS versions, and iOS releases too new for the author's iPhone 6 was delegated to acquaintances. Internet Explorer was excluded because it did not support the Web Audio API.

In principle, the same program ran on all the devices above. During development, however, iOS devices produced the largest number of defects attributable to program bugs. iOS had several distinctive behaviors that could be considered pitfalls. These are summarized in Section 7.

## 3. Program construction procedure

Before discussing the individual applications, this section describes the file layout generated by `create-react-app` and the files that must be changed. The generated files total approximately 300 MB, but the built sample package is only about 550 KB.

The structure of the sample files produced by `create-react-app` changed substantially while the paper was being written. The following description therefore differs from the newest generated structure at that time, but the older style remained compatible and the examples still ran without modification. In the newer style, `serviceWorker.js` was no longer installed automatically.

In `package.json`, change the application name and add the public URL in the `homepage` field. Replace React's `favicon.ico` with the application's own icon. Change the `title` in `index.html` to the application name. In `manifest.json`, change the application name and remove references to unneeded image files. The main program is written in `App.js`, although functions and classes may of course be separated into other files. Styles used by `App.js` are placed in `App.css`.

**Figure 2. Principal files generated by create-react-app**

```text
node_modules/
package.json                  # add "homepage": "URL"
public/
  favicon.ico                 # replace with the application's icon
  index.html                  # change the title
  manifest.json               # modify
  robots.txt
src/
  App.css                     # CSS used by App.js
  App.js                      # main program
  index.css
  index.js                    # edit the last line to enable offline use
  serviceWorker.js
```

### 3.1 Basic program structure

`index.js` is executed first.

**Listing 3. Installed index.js entry point**

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

serviceWorker.unregister(); // use register() to allow offline operation
```

`<App />` instructs React to display the `App` component in the element whose ID is `root`. The markup-like syntax is JSX, an extension of JavaScript. Component names begin with an uppercase letter to distinguish them from HTML tags. `StrictMode` provides more detailed code checking and warnings in development mode.

No changes to `index.js` are required if the component is named `App`. Writing multiple `<App />` elements will display multiple component instances. To allow offline operation, change `unregister()` on the final line to `register()`. The service worker [13] provides a caching proxy function that allows the JavaScript application to operate offline.

The recommended style at the time used an ES6 class derived from `React.Component`. Because ES6 did not operate directly in every browser tested, Babel [1] converted it into compatible JavaScript at runtime.

The minimum required method is `render()`. The inside of its `return()` is written in JSX and may contain variables and function names. State changes cause React to render the affected portion of the UI again.

**Listing 4. Simplified App.js example**

```jsx
import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { buttonStr: 'Start' };
    this.handleButton = this.handleButton.bind(this);
  }

  render() {
    const text = 'Hello';
    return (
      <div className="App">
        <hr />
        {text}<br />
        <button
          name="startStop"
          value={this.state.buttonStr}
          onClick={this.handleButton}
        >
          {this.state.buttonStr}
        </button>
        <hr />
      </div>
    );
  }

  handleButton(event) {
    if (event.target.value === 'Start') {
      this.setState({ buttonStr: 'Stop' });
    } else if (event.target.value === 'Stop') {
      this.setState({ buttonStr: 'Start' });
    }
  }
}

export default App;
```

The `className` JSX property selects a class defined in `App.css`. `this.state.buttonStr` is declared in the constructor. Changing it causes React to render the changed UI. `onClick={this.handleButton}` specifies the method invoked when the button is clicked. State must be changed with `setState()`, not direct assignment.

The author initially struggled with the following issues:

- `setState()` returns before the state update has completed. Code that immediately reads the supposedly updated value may therefore behave unexpectedly.
- User-defined methods cannot automatically refer to the intended `this`. Bind the method in the constructor with `.bind(this)`, or append `.bind(this)` to the function.
- In development mode, the constructor may run multiple times. The author discovered this while counting instances with a static class variable.

**Listing 5. Simplified App.css example**

```css
.App {
  text-align: left;
  max-width: 375px;
  margin: 0 auto;
  border: 1px solid #832420;
  padding: 30px;
  cursor: pointer;
}
```

The width was limited to 375 pixels for smartphone screens. `cursor: pointer` is unnecessary in this simple example, but at the time it was sometimes recommended when iOS failed to recognize a click or tap.

### 3.2 Execution and debugging

Development mode starts with `npm start`. This launches a local web server on TCP port 3000 and opens the program in the default browser. Debugging information is available as follows:

- Syntax errors appear in the terminal running `npm start`. Edits made while the process continues are reflected immediately.
- Runtime errors appear in both the terminal and the browser.
- Runtime warnings and `console.log()` output appear in the browser console.
- JavaScript VM and service-worker memory are visible in browser developer tools.
- Total memory used by the application's browser tab is visible in the task manager.

Console facilities on Android and iOS devices were absent or inconvenient, so the devices were connected to a PC by USB and inspected through the desktop browser's development tools. React development add-ons were also available for PC browsers.

Run `npm run build` to package a completed program. Copy the resulting `build/` directory to the page specified by `homepage` in `package.json`. For example, for `https://username.github.io/demo`, rename the copied `build` directory to `demo`.

## 4. Presentation timer

The presentation timer shown in Figure 6 was developed as the first prototype. In addition to counting down, it plays sounds for the preliminary bell, the main bell, and the end of the question period. The defaults are a preliminary bell one minute before the end, the main bell at five minutes, and the end of questions after an additional three minutes, at eight minutes. Prepared MP3 files play at the specified times.

The Start button also serves as Pause and Continue, and its label changes through those states. Reset restores the initial state.

The JavaScript consists of approximately 400 lines in `App.js` and 50 lines of helper functions in `buffer-loader.js`. The built application package is 1 MB, including 480 KB of audio samples.

**Figure 6. Presentation timer**

### 4.1 AudioContext

For Web Audio, first create an `AudioContext` instance in `componentDidMount()`. Only one context and one clock are normally needed, so the author used global variables. For compatibility with older browser implementations, the program falls back to `webkitAudioContext` when `AudioContext` is unavailable.

An instance of WAAClock is also created for scheduling. WAAClock [17] implements the scheduling approach described in [19]. `OfflineAudioContext`, used for fast processing without playback, is discussed in Part 2.

**Listing 7. Creating AudioContext and WAAClock instances**

```js
import WAAClock from 'waaclock';

window.AudioContext = window.AudioContext || window.webkitAudioContext;
let context;
let clock;

class App extends Component {
  componentDidMount() {
    context = new window.AudioContext();
    clock = new WAAClock(context);
  }
}
```

### 4.2 Loading and playing audio files

Loading an audio file was unexpectedly difficult. A user-selected local file can be loaded easily with `<input type="file">`, but the presentation timer needs to load a bundled file directly from `App.js`. Because of cross-origin security restrictions, audio addressed with a `file://` URL cannot be read.

The program sends an HTTP GET request for the local application resource, receives the response as an `ArrayBuffer`, and decodes it with `AudioContext` into an `AudioBuffer`. The buffer includes audio parameters such as sample rate and linear PCM data.

In the React build environment, an audio resource must be placed in `src` or one of its subdirectories and imported. The built URL includes the configured `homepage` path and a hash added to prevent filename collisions, so the request is made to the application's origin server.

**Listing 8. Loading an audio file**

```js
import hotel from './hotel.mp3';

let sound;
const request = new XMLHttpRequest();
request.open('GET', hotel, true);
request.responseType = 'arraybuffer';
request.onload = function () {
  context.decodeAudioData(
    request.response,
    function (buffer) { sound = buffer; },
    function (error) { /* omitted */ }
  );
};
request.send();
```

To play the prepared `AudioBuffer`, create an `AudioBufferSourceNode`, assign the buffer, connect it to `context.destination`, and start it. A source node is disposable; the specification allows its memory to be released after playback completes.

**Listing 9. Playing an AudioBuffer**

```js
const source = context.createBufferSource();
source.buffer = sound;
source.connect(context.destination);
source.start();
```

In general, `start()` accepts a start time (`when`), an offset into the buffer, and a playback duration. A future start can be specified relative to the audio context, for example `context.currentTime + 3.0`. `currentTime` is a read-only, double-precision count of seconds since the context was created.

Gain control and custom processing scripts can be inserted before `context.destination`. Looping and playback-rate changes are also available and are used in later examples.

### 4.3 Scheduling with the audio clock

The timer must update its displayed time once per second. This could be implemented with JavaScript's `setInterval()`, but pausing partway through a second would require cancelling the interval, using `setTimeout()` to wait for the remaining fraction after Continue, and then restarting the one-second repetition. JavaScript clocks are also known to be inaccurate.

By contrast, `AudioContext.currentTime` has the resolution of the audio hardware's sample clock. The context can be paused and resources released with `context.suspend()`, then restarted with `resume()`.

Repeating schedules are cumbersome with `AudioContext` alone. WAAClock makes them easier by providing repeated execution and event registration based on `currentTime`. The theoretical background is the scheduling article cited by WAAClock's author [19]. WAAClock was therefore used to implement the presentation timer accurately.

At the time of writing, Chrome had changed its policy so audio could not begin automatically before a user interaction. The author had also found through experience that iOS required the initial playback to follow user interaction, although this behavior was not then clearly documented. If necessary, the Start action could play a short silent buffer to unlock audio.

Pausing consists of `context.suspend()` plus changing the button label to Continue. Continuing consists of `context.resume()` plus changing the label to Pause.

**Listing 10. Periodic execution with WAAClock**

```js
if (context.state === 'suspended') context.resume();
this.setState({ timerStyle: { color: 'blue' } });
this.params.beginTime = context.currentTime;

this.timerEvent = clock.callbackAtTime(
  function () {
    this.processTimer(); // update remaining time and play notification sounds
  }.bind(this),
  context.currentTime
)
.repeat(1.0)
.tolerance({ early: 0.1, late: 0.1 });

this.setState({ startButtonStr: 'Pause' });
```

### 4.4 Results

The built application was run in Chrome on Ubuntu Linux and its time deviation was recorded.

**Table 2. Timer accuracy**

| Point | Start | 4 minutes | 5 minutes | 8 minutes |
|---|---:|---:|---:|---:|
| Recorded offset | 0 s | -0.04 s | -0.05 s | -0.05 s |

The timer was 40 ms early after the first four minutes. It changed little thereafter and was 50 ms early at eight minutes. A 50 ms error over several minutes is acceptable for a presentation timer. The author believed the cause was the delay between pressing Start and reflecting that event in the initial display. The metronome in Section 5, which produces sound periodically, was used to investigate this further and to compare PCs with smartphones.

Memory usage was measured through Chrome's task manager and developer tools.

**Table 3. Presentation timer memory use**

| State | Browser tab | JavaScript VM | Service worker |
|---|---:|---:|---:|
| Initial | 38 MB | 7.0 MB | 1.7 MB |
| Running | 40 MB | 7.7 MB | 1.7 MB |

The MP3 samples total 480 KB, equivalent to about 3.9 MB as linear 16-bit, 44.1 kHz WAV data. They are decoded into Float32 linear PCM in the program, occupying approximately 8 MB of the tab's memory. Total memory use of 40 MB was not problematic and did not grow significantly with time.

In Chrome, however, objects no longer referenced after Stop were not immediately reclaimed. Restarting increased tab memory, although even several repetitions reached only about 80 MB and did not prevent operation. The same apparent leak was not observed in Firefox.

## 5. Metronome

The next prototype was an advanced metronome. Advanced metronomes were common as smartphone apps but surprisingly scarce on PCs. The main `App.js` file grew to approximately 1,500 lines, but the runnable package, including sound files and JSON rhythm patterns, remained a compact 1.5 MB compared with Android and iOS applications.

Figure 11 shows the user interface. The left side shows the basic controls with advanced features hidden; the right side shows the advanced controls. The illustrated interface is English, but labels appear in Japanese when the browser language is Japanese. The JP button can also switch the interface to Japanese.

**Figure 11. Metronome controls and advanced features**

### 5.1 Functions

Basic functions:

- **Metronome click:** Select from 32 meter patterns, including 4/4, 5/4, 7/4, and swing.
- **Sound:** Select from 20 timbres. The default uses three cowbell samples at different pitches.
- **Drum patterns:** Select from 262 one- or two-bar patterns.
- **Voice:** Add spoken counts such as "one" and "two" to the click or drum sounds.
- **BPM:** Adjust tempo using a slider, plus/minus buttons, tap tempo, or a selector with 0.1 BPM fine adjustment.
- **Practice timer:** Specify a duration in time or number of measures.
- **Volume:** Adjust application playback volume, independently of device volume.

The click and drum sounds are played from 50 short MP3 sample files. Drum playback is normally associated with a rhythm machine, but it was included because the prototype was intended as a metronome for drummers. All voice, practice-timer, and playback schedules use the Web Audio API and WAAClock. Drum patterns require high timing precision because multiple audio files may play simultaneously.

Advanced functions:

- **Swing adjustment:** A value of 1.5 is straight; 2.0 is ordinary triplet swing with the middle note omitted.
- **Automatic tempo increase/decrease:** Raise or lower the tempo after a specified number of measures, mainly for drum practice.
- **Random mute:** Insert silent measures according to a specified probability, mainly for timekeeping practice.
- **Even-note volume:** Reduce the level of beats 0, 2, and 4, described here as downbeats, for training.
- **Set lists and song lists:** Record concert or practice order, meter, and tempo.
- **Custom loops:** Connect measures with different meters for practicing music with changing time signatures.

Swing adjustment and automatic tempo changes required particular care in playback scheduling and are discussed in Section 5.3.

Set lists and song lists are serialized to JSON and stored in the browser cache with `localStorage.setItem()`, then restored with `localStorage.getItem()` and `JSON.parse()`. They are lost if the browser cache is cleared. To use them on another device, they must be exported as local files. JavaScript cannot write directly to arbitrary local files because of browser security restrictions, but a browser download can be generated. That method is described in Section 6.

### 5.2 Rhythm-pattern representation

Rhythm patterns are represented as JSON text corresponding to the staff notation in a drum instruction book. Listing 12 shows one click pattern and one drum pattern.

**Listing 12. Rhythm-pattern examples**

```json
[
  {
    "name": "8/8 swing",
    "type": "clicks",
    "numerator": 8,
    "denominator": 8,
    "swingVal": 2.0,
    "pattern": [
      { "note": "click0", "values": [9, 0, 0, 0, 0, 0, 0, 0] },
      { "note": "click1", "values": [0, 0, 7, 0, 7, 0, 7, 0] },
      { "note": "click2", "values": [0, 7, 0, 7, 0, 7, 0, 7] },
      { "note": "voice",  "values": [1, 0, 2, 0, 3, 0, 4, 0] }
    ]
  }
]
```

```json
[
  {
    "name": "pop001",
    "type": "drumkit",
    "default": true,
    "numerator": 8,
    "denominator": 8,
    "pattern": [
      { "note": "hihatClose",   "values": [3, 3, 3, 3, 3, 3, 3, 3] },
      { "note": "snareOpenRim", "values": [0, 0, 8, 0, 0, 0, 8, 0] },
      { "note": "bass",         "values": [7, 0, 0, 0, 7, 0, 0, 0] },
      { "note": "voice",        "values": [1, 0, 2, 0, 3, 0, 4, 0] }
    ]
  }
]
```

`name` is displayed in the pattern selector. `type` identifies a click or drum kit. `denominator` divides a whole note; when it is 8, each value represents an eighth note. `numerator` is the number of events in the measure.

For swing or shuffle, `swingVal` specifies the relationship between alternating intervals. A value of 1.5 is straight, and 2.0 represents full swing based on a triplet with the middle event omitted. Patterns without swing omit `swingVal`, although the UI can change the swing amount during playback.

For click patterns, `note` contains `click0`, `click1`, or `click2`, whose actual sound combination is selected at runtime. For drum patterns, `note` contains the instrument name. Each non-voice `values` entry specifies amplitude from 0 through 9; zero is silent. In the voice part, numbers represent spoken counts such as one, two, three, and four when voice is enabled. Samples were prepared through eight. The male voice is the author's; the female voice was generated using a free text-to-speech website. Drum samples came from the author's acoustic drums and from an old synthesizer whose samples required no license.

### 5.3 Playback scheduling

The Start/Stop button first resumes the `AudioContext` when its state is suspended. The original code retained, but commented out, an older iOS workaround that played a short silent buffer immediately after a UI event. Resuming the context for Chrome had made that workaround unnecessary in the author's test environment, although it was retained in case it was needed elsewhere. The author interpreted both policies as user-protection mechanisms preventing audio before interaction.

**Listing 13. AudioContext activation**

```js
startStopDrums(event) {
  if (context.state === 'suspended') context.resume();

  /* Older iOS unlock workaround:
  const buffer = context.createBuffer(1, 1, 22050);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
  */
}
```

The playback schedule creates and starts a WAAClock. `notesPerMin` converts BPM, normally expressed in quarter notes, to the selected subdivision. For example, at 120 BPM a quarter note lasts 0.5 seconds. In the JSON pattern, `1 / denominator` is the length of one event and `numerator` is the number of events per measure.

The loop registers a `playPattern()` callback for each event in the measure. `repeat()` repeats it once per measure. `tolerance()` specifies acceptable early and late execution. If `late` is too small, execution may be skipped; this program used 0.1 seconds for both values.

**Listing 14. Registering note playback schedules**

```js
clock = new WAAClock(context);
clock.start();

const notesPerMin = this.state.bpm * (this.params.denominator / 4);

for (let note = 0; note < this.params.numerator; note++) {
  const event = clock.callbackAtTime(
    function (event) {
      this.playPattern(event.deadline);
    }.bind(this),
    this.nextTick(note)
  )
  .repeat((this.params.numerator * 60.0) / notesPerMin)
  .tolerance({ early: 0.1, late: 0.1 });

  this.tickEvents[note] = event;
}
```

Each returned event retains the callback and its deadline on the `currentTime` timeline. Because cancellation requires the events, the program stores one for each subdivision in `tickEvents`.

To stop, it calls `clear()` on each registered event, empties `tickEvents`, and clears the practice timer. A tempo change uses WAAClock's `timeStretch()` to modify the registered schedules.

**Listing 15. Cancelling or stretching the schedule**

```js
if (event.target.name === 'stop') {
  for (const tickEvent of this.tickEvents) {
    tickEvent.clear();
  }
  this.tickEvents.splice(0, this.tickEvents.length);
  this.handleTimer({ target: { name: 'clearTimer' } });
  return;
}

clock.timeStretch(
  context.currentTime,
  this.tickEvents,
  this.state.bpm / newBpm
);
```

`nextTick()` extends the WAAClock demo by recalculating time relative to the latest start and by applying swing. An odd-indexed event receives an offset proportional to `swingVal - 1.5`.

**Listing 16. Event-time adjustment**

```js
nextTick(noteIndex) {
  const noteInterval = 60.0 /
    (this.state.bpm * this.params.denominator / 4);
  const barInterval = noteInterval * this.params.numerator;
  const currentTime = context.currentTime;
  const relativeTime = Math.max(
    0,
    currentTime - this.params.startTime
  );
  const currentBar = Math.floor(relativeTime / barInterval);

  let offset = 0;
  if (this.params.swing && noteIndex % 2 === 1) {
    offset = ((this.state.swingVal - 1.5) / 1.5) * noteInterval;
  }

  return this.params.startTime + offset +
    currentBar * barInterval + noteInterval * noteIndex;
}
```

For drum playback, the pattern array is traversed by instrument. The entry at the current position supplies a volume from 0 to 9. A separate gain node sets each instrument's level, multiplied by the master UI volume. When the value is zero, node creation and playback are skipped.

**Listing 17. Drum-kit playback**

```js
if (currentPattern.type === 'drumkit') {
  for (let i = 0; i < currentPattern.pattern.length - 1; i++) {
    const current = currentPattern.pattern[i];
    if (current.values[count] === 0) continue;

    source[i] = context.createBufferSource();
    source[i].buffer = sound[current.note];
    source[i].connect(gainNode[i]);
    gainNode[i].connect(context.destination);
    gainNode[i].gain.value =
      master * parseInt(current.values[count], 10) / 9.0;
    source[i].start(deadline);
  }
}
```

Other advanced features required additional techniques, but they are outside the paper's main subject.

### 5.4 Performance

#### 5.4.1 Memory use

Chrome memory use was measured in the same way as for the presentation timer.

**Table 4. Metronome memory use**

| State | Browser tab | JavaScript VM | Service worker |
|---|---:|---:|---:|
| Initial | 44 MB | 6.5 MB | 1.8 MB |
| Playing | 48 MB | 8.0 MB | 1.8 MB |

As with the timer, repeated stops and restarts increased Chrome tab memory. Chrome and Edge on Ubuntu showed the same tendency.

#### 5.4.2 Timing accuracy

For timing comparisons, the metronome used the same clave sample for every event. At 240 BPM in 4/4, quarter-note, eighth-note, and sixteenth-note patterns were each recorded for 300 seconds. Metronomes are normally used with quarter notes, and 240 BPM quarter notes occur only in fast jazz. Eighth and sixteenth notes were added to investigate the application's limits.

Figure 18 shows waveforms at the beginning and end of a five-minute eighth-note run beginning exactly at ten minutes. Systems are shown in this order: Ubuntu Firefox, Ubuntu Chrome, Windows 10 Edge, Windows 10 Chrome, macOS Safari, macOS Chrome, Android Chrome, and iOS Safari.

In Ubuntu Firefox, the first sound was late. Playback began approximately correctly in the other browsers. About 0.1 seconds nevertheless elapsed between pressing Start and hearing the first sound, which made it difficult to start the metronome in synchronization with music that was already playing. The author states that this delay could not be eliminated in that implementation.

The practice timer was configured to stop playback at 300 seconds. Four browsers did not stop in time and played one extra event. Android stopped more than two seconds late. Possible causes were insufficient processing power in the tested phone and a slow clock in its audio hardware.

Onsets were detected with aubio's `aubioonset` command.

**Table 5. Metronome timing accuracy over 300 seconds**

| Browser | 4 events/s | 8 events/s | 16 events/s | Dropped events |
|---|---:|---:|---:|---:|
| Ubuntu Firefox | -0.001 s | +0.002 s | +0.255 s | 0 |
| Ubuntu Chrome | +0.001 s | -0.001 s | -0.000 s | 1 |
| Windows 10 Edge | +0.021 s | +0.001 s | +0.021 s | 0 |
| Windows 10 Chrome | +0.001 s | +0.023 s | -0.001 s | 0 |
| macOS Safari | -0.001 s | +0.001 s | -0.000 s | 0 |
| macOS Chrome | +0.003 s | +0.001 s | +0.000 s | 0 |
| Android Chrome | +0.741 s | +1.698 s | +2.581 s | 14 |
| iOS Safari | +0.004 s | +0.002 s | +0.002 s | 0 |

Firefox and Android, which showed problems in Figure 18, ended the 16-event/s test 0.255 seconds and 2.581 seconds late respectively. The author nevertheless judged Android practically adequate for ordinary quarter-note metronome use.

Drum patterns commonly use eighth notes up to approximately 180 BPM and sixteenth notes up to approximately 120 BPM, so the 240 BPM eighth-note result was examined more closely. Figure 19 plots offset from the expected time and the interval between eighth notes, whose theoretical value is 0.125 seconds, on Windows 10 Edge.

The offset was below 2.5 ms and was judged inaudible in performance. By comparison, the paper notes that skilled performers can perceive about 20 ms, roughly the time sound takes to travel seven meters through air, while commercial digital wireless guitar systems may have more than 2 ms of latency. Musicians are especially sensitive to variation between clicks. Measured intervals on Edge were within `0.125 +/- 0.0025` seconds, for a maximum interval variation of 5 ms.

The author concluded that every tested device offered adequate performance for metronome use at the intended tempos. The particular Android phone became inaccurate with very fast rhythm patterns, and Ubuntu Firefox was late especially on the first sound.

## 6. Variable-speed/pitch player

The application's main functions are changing the speed and pitch of loaded audio. Intended uses include changing tempo or key for singing and instrumental practice and slowing playback for transcription. Additional features include partial looping (A-B repeat) and saving the processed audio.

These features are common in music recorders and digital audio workstations, but free PC software that made them easy to use was relatively scarce. Amazing Slow Downer was a common paid product in English-speaking markets and was also sold for Windows, macOS, Android, and iOS. Its feature page did not appear to describe faster-than-normal playback.

The speed and pitch processing itself uses the existing `soundTouchJS` library [2], so the paper omits its algorithmic details and focuses on file loading, playback control, and saving.

`AudioBufferSourceNode.playbackRate` can change playback speed, but changing the rate also changes pitch. A separate technique is needed to change speed while preserving pitch. `soundTouchJS` is Steve "Cutter" Blades's JavaScript implementation of Olli Parviainen's SoundTouch Audio Processing Library [16]. SoundTouch has been used in many programs, including DAWs such as Sonar and REAPER, which supports its practical utility. It uses an algorithm similar to waveform-similarity overlap-add (WSOLA) [18]. Research on musical time-scale modification has continued, including the review in [4]. Combining time-scale modification with playback-rate changes also permits pitch shifting.

**Figure 20. Variable-speed/pitch player**

### 6.1 Loading and exporting files

An HTML input with `type="file"` opens a browser file picker restricted to audio MIME types. Selecting a file invokes `loadFile()`. The selected file is read with the standard `FileReader` API as an `ArrayBuffer` and decoded into an `AudioBuffer`.

Only local files can be read directly. Files in iCloud, Google Drive, or similar cloud storage can be used when they are made available offline through the operating system.

**Listing 21. Loading an audio file selected by the user**

```jsx
<input
  type="file"
  name="loadFile"
  accept="audio/*"
  onChange={loadFile}
/>
```

```js
const reader = new FileReader();
reader.onload = function () {
  audioCtx.decodeAudioData(
    reader.result,
    function (audioBuffer) {
      this.params.audioBuffer = audioBuffer;
    }.bind(this),
    function (error) { /* omitted */ }
  );
}.bind(this);
reader.readAsArrayBuffer(file);
```

For export, `audiobuffer-to-wav` converts the Float32 samples in an `AudioBuffer` into WAV data with a WAV header. The program wraps the data in a Blob with MIME type `audio/vnd.wav`, then uses FileSaver.js [9] to invoke a browser download. The output filename includes the selected playback speed and pitch.

**Listing 22. Exporting an audio file**

```js
import { saveAs } from 'file-saver';
import * as toWav from 'audiobuffer-to-wav';

fakeDownload(audioBuffer) {
  const words = this.params.filename.split('.');
  const outFileName = words[0]
    + '&s' + parseInt(this.state.playSpeed, 10)
    + '&p' + parseInt(this.state.playPitch * 100, 10)
    + '.wav';

  const blob = new Blob(
    [toWav(audioBuffer)],
    { type: 'audio/vnd.wav' }
  );
  saveAs(blob, outFileName);
}
```

The paper describes FileSaver.js as temporarily acting like a local web server that offers the file in response to the browser's download operation. On iOS at the time, a downloaded WAV Blob would not play automatically; its filename had to be changed after download.

### 6.2 Custom audio processing

Custom Web Audio processing had originally been provided by `ScriptProcessorNode`, which had been deprecated since August 2014 in favor of AudioWorklet. `ScriptProcessorNode` runs processing on the main thread, so heavy computation can cause audio dropouts or delayed UI response. `AudioWorkletNode` runs in the audio rendering environment and does not share ordinary UI execution in the same way.

A worklet version of soundTouchJS [3] existed, but AudioWorklet was not implemented in the versions of Safari on macOS and iOS used for this research. The prototype therefore used the deprecated `ScriptProcessorNode`. This is a historical constraint from the 2020-2021 test environment, not a current recommendation.

In either case, a custom-processing node is inserted between a source and the destination, like the gain nodes in Listing 17. In soundTouchJS, the processor is created inside the library. Playback begins when the processing graph is connected, rather than through the ordinary `source.start()` sequence. It also does not stop automatically when it reaches the end of the source, so explicit cleanup is required.

The program creates a `PitchShifter` with the audio context, source data, and a power-of-two buffer size. A relatively large buffer of 16,384 samples was chosen to reduce dropouts and callback frequency. Tempo is set as a percentage, while pitch is specified in semitones using the equal-tempered ratio `2^(semitones / 12)`. Both can be changed from the UI during playback.

The playback callback calculates the current position and stores it in React state so the UI can update. At the end, it disconnects and stops the shifter. A `PitchShifter` instance is disposable and a new one is created for the next playback.

**Listing 23. PitchShifter playback**

```js
import { PitchShifter } from 'soundtouchjs';

const bufferSize = 16384;
if (shifter) {
  shifter.disconnect();
  shifter.off();
  shifter = null;
}

shifter = new PitchShifter(
  audioCtx,
  partialAudioBuffer,
  bufferSize
);
shifter.tempo = this.state.playSpeed / 100.0;
shifter.pitch = Math.pow(2.0, this.state.playPitch / 12.0);
const duration = shifter.formattedDuration;

shifter.on('play', detail => {
  const currentPos = parseFloat(timeA) + parseFloat(detail.timePlayed);
  this.setState({
    playingAt: currentPos,
    playingAtSlider: currentPos
  });

  if (detail.formattedTimePlayed >= duration) {
    shifter.disconnect();
    shifter.off();
    shifter = null;
  }
});

shifter.connect(gainNode);
gainNode.connect(audioCtx.destination);
```

Processed audio would normally be generated with `OfflineAudioContext`, avoiding audible playback. `PitchShifter` did not operate with `OfflineAudioContext`, so the prototype added another `ScriptProcessorNode` to capture processed samples during real-time playback.

The saver node copies each callback's input samples unchanged to both its output buffer and a growing export buffer. Copying to the output is necessary because processing stops without an audio output. The SoundTouch processor and saver therefore place two `ScriptProcessorNode` instances in series. In this connection order the gain node is last, so the UI playback volume does not alter the saved signal.

When processing completes, the program disconnects the saver and shifter and calls `fakeDownload()` with the accumulated export buffer.

**Listing 24. Capturing processed output with ScriptProcessorNode**

```js
saverNode = audioCtx.createScriptProcessor(
  bufferSize,
  channels,
  channels
);

this.params.exportBuffer = audioCtx.createBuffer(
  channels,
  parseInt(
    audioBuffer.length * (100 / this.state.playSpeed),
    10
  ) + bufferSize,
  audioBuffer.sampleRate
);

let base = 0;
const exportBuffer = this.params.exportBuffer;

saverNode.onaudioprocess = function (event) {
  const inputBuffer = event.inputBuffer;
  const outputBuffer = event.outputBuffer;

  for (let channel = 0;
       channel < inputBuffer.numberOfChannels;
       channel++) {
    const inputData = inputBuffer.getChannelData(channel);
    outputBuffer.copyToChannel(inputData, channel, 0);
    exportBuffer.copyToChannel(inputData, channel, base);
  }
  base += inputBuffer.length;
}.bind(this);

shifter.on('play', detail => {
  if (detail.formattedTimePlayed >= shifter.formattedDuration) {
    saverNode.disconnect();
    shifter.off();
    shifter.disconnect();
    shifter = null;
    this.fakeDownload(this.params.exportBuffer);
  }
});

shifter.connect(saverNode);
saverNode.connect(gainNode);
gainNode.connect(audioCtx.destination);
```

### 6.3 Playback controls

`AudioContext` provides suspend, resume, and simple looping, but not rewind or fast-forward. Those facilities were also unavailable through the `PitchShifter`. The prototype implements them by copying the desired playback range from the original audio into a separate `AudioBuffer`, then processing that buffer:

- **Pause and resume:** Start a new playback buffer from the previous stopping position.
- **Fast-forward and rewind:** Select a new starting position with the timeline slider and play the data after it.
- **A-B repeat:** Repeatedly play the range between positions A and B selected by buttons.
- **Loop interval:** Play a specified length of silence between repetitions.

### 6.4 Performance

The source code totals 753 lines and the built package is 656 KB. `soundTouchJS` is written entirely in JavaScript and consumes a meaningful amount of CPU for custom audio processing, but it ran without playback problems in all browsers prepared for the study.

Memory was measured in Chrome on Windows. Linux and macOS Chrome used approximately the same amount.

**Table 6. Variable-speed/pitch player memory use**

| State | Browser tab | JavaScript VM | Service worker |
|---|---:|---:|---:|
| Initial | 33 MB | 5.3 MB | 2.0 MB |
| Audio loaded | 136 MB | 5.4 MB | 2.0 MB |
| First A-B playback | 235 MB | 7.1 MB | 2.0 MB |
| Play all / Save | 235 MB | - | - |
| Repeated pause/play | 320 MB and increasing | - | - |

The service worker remained at approximately 2 MB for the cached application. JavaScript VM use rose from 5.3 MB to 7.1 MB and then fluctuated, but did not exceed 8 MB during the experiments.

The browser tab consumed much more memory. It began at 33 MB and rose to 136 MB after loading a music file because decoded audio is stored in memory as 32-bit floating-point samples.

The test used a 270-second, 44.1 kHz stereo MP3 file. It occupied 4,328,685 bytes as MP3, approximately 4 MB, but 51,936,044 bytes, approximately 50 MB, as WAV. Storing it internally as Float32 consumed approximately twice the WAV size, about 100 MB.

The first A-B playback consumed another approximately 100 MB because the custom-processing library duplicated the samples in an internal buffer. Play All/Save behaved similarly. A second A-B playback consumed another approximately 100 MB, and each repetition added roughly the same amount. This indicated that the partial copy used for processing from A to B was not reclaimed after soundTouchJS completed.

The symptom did not occur in Firefox, so the author inferred that it resulted from Chrome's garbage-collection behavior or a Chrome bug in the tested version.

## 7. Conclusion

The paper developed three music applications using the Web Audio API, with Node.js and React as the development environment. Through operational tests and performance evaluation, the author concluded that this approach could produce compatible applications with practical performance in the standard web browsers on Windows, macOS, Android, and iOS. Timing accuracy was achieved with WAAClock, which schedules against the audio clock's current time. Executable versions and source code were made available in [7] and [8].

Trial-and-error development revealed the following precautions and required techniques:

1. **React state changes are not immediate.** Do not write logic that assumes a state change has completed synchronously.
2. **iOS had distinctive behaviors.** These included needing pointer/cursor-related adjustments for some tap handling, strict memory behavior in which an array-index bug could cause fatal malfunction, and awkward file-save interactions for downloaded Blob data.
3. **Audio did not begin without a click or tap.** This applied to iOS and the contemporary versions of Chrome because of user-activation policies.
4. **Custom audio processing required compatibility compromises.** Because AudioWorklet was missing from some tested browsers, the prototype temporarily used `ScriptProcessorNode`, even though it had been deprecated in 2014.
5. **Local file input and output were restricted for security.** The applications implemented user-mediated selection and browser download operations instead of unrestricted filesystem access.
6. **Memory use had to be reduced and tested in each browser.** Browser implementations behaved differently.

Future work concerned the performance of CPU- and memory-intensive custom audio processing and more detailed use of AudioWorklet and `OfflineAudioContext`. These subjects were to be discussed in Part 2, covering the 2020 percussive/sustained-sound separator.

The paper also notes an unresolved business issue outside the research scope: how to sell a JavaScript application. A binary program can be downloaded and protected with a license key. These web applications can be cached but are not normally saved as executable files, and their readable source makes unauthorized use difficult to prevent with an ordinary license key.

## References

1. Babel Team. "Babel." [https://babel.io/](https://babel.io/). Accessed January 31, 2021.
2. Blades, S. C. "SoundTouchJS." [https://github.com/cutterbl/SoundTouchJS](https://github.com/cutterbl/SoundTouchJS). Accessed January 31, 2021.
3. Blades, S. C. "SoundTouchJS Audio Worklet." [https://github.com/cutterbl/soundtouchjs-audio-worklet](https://github.com/cutterbl/soundtouchjs-audio-worklet). Accessed January 31, 2021.
4. Driedger, J., and M. Mueller. "A Review of Time-Scale Modification of Music Signals." *Applied Sciences* 6(2), 57 (2016).
5. Facebook Open Source. "React." [https://reactjs.org/](https://reactjs.org/). Accessed January 31, 2021.
6. Facebook Open Source. "React Native." [https://reactnative.dev/](https://reactnative.dev/). Accessed January 31, 2021.
7. Goto, K. "goto920 GitHub Repository." [https://github.com/goto920/](https://github.com/goto920/). Accessed January 31, 2021.
8. Goto, K. "KG's App Demos." [https://goto920.github.io/](https://goto920.github.io/). Accessed January 31, 2021.
9. Grey, E. "FileSaver.js." [https://github.com/eligrey/FileSaver.js](https://github.com/eligrey/FileSaver.js). Accessed January 31, 2021.
10. Jam3. "audiobuffer-to-wav." [https://github.com/Jam3/audiobuffer-to-wav](https://github.com/Jam3/audiobuffer-to-wav). Accessed January 31, 2021.
11. Kurauchi, Shin, and Daiki Masuda. "Extraction of the Drum Part from Stereo Multi-Instrument Music." Abstracts of 2014 Graduation Theses, Faculty of Information Sciences and Engineering / Faculty of Mathematical Sciences and Information Engineering, Nanzan University (2015). [PDF](https://www.st.nanzan-u.ac.jp/info/gr-thesis/2014/11se144.pdf).
12. MDN Web Docs. "JavaScript." [https://developer.mozilla.org/en-US/docs/Web/JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript). Accessed January 31, 2021.
13. MDN Web Docs. "Service Worker API." [https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API). Accessed January 31, 2021.
14. MDN Web Docs. "Web Audio API." [https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). Accessed January 31, 2021.
15. OpenJS Foundation. "Node.js." [https://nodejs.org/en/](https://nodejs.org/en/). Accessed January 31, 2021.
16. Parviainen, O. "SoundTouch Audio Processing Library." [https://www.surina.net/soundtouch/](https://www.surina.net/soundtouch/). Accessed January 31, 2021.
17. Piquemal, S. "WAAClock." [https://github.com/sebpiq/WAAClock](https://github.com/sebpiq/WAAClock). Accessed January 31, 2021.
18. Verhelst, W., and M. Roelands. "An Overlap-Add Technique Based on Waveform Similarity (WSOLA) for High-Quality Time-Scale Modification of Speech." *1993 IEEE International Conference on Acoustics, Speech, and Signal Processing*, Vol. 2, pp. 554-557. [https://doi.org/10.1109/ICASSP.1993.319366](https://doi.org/10.1109/ICASSP.1993.319366).
19. Wilson, C. "A Tale of Two Clocks: Scheduling Web Audio with Precision." [https://www.html5rocks.com/en/tutorials/audio/scheduling/](https://www.html5rocks.com/en/tutorials/audio/scheduling/). Accessed January 31, 2021.

