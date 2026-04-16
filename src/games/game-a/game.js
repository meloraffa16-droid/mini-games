(function () {
  'use strict';

  // --- Constantes ---
  var CELL        = 20;       // tamanho de cada célula em px
  var MOVE_INTERVAL = 0.13;   // segundos entre cada passo da cobra
  var SCORE_PER_FOOD = 10;

  var COLOR_BG        = '#0d0d1a';
  var COLOR_GRID      = 'rgba(108,99,255,0.05)';
  var COLOR_HEAD      = '#6c63ff';
  var COLOR_BODY      = '#4d45cc';
  var COLOR_FOOD      = '#ff6584';
  var COLOR_FOOD_GLOW = 'rgba(255,101,132,0.35)';

  // --- Estado ---
  var snake        = [];   // array de {x, y}, cabeça no índice 0
  var dir          = { x: 1, y: 0 };
  var nextDir      = { x: 1, y: 0 };
  var food         = { x: 0, y: 0 };
  var score        = 0;
  var moveTimer    = 0;
  var foodPulse    = 0;    // acumulador para animação da comida
  var gameOver     = false;

  // --- Construtor ---
  function Snake(canvas) {
    GameBase.call(this, canvas);
    this._boundKeydown = null;
  }
  GameBase.extend(Snake);

  // ---------------------------------------------------------------
  // init
  // ---------------------------------------------------------------
  Snake.prototype.init = function () {
    var cols = Math.floor(this.width  / CELL);
    var rows = Math.floor(this.height / CELL);

    // Cobra começa no centro, com 3 segmentos apontando para a direita
    var startX = Math.floor(cols / 2);
    var startY = Math.floor(rows / 2);
    snake = [
      { x: startX,     y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];

    dir      = { x: 1, y: 0 };
    nextDir  = { x: 1, y: 0 };
    score    = 0;
    moveTimer = 0;
    foodPulse = 0;
    gameOver  = false;

    updateHUD();
    hideOverlay();
    spawnFood(cols, rows);
    this._registerKeys();
  };

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  Snake.prototype.update = function (dt) {
    if (gameOver) return;

    foodPulse += dt * 3.5;   // velocidade da pulsação

    moveTimer += dt;
    if (moveTimer < MOVE_INTERVAL) return;
    moveTimer -= MOVE_INTERVAL;

    // Aplica a direção pendente (impede inversão de 180°)
    if (!(nextDir.x === -dir.x && nextDir.y === -dir.y)) {
      dir.x = nextDir.x;
      dir.y = nextDir.y;
    }

    var cols = Math.floor(this.width  / CELL);
    var rows = Math.floor(this.height / CELL);

    var head = snake[0];
    var newHead = { x: head.x + dir.x, y: head.y + dir.y };

    // Colisão com parede
    if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
      this._triggerGameOver();
      return;
    }

    // Colisão com o corpo (ignora a calda que vai desaparecer)
    for (var i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
        this._triggerGameOver();
        return;
      }
    }

    // Move: insere nova cabeça
    snake.unshift(newHead);

    // Comeu a comida?
    if (newHead.x === food.x && newHead.y === food.y) {
      score += SCORE_PER_FOOD;
      updateHUD();
      spawnFood(cols, rows);
      // Não remove a calda → cobra cresce
    } else {
      snake.pop();
    }
  };

  // ---------------------------------------------------------------
  // render
  // ---------------------------------------------------------------
  Snake.prototype.render = function () {
    this.clear(COLOR_BG);
    var ctx = this.ctx;

    drawGrid(ctx, this.width, this.height);
    drawFood(ctx, food, foodPulse);
    drawSnake(ctx, snake);
  };

  // ---------------------------------------------------------------
  // Helpers internos
  // ---------------------------------------------------------------
  Snake.prototype._triggerGameOver = function () {
    gameOver = true;
    this.stop();
    showOverlay('Game Over', score);
  };

  Snake.prototype._registerKeys = function () {
    // Remove listener anterior se existir
    if (this._boundKeydown) {
      window.removeEventListener('keydown', this._boundKeydown);
    }
    var self = this;
    this._boundKeydown = function (e) {
      self._handleKey(e);
    };
    window.addEventListener('keydown', this._boundKeydown);
  };

  Snake.prototype._handleKey = function (e) {
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': nextDir = { x:  0, y: -1 }; break;
      case 'ArrowDown':  case 's': case 'S': nextDir = { x:  0, y:  1 }; break;
      case 'ArrowLeft':  case 'a': case 'A': nextDir = { x: -1, y:  0 }; break;
      case 'ArrowRight': case 'd': case 'D': nextDir = { x:  1, y:  0 }; break;
    }
    // Evita scroll da página pelas setas
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) !== -1) {
      e.preventDefault();
    }
  };

  // ---------------------------------------------------------------
  // Funções de desenho
  // ---------------------------------------------------------------
  function drawGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth   = 1;
    for (var x = 0; x <= w; x += CELL) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (var y = 0; y <= h; y += CELL) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSnake(ctx, segments) {
    var radius = CELL * 0.35;
    for (var i = segments.length - 1; i >= 0; i--) {
      var seg = segments[i];
      var isHead = (i === 0);
      ctx.save();
      ctx.fillStyle = isHead ? COLOR_HEAD : COLOR_BODY;

      // Borda arredondada em todos os segmentos
      var x = seg.x * CELL + 1;
      var y = seg.y * CELL + 1;
      var size = CELL - 2;
      roundRect(ctx, x, y, size, size, radius);
      ctx.fill();

      // Olhos na cabeça
      if (isHead) {
        drawEyes(ctx, seg);
      }
      ctx.restore();
    }
  }

  function drawEyes(ctx, seg) {
    ctx.fillStyle = '#fff';
    var eyeR = CELL * 0.09;
    var cx = seg.x * CELL + CELL / 2;
    var cy = seg.y * CELL + CELL / 2;

    // Posiciona os olhos de acordo com a direção atual
    var eyeOffX = dir.y !== 0 ? CELL * 0.18 : 0;
    var eyeOffY = dir.x !== 0 ? CELL * 0.18 : 0;
    var fwdX    = dir.x * CELL * 0.15;
    var fwdY    = dir.y * CELL * 0.15;

    ctx.beginPath();
    ctx.arc(cx + fwdX - eyeOffX, cy + fwdY - eyeOffY, eyeR * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + fwdX + eyeOffX, cy + fwdY + eyeOffY, eyeR * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Pupila
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx + fwdX - eyeOffX + dir.x * eyeR, cy + fwdY - eyeOffY + dir.y * eyeR, eyeR * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + fwdX + eyeOffX + dir.x * eyeR, cy + fwdY + eyeOffY + dir.y * eyeR, eyeR * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFood(ctx, f, pulse) {
    var scale  = 1 + 0.18 * Math.sin(pulse);
    var cx     = f.x * CELL + CELL / 2;
    var cy     = f.y * CELL + CELL / 2;
    var radius = (CELL / 2 - 2) * scale;

    ctx.save();
    // Brilho externo
    var glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.6);
    glow.addColorStop(0, COLOR_FOOD_GLOW);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Círculo principal
    ctx.fillStyle = COLOR_FOOD;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Brilhinho interno
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Utilitário: rectângulo com bordas arredondadas
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ---------------------------------------------------------------
  // Spawn de comida (nunca em cima da cobra)
  // ---------------------------------------------------------------
  function spawnFood(cols, rows) {
    var pos;
    var attempts = 0;
    do {
      pos = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows)
      };
      attempts++;
    } while (attempts < 500 && onSnake(pos));
    food = pos;
    foodPulse = 0;
  }

  function onSnake(pos) {
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x === pos.x && snake[i].y === pos.y) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------
  // HUD / Overlay
  // ---------------------------------------------------------------
  function updateHUD() {
    var el = document.getElementById('score');
    if (el) el.textContent = score;
  }

  function showOverlay(title, finalScore) {
    var overlay = document.getElementById('overlay');
    var oTitle  = document.getElementById('overlay-title');
    var oScore  = document.getElementById('overlay-score');
    if (overlay) overlay.classList.remove('overlay--hidden');
    if (oTitle)  oTitle.textContent  = title;
    if (oScore)  oScore.textContent  = 'Pontuação: ' + finalScore;
  }

  function hideOverlay() {
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('overlay--hidden');
  }

  // ---------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('game-canvas');
    var game   = new Snake(canvas);
    game.start();

    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });

    window._game = game;
  });

}());
