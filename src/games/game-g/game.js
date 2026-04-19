(function () {
  'use strict';

  // --- Constantes ---
  var GRAVITY       = 600;      // px/s^2
  var FLAP_FORCE    = -220;     // impulso para cima (px/s)
  var BIRD_SIZE     = 16;       // 16x16 pixel art
  var PIPE_WIDTH    = 40;       // largura de cada cano
  var PIPE_GAP      = 120;      // espaço vertical entre canos
  var PIPE_SPEED    = 150;      // velocidade horizontal (px/s)
  var PIPE_SPACING  = 200;      // distância horizontal entre pares de canos
  var GROUND_H      = 40;       // altura da faixa de chão
  var STAR_COUNT    = 60;       // quantidade de estrelas no fundo

  // --- Paleta 8-bit ---
  var COLOR_BG         = '#0a0a1a';
  var COLOR_BIRD       = '#00fff0';
  var COLOR_BIRD_EYE   = '#ffffff';
  var COLOR_PIPE        = '#39ff14';
  var COLOR_PIPE_BORDER = '#1a8a0a';
  var COLOR_GROUND      = '#1a1a3a';
  var COLOR_GROUND_LINE = '#4a3aff';
  var COLOR_STAR        = 'rgba(255,255,255,0.4)';

  // --- Estado ---
  var birdY      = 0;
  var birdVel    = 0;
  var birdX      = 0;
  var pipes      = [];     // array de { x, gapY, scored }
  var score      = 0;
  var gameOver   = false;
  var started    = false;  // aguarda primeiro input para começar
  var stars      = [];     // estrelas de fundo { x, y, s }

  // --- Construtor ---
  function FlappyBird(canvas) {
    GameBase.call(this, canvas);
    this._boundKeydown   = null;
    this._boundClick     = null;
    this._boundTouchstart = null;
  }
  GameBase.extend(FlappyBird);

  // ---------------------------------------------------------------
  // init
  // ---------------------------------------------------------------
  FlappyBird.prototype.init = function () {
    var playH = this.height - GROUND_H;

    birdX    = Math.floor(this.width * 0.2);
    birdY    = Math.floor(playH / 2);
    birdVel  = 0;
    pipes    = [];
    score    = 0;
    gameOver = false;
    started  = false;

    // Gerar estrelas de fundo
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.floor(Math.random() * this.width),
        y: Math.floor(Math.random() * (playH - 10)),
        s: Math.random() < 0.3 ? 2 : 1
      });
    }

    // Gerar canos iniciais
    this._spawnInitialPipes();

    updateHUD(score);
    hideOverlay();
    this._registerInput();
  };

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  FlappyBird.prototype.update = function (dt) {
    if (gameOver) return;
    if (!started) return;   // espera primeiro flap

    var playH = this.height - GROUND_H;

    // Gravidade
    birdVel += GRAVITY * dt;
    birdY   += birdVel * dt;

    // Colisão com teto
    if (birdY < 0) {
      birdY   = 0;
      birdVel = 0;
    }

    // Colisão com chão
    if (birdY + BIRD_SIZE >= playH) {
      birdY = playH - BIRD_SIZE;
      this._triggerGameOver();
      return;
    }

    // Mover canos
    for (var i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= PIPE_SPEED * dt;

      // Remover canos que saíram da tela
      if (pipes[i].x + PIPE_WIDTH < 0) {
        pipes.splice(i, 1);
        continue;
      }
    }

    // Adicionar novo cano quando necessário
    if (pipes.length > 0) {
      var lastPipe = pipes[pipes.length - 1];
      if (lastPipe.x < this.width - PIPE_SPACING) {
        this._addPipe(this.width);
      }
    } else {
      this._addPipe(this.width);
    }

    // Colisão com canos + pontuação
    var bx = Math.floor(birdX);
    var by = Math.floor(birdY);
    for (var j = 0; j < pipes.length; j++) {
      var p  = pipes[j];
      var px = Math.floor(p.x);
      var topEnd    = p.gapY;
      var bottomStart = p.gapY + PIPE_GAP;

      // Verificar colisão (AABB)
      if (bx + BIRD_SIZE > px && bx < px + PIPE_WIDTH) {
        if (by < topEnd || by + BIRD_SIZE > bottomStart) {
          SoundFX.hit();
          this._triggerGameOver();
          return;
        }
      }

      // Score: pássaro passou o cano
      if (!p.scored && px + PIPE_WIDTH < bx) {
        p.scored = true;
        score++;
        updateHUD(score);
        SoundFX.eat();
      }
    }
  };

  // ---------------------------------------------------------------
  // render
  // ---------------------------------------------------------------
  FlappyBird.prototype.render = function () {
    var ctx  = this.ctx;
    var w    = this.width;
    var h    = this.height;
    var playH = h - GROUND_H;

    // Fundo
    this.clear(COLOR_BG);

    // Estrelas
    ctx.fillStyle = COLOR_STAR;
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      ctx.fillRect(Math.floor(st.x), Math.floor(st.y), st.s, st.s);
    }

    // Canos
    for (var j = 0; j < pipes.length; j++) {
      drawPipe(ctx, pipes[j], playH);
    }

    // Chão
    drawGround(ctx, w, h, playH);

    // Pássaro
    drawBird(ctx, birdX, birdY);

    // Mensagem "TAP TO START" antes de começar
    if (!started && !gameOver) {
      drawStartMessage(ctx, w, playH);
    }
  };

  // ---------------------------------------------------------------
  // Helpers internos
  // ---------------------------------------------------------------
  FlappyBird.prototype._triggerGameOver = function () {
    if (gameOver) return;
    gameOver = true;
    SoundFX.gameOver();
    this.stop();
    showOverlay('GAME OVER', score);
  };

  FlappyBird.prototype._flap = function () {
    if (gameOver) return;
    if (!started) {
      started = true;
    }
    birdVel = FLAP_FORCE;
  };

  FlappyBird.prototype._addPipe = function (x) {
    var playH  = this.height - GROUND_H;
    var minGap = 50;
    var maxGap = playH - PIPE_GAP - 50;
    var gapY   = Math.floor(Math.random() * (maxGap - minGap)) + minGap;
    pipes.push({ x: x, gapY: gapY, scored: false });
  };

  FlappyBird.prototype._spawnInitialPipes = function () {
    var startX = Math.floor(this.width * 0.6);
    for (var x = startX; x < this.width + PIPE_SPACING * 2; x += PIPE_SPACING) {
      this._addPipe(x);
    }
  };

  FlappyBird.prototype._registerInput = function () {
    // Remover listeners anteriores
    if (this._boundKeydown) {
      window.removeEventListener('keydown', this._boundKeydown);
    }
    if (this._boundClick) {
      this.canvas.removeEventListener('click', this._boundClick);
    }
    if (this._boundTouchstart) {
      this.canvas.removeEventListener('touchstart', this._boundTouchstart);
    }

    var self = this;

    this._boundKeydown = function (e) {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        self._flap();
      }
    };

    this._boundClick = function (e) {
      e.preventDefault();
      self._flap();
    };

    this._boundTouchstart = function (e) {
      e.preventDefault();
      self._flap();
    };

    window.addEventListener('keydown', this._boundKeydown);
    this.canvas.addEventListener('click', this._boundClick);
    this.canvas.addEventListener('touchstart', this._boundTouchstart);
  };

  // ---------------------------------------------------------------
  // Funções de desenho — estilo 8-bit / pixel art puro
  // Zero shadowBlur, zero gradients, zero arc()
  // Somente fillRect e lineTo, coordenadas pixel-aligned
  // ---------------------------------------------------------------

  function drawBird(ctx, x, y) {
    var bx = Math.floor(x);
    var by = Math.floor(y);

    // Corpo do pássaro — quadrado 16x16
    ctx.fillStyle = COLOR_BIRD;
    ctx.fillRect(bx, by, BIRD_SIZE, BIRD_SIZE);

    // Borda escura para definição pixel art
    ctx.strokeStyle = '#009a94';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, BIRD_SIZE, BIRD_SIZE);

    // Olho — 2x2 branco no canto superior direito
    ctx.fillStyle = COLOR_BIRD_EYE;
    ctx.fillRect(bx + 10, by + 3, 2, 2);

    // Pupila — 1x1 preta
    ctx.fillStyle = '#000000';
    ctx.fillRect(bx + 11, by + 4, 1, 1);

    // Bico — 4x3 laranja
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(bx + BIRD_SIZE, by + 6, 4, 3);

    // Asa — quadrado 6x4 interno (cor mais escura)
    ctx.fillStyle = '#00c8c0';
    ctx.fillRect(bx + 2, by + 7, 6, 4);
  }

  function drawPipe(ctx, pipe, playH) {
    var px = Math.floor(pipe.x);
    var topH = Math.floor(pipe.gapY);
    var bottomY = Math.floor(pipe.gapY + PIPE_GAP);
    var bottomH = Math.floor(playH - bottomY);

    // Cano superior — retângulo sólido
    ctx.fillStyle = COLOR_PIPE;
    ctx.fillRect(px, 0, PIPE_WIDTH, topH);

    // Borda do cano superior
    ctx.strokeStyle = COLOR_PIPE_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, 0, PIPE_WIDTH - 2, topH);

    // Lábio do cano superior (mais largo)
    ctx.fillStyle = COLOR_PIPE;
    ctx.fillRect(px - 4, topH - 12, PIPE_WIDTH + 8, 12);
    ctx.strokeStyle = COLOR_PIPE_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 3, topH - 12, PIPE_WIDTH + 6, 12);

    // Linha central do cano superior (detalhe pixel art)
    ctx.fillStyle = '#2ad10f';
    ctx.fillRect(px + Math.floor(PIPE_WIDTH / 2) - 1, 0, 2, topH - 12);

    // Cano inferior — retângulo sólido
    ctx.fillStyle = COLOR_PIPE;
    ctx.fillRect(px, bottomY, PIPE_WIDTH, bottomH);

    // Borda do cano inferior
    ctx.strokeStyle = COLOR_PIPE_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, bottomY, PIPE_WIDTH - 2, bottomH);

    // Lábio do cano inferior
    ctx.fillStyle = COLOR_PIPE;
    ctx.fillRect(px - 4, bottomY, PIPE_WIDTH + 8, 12);
    ctx.strokeStyle = COLOR_PIPE_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 3, bottomY, PIPE_WIDTH + 6, 12);

    // Linha central do cano inferior (detalhe pixel art)
    ctx.fillStyle = '#2ad10f';
    ctx.fillRect(px + Math.floor(PIPE_WIDTH / 2) - 1, bottomY + 12, 2, bottomH - 12);
  }

  function drawGround(ctx, w, h, playH) {
    // Faixa sólida de chão
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, playH, w, GROUND_H);

    // Linha de borda superior do chão
    ctx.fillStyle = COLOR_GROUND_LINE;
    ctx.fillRect(0, playH, w, 2);

    // Textura pixel art no chão — pequenos quadrados
    ctx.fillStyle = 'rgba(74,58,255,0.15)';
    for (var x = 0; x < w; x += 16) {
      for (var row = 0; row < 2; row++) {
        var gy = playH + 6 + row * 14;
        if ((x / 16 + row) % 2 === 0) {
          ctx.fillRect(x + 2, gy, 6, 4);
        } else {
          ctx.fillRect(x + 8, gy + 4, 4, 3);
        }
      }
    }
  }

  function drawStartMessage(ctx, w, playH) {
    // Fundo do texto — retângulo semitransparente
    var msgW = 200;
    var msgH = 40;
    var mx = Math.floor((w - msgW) / 2);
    var my = Math.floor(playH / 2 + 40);

    ctx.fillStyle = 'rgba(10,10,26,0.7)';
    ctx.fillRect(mx, my, msgW, msgH);

    // Borda pixel art
    ctx.strokeStyle = '#4a3aff';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, msgW, msgH);

    // Texto
    ctx.fillStyle = '#00fff0';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PRESS SPACE / TAP', Math.floor(w / 2), Math.floor(my + msgH / 2));
    ctx.textAlign = 'left';   // reset
    ctx.textBaseline = 'alphabetic';
  }

  // ---------------------------------------------------------------
  // HUD / Overlay
  // ---------------------------------------------------------------
  function updateHUD(s) {
    var el = document.getElementById('score');
    if (el) el.textContent = s;
  }

  function showOverlay(title, s) {
    var o = document.getElementById('overlay');
    var t = document.getElementById('overlay-title');
    var sc = document.getElementById('overlay-score');
    if (o) o.classList.remove('overlay--hidden');
    if (t) t.textContent = title;
    if (sc) sc.textContent = 'Score: ' + s;
  }

  function hideOverlay() {
    var o = document.getElementById('overlay');
    if (o) o.classList.add('overlay--hidden');
  }

  // ---------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('game-canvas');
    var game = new FlappyBird(canvas);
    game.start();
    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });
    window._game = game;
  });

}());
