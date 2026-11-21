// Procedural WebAudio: engine, siren, shots, stings and a 3-station
// in-car radio. Nothing loads from the network; all synthesis.
export function createAudio() {
  let ctx = null, master = null, engineOsc = null, engineGain = null, muted = false;
  const radioStations = [
    { name: 'SOL FM', base: 220, wave: 'triangle' },
    { name: 'BAY WAVE', base: 196, wave: 'sine' },
    { name: 'PALMERA NIGHTS', base: 262, wave: 'square' },
  ];
  let radioIdx = -1, radioTimer = null;
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    } catch { return false; }
    return true;
  }
  function tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slide = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.3, freq = 1200) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  const api = {
    stations: radioStations,
    get radio() { return radioIdx; },
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    shot(kind) { if (!ensure()) return; if (kind === 'fists') { noise(0.08, 0.25, 500); } else { noise(0.14, 0.4, 2600); tone(140, 0.1, 'square', 0.12, 0, -70); } },
    dryFire() { tone(1400, 0.04, 'square', 0.06); },
    reload() { tone(500, 0.05, 'square', 0.1); tone(700, 0.05, 'square', 0.1, 0.14); tone(900, 0.06, 'square', 0.12, 0.3); },
    cash() { tone(880, 0.09, 'sine', 0.18); tone(1320, 0.14, 'sine', 0.18, 0.08); },
    sting(ok = true) { if (!ensure()) return; const n = ok ? [523, 659, 784] : [392, 330, 262]; n.forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, i * 0.11)); },
    splash() { noise(0.3, 0.15, 900); },
    boom() { if (!ensure()) return; noise(0.7, 0.6, 300); tone(55, 0.6, 'sine', 0.5, 0, -25); },
    crash() { noise(0.2, 0.3, 700); },
    engine(on, rpm = 0) {
      if (!ensure()) return;
      if (on && !engineOsc) {
        engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth'; engineGain.gain.value = 0.0;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
        engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master); engineOsc.start();
      }
      if (engineOsc) {
        engineOsc.frequency.value = 55 + rpm * 95;
        engineGain.gain.value = muted ? 0 : (on ? 0.05 + rpm * 0.05 : 0);
        if (!on) { try { engineOsc.stop(); } catch { /* already stopped */ } engineOsc = null; }
      }
    },
    siren(dist) { /* handled by tone pulses from police update */ if (dist < 40 && Math.random() < 0.02) tone(dist > 20 ? 660 : 880, 0.16, 'triangle', 0.05); },
    radioNext(inCar) {
      if (!inCar) { radioIdx = -1; if (radioTimer) { clearInterval(radioTimer); radioTimer = null; } return null; }
      radioIdx = (radioIdx + 1) % (radioStations.length + 1);
      if (radioTimer) { clearInterval(radioTimer); radioTimer = null; }
      if (radioIdx >= radioStations.length) { radioIdx = -1; return null; }
      const st = radioStations[radioIdx];
      const scale = [0, 3, 5, 7, 10, 12, 10, 7];
      let step = 0;
      const play = () => { tone(st.base * Math.pow(2, scale[step % scale.length] / 12), 0.34, st.wave, 0.07); step++; };
      play(); radioTimer = setInterval(play, 360);
      return st.name;
    },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
  };
  return api;
}
