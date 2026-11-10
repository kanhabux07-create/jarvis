/**
 * ==============================================================================
 * J.A.R.V.I.S. UNIFIED CLIENT ENGINE (script.js)
 * Combines Web Audio API Synthesizer, 60 FPS Arc Reactor Canvas,
 * Speech Recognition, Voice Synthesis & Natural Language Dispatcher into 1 File.
 * ==============================================================================
 */

/* ==============================================================================
   PART 1: WEB AUDIO API SYNTHESIZER ENGINE
   ============================================================================== */
class JarvisAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.hasInteracted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.hasInteracted = true;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playBoot() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.5);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.9);

    setTimeout(() => {
      this.playChime(587.33, 0.4, 0.08); // D5
    }, 450);
  }

  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.04);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  playAcknowledge() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.playTone(880, 0.08, 0.12, 'sine');
    setTimeout(() => {
      this.playTone(1760, 0.12, 0.15, 'sine');
    }, 90);
  }

  playAlert() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(660, 0.1, 0.2, 'sawtooth');
      }, i * 150);
    }
  }

  playPulse() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  playTone(freq, duration, volume = 0.1, type = 'sine') {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  playChime(freq, duration, volume = 0.1) {
    this.playTone(freq, duration, volume, 'sine');
  }
}

const JarvisAudio = new JarvisAudioEngine();
window.JarvisAudio = JarvisAudio;


/* ==============================================================================
   PART 2: ARC REACTOR CANVAS & HUD ENGINE (60 FPS)
   ============================================================================== */
class JarvisCoreEngine {
  constructor() {
    this.bgCanvas = null;
    this.bgCtx = null;
    this.waveCanvas = null;
    this.waveCtx = null;
    this.coreCanvas = null;
    this.coreCtx = null;

    this.particles = [];
    this.numParticles = 75;
    this.state = 'IDLE'; // IDLE, LISTENING, THINKING, SPEAKING
    this.audioLevel = 0;
    this.targetAudioLevel = 0;
    this.rotationAngle = 0;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    
    this.theme = 'cyan'; // cyan, crimson, emerald, amber
  }

  init() {
    this.initBackgroundCanvas();
    this.initCoreCanvas();
    this.initWaveformCanvas();
    this.initParallax();
    this.animate();
  }

  initBackgroundCanvas() {
    this.bgCanvas = document.getElementById('bg-canvas');
    if (!this.bgCanvas) return;
    this.bgCtx = this.bgCanvas.getContext('2d');

    this.resizeBg();
    window.addEventListener('resize', () => this.resizeBg());

    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        x: Math.random() * this.bgCanvas.width,
        y: Math.random() * this.bgCanvas.height,
        size: Math.random() * 2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.1
      });
    }
  }

  resizeBg() {
    if (!this.bgCanvas) return;
    this.bgCanvas.width = window.innerWidth;
    this.bgCanvas.height = window.innerHeight;
  }

  drawBackground() {
    if (!this.bgCtx) return;
    const ctx = this.bgCtx;
    const w = this.bgCanvas.width;
    const h = this.bgCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.75);
    const colorPrimary = this.getThemeColors().primaryGlow;
    grad.addColorStop(0, colorPrimary);
    grad.addColorStop(0.5, 'rgba(5, 10, 20, 0.4)');
    grad.addColorStop(1, 'rgba(2, 4, 8, 0.95)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = this.getThemeColors().gridDots;
    const step = 45;
    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        if ((x + y) % (step * 2) === 0) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.fillStyle = this.getThemeColors().primary;
    for (let p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  initCoreCanvas() {
    this.coreCanvas = document.getElementById('core-canvas');
    if (!this.coreCanvas) return;
    this.coreCtx = this.coreCanvas.getContext('2d');
    this.resizeCore();
    window.addEventListener('resize', () => this.resizeCore());
  }

  resizeCore() {
    if (!this.coreCanvas) return;
    const rect = this.coreCanvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 460);
    this.coreCanvas.width = size * window.devicePixelRatio;
    this.coreCanvas.height = size * window.devicePixelRatio;
    this.coreCanvas.style.width = `${size}px`;
    this.coreCanvas.style.height = `${size}px`;
  }

  drawCore() {
    if (!this.coreCtx) return;
    const ctx = this.coreCtx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.coreCanvas.width;
    const h = this.coreCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = (w / 2) - (20 * dpr);

    ctx.clearRect(0, 0, w, h);

    this.audioLevel += (this.targetAudioLevel - this.audioLevel) * 0.15;
    this.rotationAngle += 0.008 + (this.audioLevel * 0.02);

    const colors = this.getThemeColors();

    // 1. Outer Calibration Compass Ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotationAngle * 0.5);

    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, maxR, 0, Math.PI * 2);
    ctx.stroke();

    const numTicks = 60;
    for (let i = 0; i < numTicks; i++) {
      const angle = (i * Math.PI * 2) / numTicks;
      const isMajor = i % 5 === 0;
      const tickLen = (isMajor ? 12 : 5) * dpr;
      const r1 = maxR;
      const r2 = maxR - tickLen;

      ctx.strokeStyle = isMajor ? colors.primary : colors.faint;
      ctx.lineWidth = (isMajor ? 2 : 1) * dpr;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
      ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Middle Counter-Rotating Segmented Tech Arcs
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.rotationAngle * 0.8);

    const midR = maxR * 0.78;
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3.5 * dpr;
    ctx.shadowColor = colors.primary;
    ctx.shadowBlur = 10 * dpr;

    for (let i = 0; i < 3; i++) {
      const start = (i * (Math.PI * 2 / 3)) + 0.2;
      const end = start + (Math.PI * 2 / 3) - 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, midR, start, end);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Dynamic Radial Equalizer Bars
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotationAngle * 0.3);

    const eqR = maxR * 0.62;
    const numBars = 48;
    for (let i = 0; i < numBars; i++) {
      const angle = (i * Math.PI * 2) / numBars;
      let pulse = Math.sin((i * 4) + (Date.now() * 0.006)) * 0.5 + 0.5;
      if (this.state === 'LISTENING') pulse = Math.sin((i * 6) + (Date.now() * 0.015)) * 0.7 + 0.3;
      if (this.state === 'SPEAKING') pulse = Math.sin((i * 8) + (Date.now() * 0.025)) * 0.9 + 0.2;

      const barHeight = (4 + (pulse * (16 + this.audioLevel * 30))) * dpr;
      const x1 = Math.cos(angle) * eqR;
      const y1 = Math.sin(angle) * eqR;
      const x2 = Math.cos(angle) * (eqR + barHeight);
      const y2 = Math.sin(angle) * (eqR + barHeight);

      ctx.strokeStyle = (i % 2 === 0) ? colors.primary : colors.accent;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Inner Arc Reactor Energy Core
    ctx.save();
    ctx.translate(cx, cy);

    const innerR = maxR * 0.42 * (1 + this.audioLevel * 0.12);
    
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 2.5 * dpr;
    ctx.shadowColor = colors.primary;
    ctx.shadowBlur = 18 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.stroke();

    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR);
    coreGrad.addColorStop(0, '#FFFFFF');
    coreGrad.addColorStop(0.3, colors.primary);
    coreGrad.addColorStop(0.7, colors.secondary);
    coreGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, innerR * 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Triangular Core Brackets
    ctx.rotate(this.rotationAngle * 1.2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const x = Math.cos(a) * (innerR * 0.65);
      const y = Math.sin(a) * (innerR * 0.65);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Center Core Micro-Pulse
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 12 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, 6 * dpr * (1 + this.audioLevel * 0.5), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  initWaveformCanvas() {
    this.waveCanvas = document.getElementById('wave-canvas');
    if (!this.waveCanvas) return;
    this.waveCtx = this.waveCanvas.getContext('2d');
    this.resizeWave();
    window.addEventListener('resize', () => this.resizeWave());
  }

  resizeWave() {
    if (!this.waveCanvas) return;
    const rect = this.waveCanvas.getBoundingClientRect();
    this.waveCanvas.width = rect.width * (window.devicePixelRatio || 1);
    this.waveCanvas.height = rect.height * (window.devicePixelRatio || 1);
  }

  drawWaveform() {
    if (!this.waveCtx) return;
    const ctx = this.waveCtx;
    const w = this.waveCanvas.width;
    const h = this.waveCanvas.height;
    const dpr = window.devicePixelRatio || 1;
    const colors = this.getThemeColors();

    ctx.clearRect(0, 0, w, h);

    const centerY = h / 2;
    const points = 70;
    const step = w / points;

    ctx.beginPath();
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = colors.primary;
    ctx.shadowColor = colors.primary;
    ctx.shadowBlur = 8 * dpr;

    const time = Date.now() * 0.005;
    let multiplier = 12 * dpr;
    if (this.state === 'LISTENING') multiplier = 24 * dpr;
    if (this.state === 'SPEAKING') multiplier = 36 * dpr;

    for (let i = 0; i <= points; i++) {
      const x = i * step;
      const envelope = Math.sin((i / points) * Math.PI);
      const wave1 = Math.sin(i * 0.2 + time) * multiplier * envelope;
      const wave2 = Math.cos(i * 0.4 - time * 1.5) * (multiplier * 0.5) * envelope;
      const y = centerY + wave1 + wave2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = colors.faint;
    ctx.lineWidth = 1 * dpr;
    ctx.shadowBlur = 0;
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();
  }

  initParallax() {
    const hudContainer = document.querySelector('.jarvis-hud-container');
    if (!hudContainer) return;

    window.addEventListener('mousemove', e => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      this.mouse.targetX = (e.clientX - cx) / cx;
      this.mouse.targetY = (e.clientY - cy) / cy;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.targetX = 0;
      this.mouse.targetY = 0;
    });
  }

  updateParallax() {
    const hudContainer = document.querySelector('.jarvis-hud-container');
    if (!hudContainer) return;

    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    const rotX = -this.mouse.y * 6;
    const rotY = this.mouse.x * 6;

    hudContainer.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }

  setTheme(themeName) {
    this.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    JarvisAudio.playAcknowledge();
  }

  getThemeColors() {
    switch (this.theme) {
      case 'crimson':
        return {
          primary: '#FF2A42',
          secondary: '#FFB800',
          accent: '#FFD700',
          faint: 'rgba(255, 42, 66, 0.25)',
          primaryGlow: 'rgba(255, 42, 66, 0.15)',
          gridDots: 'rgba(255, 184, 0, 0.08)'
        };
      case 'emerald':
        return {
          primary: '#00FF9D',
          secondary: '#00B865',
          accent: '#7DFFC8',
          faint: 'rgba(0, 255, 157, 0.25)',
          primaryGlow: 'rgba(0, 255, 157, 0.12)',
          gridDots: 'rgba(0, 255, 157, 0.08)'
        };
      case 'amber':
        return {
          primary: '#FF9900',
          secondary: '#FF5500',
          accent: '#FFCC00',
          faint: 'rgba(255, 153, 0, 0.25)',
          primaryGlow: 'rgba(255, 153, 0, 0.15)',
          gridDots: 'rgba(255, 153, 0, 0.08)'
        };
      case 'cyan':
      default:
        return {
          primary: '#00F2FE',
          secondary: '#4FACFE',
          accent: '#00FFE0',
          faint: 'rgba(0, 242, 254, 0.25)',
          primaryGlow: 'rgba(0, 242, 254, 0.12)',
          gridDots: 'rgba(0, 242, 254, 0.08)'
        };
    }
  }

  setState(state) {
    this.state = state;
    const statusBadge = document.getElementById('core-state-badge');
    if (statusBadge) {
      statusBadge.textContent = state;
      statusBadge.className = `state-badge state-${state.toLowerCase()}`;
    }

    if (state === 'SPEAKING' || state === 'LISTENING') {
      this.targetAudioLevel = 0.8;
    } else {
      this.targetAudioLevel = 0;
    }
  }

  animate() {
    this.drawBackground();
    this.drawCore();
    this.drawWaveform();
    this.updateParallax();

    requestAnimationFrame(() => this.animate());
  }
}

const JarvisCore = new JarvisCoreEngine();
window.JarvisCore = JarvisCore;


/* ==============================================================================
   PART 3: SPEECH RECOGNITION, SPEECH SYNTHESIS & COMMAND DISPATCHER
   ============================================================================== */
class JarvisIntelligence {
  constructor() {
    this.recognition = null;
    this.synth = window.speechSynthesis;
    this.isListening = false;
    this.selectedVoice = null;
    this.terminalEl = null;
    this.commandInput = null;

    this.initSpeech();
    this.initDOM();
  }

  initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        JarvisCore.setState('LISTENING');
        JarvisAudio.playAcknowledge();
        this.logToTerminal('MIC ACTIVE: Listening for command...', 'sys');
        this.updateMicButton(true);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.logToTerminal(`USER: "${transcript}"`, 'user');
        this.processCommand(transcript);
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        this.isListening = false;
        JarvisCore.setState('IDLE');
        this.updateMicButton(false);
        if (event.error === 'not-allowed') {
          this.logToTerminal('ERROR: Microphone access denied. Allow mic permissions in your browser or type commands below.', 'err');
        } else {
          this.logToTerminal(`RECOGNITION EVENT: ${event.error}`, 'sys');
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (JarvisCore.state === 'LISTENING') {
          JarvisCore.setState('IDLE');
        }
        this.updateMicButton(false);
      };
    } else {
      console.warn('Web Speech API is not supported in this browser.');
    }

    if (this.synth) {
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    this.selectedVoice = 
      voices.find(v => v.lang.includes('en-GB') && v.name.toLowerCase().includes('male')) ||
      voices.find(v => v.name.includes('George') || v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('Arthur')) ||
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.lang.includes('en-US') && (v.name.includes('Natural') || v.name.includes('David'))) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];
  }

  speak(text, onComplete) {
    if (!this.synth) {
      this.logToTerminal(`JARVIS: ${text}`, 'jarvis');
      if (onComplete) onComplete();
      return;
    }

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = 1.02;
    utterance.pitch = 0.95;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      JarvisCore.setState('SPEAKING');
      this.logToTerminal(`JARVIS: ${text}`, 'jarvis');
    };

    utterance.onend = () => {
      JarvisCore.setState('IDLE');
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      JarvisCore.setState('IDLE');
      if (onComplete) onComplete();
    };

    this.synth.speak(utterance);
  }

  processCommand(rawInput) {
    const text = rawInput.toLowerCase().trim();
    JarvisCore.setState('THINKING');

    // 1. Greetings
    if (text.includes('hello') || text.includes('hey jarvis') || text.includes('hi jarvis') || text.includes('good morning') || text.includes('good afternoon') || text.includes('good evening')) {
      const hours = new Date().getHours();
      let greeting = 'Good evening';
      if (hours < 12) greeting = 'Good morning';
      else if (hours < 17) greeting = 'Good afternoon';

      this.speak(`${greeting}, sir. J.A.R.V.I.S. is fully operational. All security protocols nominal.`);
      return;
    }

    // 2. Who Are You
    if (text.includes('who are you') || text.includes('what are you') || text.includes('who made you') || text.includes('your name')) {
      this.speak("I am J.A.R.V.I.S. Just A Rather Very Intelligent System. Created to oversee Stark Industries systems and assist you at the highest level of computational precision.");
      return;
    }

    // 3. Time
    if (text.includes('time')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.speak(`The current system time is ${timeStr}, sir.`);
      return;
    }

    // 4. Date
    if (text.includes('date') || text.includes('day') || text.includes('month') || text.includes('year')) {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      this.speak(`Today is ${now.toLocaleDateString('en-US', options)}, sir.`);
      return;
    }

    // 5. Diagnostics
    if (text.includes('status') || text.includes('diagnostic') || text.includes('system report') || text.includes('scan') || text.includes('power')) {
      JarvisAudio.playPulse();
      this.runDiagnosticSweep();
      this.speak("Running a full diagnostic sweep, sir. Arc Reactor core stability is at 99.8%. Quantum cache allocation optimal. Zero anomalous signatures detected.");
      return;
    }

    // 6. Theme Switching
    if (text.includes('crimson') || text.includes('red') || text.includes('mark 3') || text.includes('gold')) {
      JarvisCore.setTheme('crimson');
      this.speak("Mark Three classic crimson and gold configuration engaged, sir.");
      return;
    }
    if (text.includes('stealth') || text.includes('emerald') || text.includes('green')) {
      JarvisCore.setTheme('emerald');
      this.speak("Tactical stealth emerald protocol active. Sensor dampeners initialized.");
      return;
    }
    if (text.includes('amber') || text.includes('overdrive') || text.includes('alert') || text.includes('orange')) {
      JarvisCore.setTheme('amber');
      this.speak("High energy overdrive engaged. Warning telemetry highlighted.");
      return;
    }
    if (text.includes('cyan') || text.includes('blue') || text.includes('default theme') || text.includes('reset theme')) {
      JarvisCore.setTheme('cyan');
      this.speak("Restoring standard Mark 85 cyan telemetry HUD, sir.");
      return;
    }

    // 7. Web Launchers
    if (text.includes('open youtube') || text.includes('play youtube')) {
      this.speak("Accessing YouTube, sir.", () => {
        window.open('https://youtube.com', '_blank');
      });
      return;
    }

    if (text.includes('open google')) {
      this.speak("Opening Google search interface, sir.", () => {
        window.open('https://google.com', '_blank');
      });
      return;
    }

    if (text.includes('open github')) {
      this.speak("Opening GitHub repository console, sir.", () => {
        window.open('https://github.com', '_blank');
      });
      return;
    }

    if (text.includes('open spotify') || text.includes('play music')) {
      this.speak("Initializing audio stream protocols, sir.", () => {
        window.open('https://open.spotify.com', '_blank');
      });
      return;
    }

    if (text.includes('open map') || text.includes('gps') || text.includes('location')) {
      this.speak("Rendering global navigation satellite feed, sir.", () => {
        window.open('https://maps.google.com', '_blank');
      });
      return;
    }

    // 8. Search query handler
    if (text.startsWith('search for ') || text.startsWith('search ') || text.startsWith('google ') || text.startsWith('look up ')) {
      const query = text.replace(/^(search for|search|google|look up)\s+/i, '');
      this.speak(`Executing global intelligence query for: ${query}.`, () => {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
      });
      return;
    }

    // 9. Easter Eggs & Iron Man Lore
    if (text.includes('quote') || text.includes('tony stark') || text.includes('iron man')) {
      const quotes = [
        "Sometimes you gotta run before you can walk, sir.",
        "I am Iron Man. The truth is... I am Iron Man.",
        "Part of the journey is the end. Everything is going to work out exactly the way it's supposed to.",
        "Give me a scotch, I'm starving. And let's calibrate the flight stabilizers."
      ];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      this.speak(randomQuote);
      return;
    }

    if (text.includes('joke')) {
      const jokes = [
        "There are 10 types of people in the world: those who understand binary, and those who do not.",
        "Why do programmers prefer dark mode? Because light attracts bugs, sir.",
        "An AI walks into a bar. The bartender asks, 'What will it be?' The AI replies, 'Everything.'"
      ];
      const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
      this.speak(randomJoke);
      return;
    }

    if (text.includes('clean slate') || text.includes('house party') || text.includes('self destruct')) {
      JarvisAudio.playAlert();
      this.speak("Protocol Clean Slate requires authorization from Anthony Edward Stark. Security interlocks remain firmly engaged, sir.");
      return;
    }

    // 10. Fallback
    this.speak(`Analyzing query: "${rawInput}". Executing global telemetry scan, sir.`, () => {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(rawInput)}`, '_blank');
    });
  }

  runDiagnosticSweep() {
    const bars = document.querySelectorAll('.diag-bar-fill');
    bars.forEach(bar => {
      const currentWidth = bar.style.width;
      bar.style.width = '100%';
      setTimeout(() => {
        bar.style.width = currentWidth || '78%';
      }, 800);
    });

    const energyVal = document.getElementById('energy-val');
    if (energyVal) {
      energyVal.textContent = '3.8 GJ/s (PEAK)';
      setTimeout(() => {
        energyVal.textContent = '3.2 GJ/s (STABLE)';
      }, 2000);
    }
  }

  initDOM() {
    this.terminalEl = document.getElementById('terminal-logs');
    this.commandInput = document.getElementById('command-input');
    const sendBtn = document.getElementById('send-command-btn');
    const micBtn = document.getElementById('mic-toggle-btn');
    const coreBtn = document.getElementById('core-trigger-btn');

    if (this.commandInput) {
      this.commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleManualSubmit();
        }
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        JarvisAudio.playClick();
        this.handleManualSubmit();
      });
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        JarvisAudio.playClick();
        this.toggleVoice();
      });
    }

    if (coreBtn) {
      coreBtn.addEventListener('click', () => {
        JarvisAudio.playPulse();
        this.toggleVoice();
      });
    }

    const pills = document.querySelectorAll('.quick-command-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        JarvisAudio.playClick();
        const cmd = pill.getAttribute('data-cmd');
        if (cmd) {
          this.logToTerminal(`QUICK SELECT: "${cmd}"`, 'user');
          this.processCommand(cmd);
        }
      });
    });

    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-theme');
        if (t) {
          JarvisCore.setTheme(t);
          themeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    const muteBtn = document.getElementById('audio-mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = JarvisAudio.toggleMute();
        muteBtn.textContent = isMuted ? 'AUDIO: MUTED' : 'AUDIO: ON';
        muteBtn.classList.toggle('muted', isMuted);
      });
    }

    const diagBtn = document.getElementById('run-diag-btn');
    if (diagBtn) {
      diagBtn.addEventListener('click', () => {
        this.processCommand('run diagnostics');
      });
    }

    this.logToTerminal('STARK INDUSTRIES PROTOCOL // MARK LXXXV ONLINE', 'sys');
    this.logToTerminal('INITIALIZING NEURAL INTERFACE & AUDIO OSCILLATORS...', 'sys');
    this.logToTerminal('READY: Click the Core, Mic, or type below.', 'sys');
  }

  toggleVoice() {
    if (!this.recognition) {
      this.speak("Microphone speech recognition is not supported in this browser. Please type your command below, sir.");
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      JarvisCore.setState('IDLE');
      this.updateMicButton(false);
    } else {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  }

  updateMicButton(active) {
    const micBtn = document.getElementById('mic-toggle-btn');
    if (micBtn) {
      micBtn.classList.toggle('active', active);
    }
  }

  handleManualSubmit() {
    if (!this.commandInput) return;
    const text = this.commandInput.value.trim();
    if (!text) return;

    this.logToTerminal(`USER: "${text}"`, 'user');
    this.commandInput.value = '';
    this.processCommand(text);
  }

  logToTerminal(text, type = 'sys') {
    if (!this.terminalEl) return;

    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `terminal-line line-${type}`;

    let prefix = `[${time}] `;
    if (type === 'user') prefix += '▶ ';
    else if (type === 'jarvis') prefix += '⚡ ';
    else if (type === 'err') prefix += '⚠ ';

    line.innerHTML = `<span class="time-stamp">${prefix}</span><span class="line-content">${text}</span>`;
    this.terminalEl.appendChild(line);

    this.terminalEl.scrollTop = this.terminalEl.scrollHeight;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.Jarvis = new JarvisIntelligence();
  JarvisCore.init();

  document.body.addEventListener('click', function onFirstClick() {
    JarvisAudio.playBoot();
    document.body.removeEventListener('click', onFirstClick);
  }, { once: true });
});
