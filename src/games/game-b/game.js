/**
 * game-b/game.js — Breakout (Agente 3)
 * Vanilla JS, zero dependências externas.
 */
(function () {
  'use strict';

  // ─── Constantes visuais ────────────────────────────────────────────────────
  var CANVAS_BG      = '#0d0d1a';
  var COLOR_ACCENT   = '#6c63ff';
  var COLOR_PINK     = '#ff6584';
  var COLOR_CYAN     = '#00e5ff';
  var COLOR_GREEN    = '#00e676';
  var COLOR_PADDLE_A = '#6c63ff';
  var COLOR_PADDLE_B = '#4d45cc';

  // Cores por linha de blocos (4 linhas)
  var ROW_COLORS = [COLOR_PINK, COLOR_ACCENT, COLOR_CYAN, COLOR_GREEN];

  // ─── Constantes de jogo ────────────────────────────────────────────────────
  var PADDLE_H        = 14;
  var PADDLE_W_RATIO  = 0.14;   // largura = 14 % da largura do canvas
  var PADDLE_Y_OFFSET = 32;     // distância da raquete ao fundo
  var PADDLE_SPEED    = 600;    // px/s (teclado)

  var BALL_RADIUS     = 8;
  var BALL_SPEED_BASE = 340;    // px/s
  var BALL_SPEED_MAX_MULT = 1.5;

  var COLS            = 8;
  var ROWS            = 4;
  var BRICK_MARGIN_T  = 60;     // topo dos blocos
  var BRICK_GAP       = 6;
  var BRICK_H         = 22;
  var BRICK_RADIUS    = 4;

  var SCORE_PER_BRICK = 10;
  var SPEED_INC       = 0.018;  // incremento fracionário por bloco destruído

  // ─── Constructor ──────────────────────────────────────────────────────────
  function Breakout(canvas) {
    GameBase.call(this, canvas);

    // Estado do teclado
    this._keys = {};

    // Input de mouse/touch: coordenada x do cursor
    this._mouseX = null;

    var self = this;

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      self._mouseX = e.clientX - rect.left;
    });

    // Suporte a touch (mobile)
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      self._mouseX = e.touches[0].clientX - rect.left;
    }, { passive: false });

    document.addEventListener('keydown', function (e) {
      self._keys[e.code] = true;
    });
    document.addEventListener('keyup', function (e) {
      self._keys[e.code] = false;
    });
  }

  GameBase.extend(Breakout);

  // ─── init ─────────────────────────────────────────────────────────────────
  Breakout.prototype.init = function () {
    var W = this.width;
    var H = this.height;

    // Raquete
    this.paddleW = W * PADDLE_W_RATIO;
    this.paddleX = (W - this.paddleW) / 2;
    this.paddleY = H - PADDLE_Y_OFFSET - PADDLE_H;

    // Bola
    this.ballX  = W / 2;
    this.ballY  = this.paddleY - BALL_RADIUS - 2;
    this.ballVX = BALL_SPEED_BASE * (Math.random() < 0.5 ? 1 : -1);
    this.ballVY = -BALL_SPEED_BASE;
    this.ballSpeed = BALL_SPEED_BASE;

    // Blocos
    this.bricks = this._buildBricks(W);
    this.totalBricks = this.bricks.length;

    // Score
    this.score = 0;
    this._updateHUD();
    this._hideOverlay();
  };

  // ─── Construção dos blocos ─────────────────────────────────────────────────
  Breakout.prototype._buildBricks = function (W) {
    var bricks = [];
    var totalGapW  = BRICK_GAP * (COLS + 1);
    var brickW     = (W - totalGapW) / COLS;

    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        var bx = BRICK_GAP + col * (brickW + BRICK_GAP);
        var by = BRICK_MARGIN_T + row * (BRICK_H + BRICK_GAP);
        bricks.push({
          x:       bx,
          y:       by,
          w:       brickW,
          h:       BRICK_H,
          color:   ROW_COLORS[row % ROW_COLORS.length],
          alive:   true
        });
      }
    }
    return bricks;
  };

  // ─── update ───────────────────────────────────────────────────────────────
  Breakout.prototype.update = function (dt) {
    var W = this.width;
    var H = this.height;

    // ── Mover raquete ──────────────────────────────────────────────────────
    if (this._mouseX !== null) {
      // Mouse controla o centro da raquete
      this.paddleX = this._mouseX - this.paddleW / 2;
    } else {
      if (this._keys['ArrowLeft']  || this._keys['KeyA']) {
        this.paddleX -= PADDLE_SPEED * dt;
      }
      if (this._keys['ArrowRight'] || this._keys['KeyD']) {
        this.paddleX += PADDLE_SPEED * dt;
      }
    }

    // Teclado pode corrigir mesmo com mouse ativo
    if (this._keys['ArrowLeft']  || this._keys['KeyA']) {
      this.paddleX -= PADDLE_SPEED * dt;
    }
    if (this._keys['ArrowRight'] || this._keys['KeyD']) {
      this.paddleX += PADDLE_SPEED * dt;
    }

    // Limitar raquete à tela
    this.paddleX = Math.max(0, Math.min(W - this.paddleW, this.paddleX));

    // ── Mover bola ────────────────────────────────────────────────────────
    this.ballX += this.ballVX * dt;
    this.ballY += this.ballVY * dt;

    // Paredes laterais
    if (this.ballX - BALL_RADIUS < 0) {
      this.ballX  = BALL_RADIUS;
      this.ballVX = Math.abs(this.ballVX);
    }
    if (this.ballX + BALL_RADIUS > W) {
      this.ballX  = W - BALL_RADIUS;
      this.ballVX = -Math.abs(this.ballVX);
    }

    // Parede superior
    if (this.ballY - BALL_RADIUS < 0) {
      this.ballY  = BALL_RADIUS;
      this.ballVY = Math.abs(this.ballVY);
    }

    // Colisão com raquete
    this._collidePaddle();

    // Colisão com blocos
    this._collideBricks();

    // Bola saiu pela base → Game Over
    if (this.ballY - BALL_RADIUS > H) {
      this._showOverlay('Game Over', this.score);
      this.stop();
      return;
    }

    // Todos os blocos destruídos → Vitória
    var alive = 0;
    for (var i = 0; i < this.bricks.length; i++) {
      if (this.bricks[i].alive) { alive++; break; }
    }
    if (alive === 0) {
      this._showOverlay('Você Venceu!', this.score);
      this.stop();
    }
  };

  // ─── Colisão bola × raquete ────────────────────────────────────────────────
  Breakout.prototype._collidePaddle = function () {
    var px = this.paddleX;
    var py = this.paddleY;
    var pw = this.paddleW;
    var ph = PADDLE_H;

    var bx = this.ballX;
    var by = this.ballY;
    var r  = BALL_RADIUS;

    // AABB check
    if (bx + r < px || bx - r > px + pw) return;
    if (by + r < py || by - r > py + ph) return;

    // A bola só rebate se estiver descendo e tocar o topo da raquete
    if (this.ballVY > 0 && by < py + ph / 2) {
      // Ângulo de reflexão baseado na posição relativa de impacto
      var relHit = ((bx - px) / pw) - 0.5;   // -0.5 … 0.5
      var angle  = relHit * Math.PI * 0.65;   // ±58.5°
      var speed  = Math.sqrt(this.ballVX * this.ballVX + this.ballVY * this.ballVY);

      this.ballVX = speed * Math.sin(angle);
      this.ballVY = -Math.abs(speed * Math.cos(angle));

      // Empurrar a bola para fora da raquete
      this.ballY = py - r - 1;
    }
  };

  // ─── Colisão bola × blocos (AABB com detecção de lado) ────────────────────
  Breakout.prototype._collideBricks = function () {
    var bx = this.ballX;
    var by = this.ballY;
    var r  = BALL_RADIUS;

    for (var i = 0; i < this.bricks.length; i++) {
      var brick = this.bricks[i];
      if (!brick.alive) continue;

      // Teste AABB
      if (bx + r < brick.x || bx - r > brick.x + brick.w) continue;
      if (by + r < brick.y || by - r > brick.y + brick.h) continue;

      brick.alive = false;

      // Determinar qual lado foi atingido calculando a sobreposição em cada eixo
      var overlapLeft   = (bx + r) - brick.x;
      var overlapRight  = (brick.x + brick.w) - (bx - r);
      var overlapTop    = (by + r) - brick.y;
      var overlapBottom = (brick.y + brick.h) - (by - r);

      var minOverlapX = Math.min(overlapLeft, overlapRight);
      var minOverlapY = Math.min(overlapTop,  overlapBottom);

      if (minOverlapX < minOverlapY) {
        // Colisão lateral → inverte VX
        this.ballVX = -this.ballVX;
      } else {
        // Colisão vertical (topo/base) → inverte VY
        this.ballVY = -this.ballVY;
      }

      // Pontuar e acelerar
      this.score += SCORE_PER_BRICK;
      this._updateHUD();
      this._increaseSpeed();

      // Só um bloco por frame para evitar tunelamento
      break;
    }
  };

  // ─── Aumentar velocidade ───────────────────────────────────────────────────
  Breakout.prototype._increaseSpeed = function () {
    var maxSpeed = BALL_SPEED_BASE * BALL_SPEED_MAX_MULT;
    var speed    = Math.sqrt(this.ballVX * this.ballVX + this.ballVY * this.ballVY);
    var newSpeed = Math.min(speed * (1 + SPEED_INC), maxSpeed);
    var ratio    = newSpeed / speed;
    this.ballVX *= ratio;
    this.ballVY *= ratio;
  };

  // ─── render ───────────────────────────────────────────────────────────────
  Breakout.prototype.render = function () {
    var ctx = this.ctx;
    var W   = this.width;
    var H   = this.height;

    this.clear(CANVAS_BG);

    // Grade de fundo sutil
    this._drawGrid(ctx, W, H);

    // Blocos
    this._drawBricks(ctx);

    // Raquete
    this._drawPaddle(ctx);

    // Bola
    this._drawBall(ctx);
  };

  // ─── Grade de fundo ────────────────────────────────────────────────────────
  Breakout.prototype._drawGrid = function (ctx, W, H) {
    ctx.save();
    ctx.strokeStyle = 'rgba(108,99,255,0.04)';
    ctx.lineWidth   = 1;
    var step = 40;
    for (var x = 0; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (var y = 0; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // ─── Blocos ────────────────────────────────────────────────────────────────
  Breakout.prototype._drawBricks = function (ctx) {
    ctx.save();
    for (var i = 0; i < this.bricks.length; i++) {
      var b = this.bricks[i];
      if (!b.alive) continue;

      // Brilho sutil
      ctx.shadowColor = b.color;
      ctx.shadowBlur  = 6;

      this._roundRect(ctx, b.x, b.y, b.w, b.h, BRICK_RADIUS);
      ctx.fillStyle = b.color;
      ctx.fill();

      // Borda interna mais clara
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    }
    ctx.restore();
  };

  // ─── Raquete ───────────────────────────────────────────────────────────────
  Breakout.prototype._drawPaddle = function (ctx) {
    ctx.save();
    var x  = this.paddleX;
    var y  = this.paddleY;
    var w  = this.paddleW;
    var h  = PADDLE_H;
    var r  = h / 2;

    var grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0,   COLOR_PADDLE_A);
    grad.addColorStop(1,   COLOR_PADDLE_B);

    ctx.shadowColor = COLOR_PADDLE_A;
    ctx.shadowBlur  = 12;

    this._roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  };

  // ─── Bola ──────────────────────────────────────────────────────────────────
  Breakout.prototype._drawBall = function (ctx) {
    ctx.save();
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur  = 18;

    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_CYAN;
    ctx.fill();

    // Núcleo brilhante
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.ballX - 2, this.ballY - 2, BALL_RADIUS * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();

    ctx.restore();
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  Breakout.prototype._roundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  Breakout.prototype._updateHUD = function () {
    var el = document.getElementById('score');
    if (el) el.textContent = this.score;
  };

  Breakout.prototype._hideOverlay = function () {
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('overlay--hidden');
  };

  Breakout.prototype._showOverlay = function (title, score) {
    var overlay     = document.getElementById('overlay');
    var titleEl     = document.getElementById('overlay-title');
    var scoreEl     = document.getElementById('overlay-score');
    if (titleEl)  titleEl.textContent  = title;
    if (scoreEl)  scoreEl.textContent  = 'Pontuação: ' + score;
    if (overlay)  overlay.classList.remove('overlay--hidden');
  };

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('game-canvas');
    var game   = new Breakout(canvas);
    game.start();
    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });
    window._game = game;
  });

}());
