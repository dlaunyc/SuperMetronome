(() => {
  "use strict";

  const AudioClock = window.AudioContext || window.webkitAudioContext;
  const maximumLogRows = 100;

  const elements = {
    bpm: document.querySelector("#bpm"),
    timerInterval: document.querySelector("#timerInterval"),
    lookAhead: document.querySelector("#lookAhead"),
    start: document.querySelector("#start"),
    stop: document.querySelector("#stop"),
    clear: document.querySelector("#clear"),
    status: document.querySelector("#status"),
    bpmValue: document.querySelector("#bpmValue"),
    eventRate: document.querySelector("#eventRate"),
    eventIntervalSeconds: document.querySelector("#eventIntervalSeconds"),
    eventIntervalMilliseconds: document.querySelector("#eventIntervalMilliseconds"),
    sampleRate: document.querySelector("#sampleRate"),
    samplesPerEvent: document.querySelector("#samplesPerEvent"),
    baseLatency: document.querySelector("#baseLatency"),
    outputLatency: document.querySelector("#outputLatency"),
    performanceNow: document.querySelector("#performanceNow"),
    audioNow: document.querySelector("#audioNow"),
    nextTimerDeadline: document.querySelector("#nextTimerDeadline"),
    lastTimerError: document.querySelector("#lastTimerError"),
    maximumTimerError: document.querySelector("#maximumTimerError"),
    skippedTimerIntervals: document.querySelector("#skippedTimerIntervals"),
    lastTimerPeriod: document.querySelector("#lastTimerPeriod"),
    averageTimerPeriod: document.querySelector("#averageTimerPeriod"),
    lastTimerPeriodError: document.querySelector("#lastTimerPeriodError"),
    schedulerHorizon: document.querySelector("#schedulerHorizon"),
    nextEventTarget: document.querySelector("#nextEventTarget"),
    timeUntilNextEvent: document.querySelector("#timeUntilNextEvent"),
    lastSchedulingLead: document.querySelector("#lastSchedulingLead"),
    minimumSchedulingLead: document.querySelector("#minimumSchedulingLead"),
    maximumSchedulingLead: document.querySelector("#maximumSchedulingLead"),
    lastSkippedSpan: document.querySelector("#lastSkippedSpan"),
    eventLog: document.querySelector("#eventLog")
  };

  let audioContext = null;
  let silentSource = null;
  let schedulerTimer = null;
  let running = false;
  let bpm = 120;
  let timerIntervalMs = 25;
  let lookAheadSeconds = 0.1;
  let eventIntervalSeconds = 0.5;
  let expectedTimerDeadlineMs = 0;
  let nextEventAudioTime = 0;
  let maximumTimerErrorMs = 0;
  let skippedTimerIntervalCount = 0;
  let previousTimerWakeMs = 0;
  let timerPeriodTotalMs = 0;
  let timerPeriodSampleCount = 0;
  let lastSchedulingLeadMs = 0;
  let minimumSchedulingLeadMs = Number.POSITIVE_INFINITY;
  let maximumSchedulingLeadMs = 0;
  let firstEventAudioTime = 0;
  let eventGridIndex = 0;

  function clampNumber(input, fallback) {
    const value = Number(input.value);
    const minimum = Number(input.min);
    const maximum = Number(input.max);
    const result = Number.isFinite(value)
      ? Math.min(maximum, Math.max(minimum, value))
      : fallback;

    input.value = String(result);
    return result;
  }

  function setConfigurationDisabled(disabled) {
    elements.bpm.disabled = disabled;
    elements.timerInterval.disabled = disabled;
    elements.lookAhead.disabled = disabled;
    elements.start.disabled = disabled;
    elements.stop.disabled = !disabled;
  }

  function writeValue(element, value, decimalPlaces) {
    element.value = Number.isFinite(value)
      ? value.toFixed(decimalPlaces)
      : (0).toFixed(decimalPlaces);
  }

  function writeDerivedTempoValues() {
    const inputBpm = Number(elements.bpm.value);
    const displayBpm = Number.isFinite(inputBpm) && inputBpm > 0 ? inputBpm : 0;
    const intervalSeconds = displayBpm > 0 ? 60 / displayBpm : 0;

    writeValue(elements.bpmValue, displayBpm, 3);
    writeValue(elements.eventRate, displayBpm / 60, 6);
    writeValue(elements.eventIntervalSeconds, intervalSeconds, 6);
    writeValue(elements.eventIntervalMilliseconds, intervalSeconds * 1000, 3);
  }

  function appendScheduledValue(targetTime, scheduledAt, timerErrorMs, phaseErrorMs) {
    const row = elements.eventLog.insertRow(0);
    const leadTimeMs = (targetTime - scheduledAt) * 1000;
    const values = [
      targetTime.toFixed(6),
      scheduledAt.toFixed(6),
      leadTimeMs.toFixed(3),
      (eventIntervalSeconds * 1000).toFixed(3),
      phaseErrorMs.toFixed(6),
      timerErrorMs.toFixed(3)
    ];

    for (const value of values) {
      const cell = row.insertCell();
      cell.textContent = value;
    }

    while (elements.eventLog.rows.length > maximumLogRows) {
      elements.eventLog.deleteRow(-1);
    }
  }

  function startSilentClockDriver() {
    silentSource = audioContext.createConstantSource();
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    silentSource.connect(silentGain).connect(audioContext.destination);
    silentSource.start();
  }

  function stopSilentClockDriver() {
    if (!silentSource) {
      return;
    }

    try {
      silentSource.stop();
    } catch {
      // The source may already be stopped.
    }
    silentSource.disconnect();
    silentSource = null;
  }

  function eventTimeAtIndex(index) {
    return firstEventAudioTime + index * eventIntervalSeconds;
  }

  function scheduleNextWake() {
    const schedulingTimeMs = performance.now();
    let nextDeadlineMs = expectedTimerDeadlineMs + timerIntervalMs;

    // Keep timer deadlines on one fixed grid. Basing the next deadline on the
    // callback's actual (usually late) arrival would accumulate timer drift.
    if (nextDeadlineMs <= schedulingTimeMs) {
      const intervalsToSkip = Math.floor(
        (schedulingTimeMs - nextDeadlineMs) / timerIntervalMs
      ) + 1;
      nextDeadlineMs += intervalsToSkip * timerIntervalMs;
      skippedTimerIntervalCount += intervalsToSkip;
    }

    expectedTimerDeadlineMs = nextDeadlineMs;
    const delayMs = Math.max(0, nextDeadlineMs - performance.now());
    schedulerTimer = window.setTimeout(schedulerWake, delayMs);
  }

  function schedulerWake() {
    if (!running || !audioContext) {
      return;
    }

    const performanceTimeMs = performance.now();
    const audioTime = audioContext.currentTime;
    const timerErrorMs = performanceTimeMs - expectedTimerDeadlineMs;
    const schedulerHorizon = audioTime + lookAheadSeconds;
    const timerPeriodMs = previousTimerWakeMs > 0
      ? performanceTimeMs - previousTimerWakeMs
      : 0;
    const timerPeriodErrorMs = previousTimerWakeMs > 0
      ? timerPeriodMs - timerIntervalMs
      : 0;
    let skippedTimeSpanMs = 0;

    maximumTimerErrorMs = Math.max(maximumTimerErrorMs, Math.max(0, timerErrorMs));

    if (previousTimerWakeMs > 0) {
      timerPeriodTotalMs += timerPeriodMs;
      timerPeriodSampleCount += 1;
    }
    previousTimerWakeMs = performanceTimeMs;

    if (nextEventAudioTime < audioTime) {
      const missedTime = audioTime - nextEventAudioTime;
      const intervalsToSkip = Math.ceil(missedTime / eventIntervalSeconds);
      skippedTimeSpanMs = intervalsToSkip * eventIntervalSeconds * 1000;
      eventGridIndex += intervalsToSkip;
      nextEventAudioTime = eventTimeAtIndex(eventGridIndex);
    }

    while (nextEventAudioTime <= schedulerHorizon) {
      const idealTarget = firstEventAudioTime + eventGridIndex * eventIntervalSeconds;
      const phaseErrorMs = (nextEventAudioTime - idealTarget) * 1000;
      lastSchedulingLeadMs = (nextEventAudioTime - audioTime) * 1000;
      minimumSchedulingLeadMs = Math.min(minimumSchedulingLeadMs, lastSchedulingLeadMs);
      maximumSchedulingLeadMs = Math.max(maximumSchedulingLeadMs, lastSchedulingLeadMs);
      appendScheduledValue(nextEventAudioTime, audioTime, timerErrorMs, phaseErrorMs);
      eventGridIndex += 1;
      nextEventAudioTime = eventTimeAtIndex(eventGridIndex);
    }

    // Arm the next wake before updating the diagnostics so DOM work cannot add
    // avoidable delay to registering the timer.
    scheduleNextWake();

    writeValue(elements.performanceNow, performanceTimeMs, 3);
    writeValue(elements.audioNow, audioTime, 6);
    writeValue(elements.nextTimerDeadline, expectedTimerDeadlineMs, 3);
    writeValue(elements.lastTimerError, timerErrorMs, 3);
    writeValue(elements.maximumTimerError, maximumTimerErrorMs, 3);
    elements.skippedTimerIntervals.value = String(skippedTimerIntervalCount);
    writeValue(elements.lastTimerPeriod, timerPeriodMs, 3);
    writeValue(
      elements.averageTimerPeriod,
      timerPeriodSampleCount > 0 ? timerPeriodTotalMs / timerPeriodSampleCount : 0,
      3
    );
    writeValue(elements.lastTimerPeriodError, timerPeriodErrorMs, 3);
    writeValue(elements.schedulerHorizon, schedulerHorizon, 6);
    writeValue(elements.nextEventTarget, nextEventAudioTime, 6);
    writeValue(elements.timeUntilNextEvent, (nextEventAudioTime - audioTime) * 1000, 3);
    writeValue(elements.lastSchedulingLead, lastSchedulingLeadMs, 3);
    writeValue(
      elements.minimumSchedulingLead,
      Number.isFinite(minimumSchedulingLeadMs) ? minimumSchedulingLeadMs : 0,
      3
    );
    writeValue(elements.maximumSchedulingLead, maximumSchedulingLeadMs, 3);
    writeValue(elements.lastSkippedSpan, skippedTimeSpanMs, 3);

  }

  async function start() {
    if (running) {
      return;
    }

    if (!AudioClock) {
      elements.status.textContent = "AudioContext unavailable";
      return;
    }

    bpm = clampNumber(elements.bpm, 120);
    timerIntervalMs = clampNumber(elements.timerInterval, 25);
    lookAheadSeconds = clampNumber(elements.lookAhead, 100) / 1000;
    eventIntervalSeconds = 60 / bpm;
    writeDerivedTempoValues();

    try {
      audioContext ||= new AudioClock();
      await audioContext.resume();
      startSilentClockDriver();

      running = true;
      maximumTimerErrorMs = 0;
      skippedTimerIntervalCount = 0;
      previousTimerWakeMs = 0;
      timerPeriodTotalMs = 0;
      timerPeriodSampleCount = 0;
      lastSchedulingLeadMs = 0;
      minimumSchedulingLeadMs = Number.POSITIVE_INFINITY;
      maximumSchedulingLeadMs = 0;
      expectedTimerDeadlineMs = performance.now();
      nextEventAudioTime = audioContext.currentTime + lookAheadSeconds;
      firstEventAudioTime = nextEventAudioTime;
      eventGridIndex = 0;
      writeValue(elements.sampleRate, audioContext.sampleRate, 3);
      writeValue(elements.samplesPerEvent, audioContext.sampleRate * eventIntervalSeconds, 3);
      writeValue(elements.baseLatency, (audioContext.baseLatency || 0) * 1000, 3);
      writeValue(elements.outputLatency, (audioContext.outputLatency || 0) * 1000, 3);
      setConfigurationDisabled(true);
      elements.status.textContent = "Running";
      schedulerWake();
    } catch (error) {
      elements.status.textContent = `Start failed: ${error.message}`;
      stopSilentClockDriver();
      setConfigurationDisabled(false);
    }
  }

  async function stop() {
    if (!running) {
      return;
    }

    running = false;
    window.clearTimeout(schedulerTimer);
    schedulerTimer = null;
    stopSilentClockDriver();
    setConfigurationDisabled(false);
    elements.status.textContent = "Stopped";

    if (audioContext?.state === "running") {
      await audioContext.suspend();
    }
  }

  function clear() {
    elements.eventLog.replaceChildren();
    maximumTimerErrorMs = 0;
    skippedTimerIntervalCount = 0;
    writeValue(elements.maximumTimerError, 0, 3);
    elements.skippedTimerIntervals.value = "0";
    writeValue(elements.minimumSchedulingLead, 0, 3);
    writeValue(elements.maximumSchedulingLead, 0, 3);
    writeValue(elements.lastSkippedSpan, 0, 3);
  }

  elements.bpm.addEventListener("input", writeDerivedTempoValues);
  elements.start.addEventListener("click", start);
  elements.stop.addEventListener("click", stop);
  elements.clear.addEventListener("click", clear);
  window.addEventListener("pagehide", () => {
    if (running) {
      void stop();
    }
  });
  writeDerivedTempoValues();
})();
