var SimulationClock = class {
  constructor(stepSeconds = 0.1, maxStepsPerFrame = 8) {
    this.stepSeconds = stepSeconds;
    this.maxStepsPerFrame = maxStepsPerFrame;
    this.pending = 0;
    if (!Number.isFinite(stepSeconds) || stepSeconds <= 0 || !Number.isSafeInteger(maxStepsPerFrame) || maxStepsPerFrame <= 0)
      throw new Error("Invalid simulation clock");
  }
  advance(seconds, step) {
    if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(this.pending + seconds))
      return 0;
    this.pending += seconds;
    let count3 = 0;
    while (this.pending + 1e-9 >= this.stepSeconds && count3 < this.maxStepsPerFrame) {
      step(this.stepSeconds);
      this.pending = Math.max(0, this.pending - this.stepSeconds);
      count3++;
    }
    return count3;
  }
  reset() {
    this.pending = 0;
  }
  get backlogSeconds() {
    return this.pending;
  }
};

export { SimulationClock };
