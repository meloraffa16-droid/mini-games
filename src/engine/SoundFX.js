/**
 * SoundFX — Motor de áudio 8-bit procedural para Mini Games.
 * Web Audio API pura, zero dependências, zero arquivos de áudio.
 * Sons gerados por osciladores (chiptune).
 *
 * Uso:
 *   SoundFX.play('eat');          // preset
 *   SoundFX.tone(440, 0.1);      // nota custom
 *   SoundFX.noise(0.3);          // ruído (explosão)
 *   SoundFX.toggleMute();        // mute/unmute
 *
 * O AudioContext é inicializado automaticamente no primeiro
 * click/keydown/touch (respeita autoplay policy dos browsers).
 *
 * Adicione <script src="../../src/engine/SoundFX.js"></script>
 * ANTES do game.js em cada página de jogo.
 */
(function (global) {
  'use strict';

  var _ctx   = null;
  var _ready = false;

  function getCtx() {
    if (!_ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
    }
    if (_ctx.state === 'suspended') {
      _ctx.resume();
    }
    return _ctx;
  }

  /* ────────────────────────────────────────────────────────────────
   * Core API
   * ──────────────────────────────────────────────────────────────── */
  var SoundFX = {
    muted: false,

    /** Inicializa AudioContext (chamar em resposta a user gesture) */
    init: function () {
      if (_ready) return;
      getCtx();
      _ready = true;
    },

    mute:       function () { this.muted = true; },
    unmute:     function () { this.muted = false; },
    toggleMute: function () { this.muted = !this.muted; return this.muted; },

    /**
     * Toca uma nota com oscilador.
     * @param {number}  freq     - Frequência em Hz
     * @param {number}  duration - Duração em segundos
     * @param {string}  [type]   - 'square'|'sawtooth'|'triangle'|'sine' (default: 'square')
     * @param {object}  [opts]   - { volume, attack, decay, slide }
     *   slide: frequência final (glissando)
     */
    tone: function (freq, duration, type, opts) {
      if (this.muted) return;
      var ctx = getCtx();
      if (!ctx) return;

      opts = opts || {};
      var vol     = opts.volume  !== undefined ? opts.volume  : 0.3;
      var attack  = opts.attack  || 0.008;
      var decay   = opts.decay   !== undefined ? opts.decay : duration;
      var now     = ctx.currentTime;

      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, now);

      if (opts.slide) {
        osc.frequency.linearRampToValueAtTime(opts.slide, now + duration);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + attack);
      gain.gain.linearRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    },

    /**
     * Burst de ruído branco (explosões, impactos).
     * @param {number} duration - Duração em segundos
     * @param {object} [opts]   - { volume }
     */
    noise: function (duration, opts) {
      if (this.muted) return;
      var ctx = getCtx();
      if (!ctx) return;

      opts = opts || {};
      var vol  = opts.volume !== undefined ? opts.volume : 0.2;
      var now  = ctx.currentTime;
      var len  = Math.max(1, Math.floor(ctx.sampleRate * duration));
      var buf  = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);

      for (var i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      var src  = ctx.createBufferSource();
      src.buffer = buf;

      var gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
    },

    /* ──────────────────────────────────────────────────────────────
     * PRESETS — sons pré-definidos estilo 8-bit
     * ────────────────────────────────────────────────────────────── */

    /** Comer / coletar item */
    eat: function () {
      this.tone(600, 0.1, 'square', { slide: 900, volume: 0.2 });
    },

    /** Colisão genérica / rebater */
    hit: function () {
      this.tone(400, 0.08, 'square', { volume: 0.15 });
    },

    /** Tiro / laser */
    shoot: function () {
      this.tone(880, 0.08, 'square', { slide: 220, volume: 0.12 });
    },

    /** Explosão */
    explosion: function () {
      this.noise(0.3, { volume: 0.25 });
      this.tone(80, 0.25, 'sawtooth', { slide: 30, volume: 0.15 });
    },

    /** Game Over — 3 notas descendentes */
    gameOver: function () {
      var self = this;
      self.tone(392, 0.18, 'square', { volume: 0.2 });
      setTimeout(function () { self.tone(311, 0.18, 'square', { volume: 0.2 }); }, 200);
      setTimeout(function () { self.tone(233, 0.35, 'square', { volume: 0.2 }); }, 400);
    },

    /** Vitória — melodia ascendente */
    win: function () {
      var self = this;
      self.tone(523, 0.1, 'square', { volume: 0.18 });
      setTimeout(function () { self.tone(659, 0.1, 'square', { volume: 0.18 }); }, 120);
      setTimeout(function () { self.tone(784, 0.1, 'square', { volume: 0.18 }); }, 240);
      setTimeout(function () { self.tone(1047, 0.22, 'square', { volume: 0.22 }); }, 360);
    },

    /** Rebater na raquete / paddle */
    paddle: function () {
      this.tone(280, 0.06, 'square', { volume: 0.12 });
    },

    /** Bola bate na parede */
    wall: function () {
      this.tone(200, 0.04, 'triangle', { volume: 0.08 });
    },

    /** Ponto marcado */
    score: function () {
      this.tone(700, 0.08, 'square', { slide: 1000, volume: 0.15 });
    },

    /** Bloco destruído (Breakout) */
    brick: function () {
      this.tone(520, 0.06, 'square', { slide: 700, volume: 0.12 });
    },

    /** Thrust / propulsão contínua (Asteroids) */
    thrust: function () {
      this.noise(0.06, { volume: 0.04 });
    },

    /** Rotação de peça (Tetris) */
    rotate: function () {
      this.tone(200, 0.05, 'square', { slide: 300, volume: 0.1 });
    },

    /** Peça move lateral (Tetris) */
    move: function () {
      this.tone(150, 0.03, 'square', { volume: 0.05 });
    },

    /** Linha completa (Tetris) */
    lineClear: function () {
      this.tone(523, 0.12, 'square', { slide: 1047, volume: 0.2 });
    },

    /** Hard drop (Tetris) */
    drop: function () {
      this.tone(80, 0.12, 'square', { volume: 0.18 });
    },

    /** Perda de vida */
    loseLife: function () {
      this.tone(300, 0.12, 'square', { slide: 100, volume: 0.18 });
      this.noise(0.15, { volume: 0.12 });
    },

    /** Alien morto (Space Invaders) */
    alienDie: function () {
      this.tone(400, 0.1, 'square', { slide: 100, volume: 0.15 });
      this.noise(0.08, { volume: 0.08 });
    },

    /** Nova wave */
    newWave: function () {
      var self = this;
      self.tone(440, 0.08, 'square', { volume: 0.12 });
      setTimeout(function () { self.tone(550, 0.08, 'square', { volume: 0.12 }); }, 100);
      setTimeout(function () { self.tone(660, 0.12, 'square', { volume: 0.15 }); }, 200);
    },

    /* ──────────────────────────────────────────────────────────────
     * Play by name (string → preset)
     * ────────────────────────────────────────────────────────────── */
    play: function (name) {
      if (typeof this[name] === 'function' && name !== 'play' &&
          name !== 'init' && name !== 'tone' && name !== 'noise') {
        this[name]();
      }
    },

    /* ──────────────────────────────────────────────────────────────
     * createMuteButton — injeta botão 🔊/🔇 no HUD
     * ────────────────────────────────────────────────────────────── */
    createMuteButton: function () {
      var hud = document.querySelector('.hud');
      if (!hud) return;

      var btn = document.createElement('button');
      btn.id = 'btn-mute';
      btn.textContent = '🔊';
      btn.setAttribute('aria-label', 'Alternar som');
      btn.style.cssText = [
        'cursor:pointer',
        'font-size:18px',
        'background:rgba(0,229,255,0.08)',
        'border:1px solid rgba(0,229,255,0.2)',
        'border-radius:6px',
        'padding:4px 10px',
        'color:#00e5ff',
        'transition:background 0.2s',
        'outline:none',
        'margin-left:auto'
      ].join(';');

      var self = this;
      btn.addEventListener('click', function () {
        var muted = self.toggleMute();
        btn.textContent = muted ? '🔇' : '🔊';
      });

      hud.appendChild(btn);
    }
  };

  /* ── Auto-init no primeiro gesto do usuário ─────────────────── */
  var initEvents = ['click', 'keydown', 'touchstart'];
  function autoInit() {
    SoundFX.init();
    for (var i = 0; i < initEvents.length; i++) {
      document.removeEventListener(initEvents[i], autoInit);
    }
  }
  for (var i = 0; i < initEvents.length; i++) {
    document.addEventListener(initEvents[i], autoInit);
  }

  /* ── Auto-create mute button quando DOM estiver pronto ──────── */
  document.addEventListener('DOMContentLoaded', function () {
    SoundFX.createMuteButton();
  });

  global.SoundFX = SoundFX;

}(window));
