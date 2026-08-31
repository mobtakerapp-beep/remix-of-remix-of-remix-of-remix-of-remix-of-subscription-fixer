let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine") {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.22, ac.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

export function playCorrect() {
  if (!enabled) return;
  tone(660, 0, 0.16, "triangle");
  tone(880, 0.12, 0.2, "triangle");
  tone(1180, 0.26, 0.28, "triangle");
}

export function playWrong() {
  if (!enabled) return;
  tone(220, 0, 0.22, "sawtooth");
  tone(150, 0.16, 0.3, "sawtooth");
}

export function playClick() {
  if (!enabled) return;
  tone(520, 0, 0.06, "square");
}

export function playWin() {
  if (!enabled) return;
  [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.14, 0.3, "triangle"));
}
