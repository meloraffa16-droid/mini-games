(function () {
  'use strict';

  // --- Constantes ---
  var CELL          = 20;      // tamanho de cada célula em px
  var MOVE_INTERVAL = 0.13;    // segundos entre cada passo da cobra
  var SCORE_PER_FOOD = 10;

  // --- Paleta 8-bit ---
  var COLOR_BG    = '#0a0a1a';
  var COLOR_GRID  = 'rgba(74,58,255,0.08)';
  var COLOR_HEAD  = '#00fff0';   // cyan
  var COLOR_BODY  = '#4a3aff';   // accent purple
  var COLOR_FOOD  = '#ff2d6f';   // pink

  // Pulsação discreta da comida: 3 tamanhos em steps fixos
  var FOOD_PULSE_STEPS  = [0, 1, 2, 1];   // offset em px (cresce/encolhe em degraus)
  var FOOD_PULSE_SPEED  = 6;              // steps por segundo

  // --- Estado ---
  var snake      = [];   // array de {x, y}, cabeça no índice 0
  var dir        = { x: 1, y: 0 };
  var nextDir    = { x: 1, y: 0 };
  var food       = { x: 0, y: 0 };
  var score      = 0;
  var moveTimer  = 0;
  var foodPulse  = 0;    // acumulador para animação discreta da comida
  var gameOver   = false;

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

    // Acumula tempo para a pulsação discreta da comida
    foodPulse += dt * FOOD_PULSE_SPEED;

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

    var head    = snake[0];
    var newHead = { x: head.x + dir.x, y: head.y + dir.y };

    // Colisão com parede
    if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
      this._triggerGameOver();
      return;
    }

    // Colisão com o corpo (ignora a cauda que vai desaparecer)
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
      SoundFX.eat();
      score += SCORE_PER_FOOD;
      updateHUD();
      spawnFood(cols, rows);
      // Não remove a cauda → cobra cresce
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
    SoundFX.gameOver();
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
  // Funções de desenho — estilo 8-bit / pixel art
  // ---------------------------------------------------------------

  // Grid de fundo: linhas de 1px a cada CELL pixels
  function drawGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth   = 1;
    for (var x = 0; x <= w; x += CELL) {
      var px = Math.floor(x);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
    for (var y = 0; y <= h; y += CELL) {
      var py = Math.floor(y);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Cobra: blocos quadrados sólidos, cabeça em cor diferente + 2 olhos de 2x2px
  function drawSnake(ctx, segments) {
    ctx.save();
    for (var i = segments.length - 1; i >= 0; i--) {
      var seg   = segments[i];
      var isHead = (i === 0);

      // Bloco principal — pixel-aligned, sem arredondamento
      var bx   = Math.floor(seg.x * CELL) + 1;
      var by   = Math.floor(seg.y * CELL) + 1;
      var size = CELL - 2;

      ctx.fillStyle = isHead ? COLOR_HEAD : COLOR_BODY;
      ctx.fillRect(bx, by, size, size);

      // Borda interna mais escura (efeito pixel art de profundidade)
      ctx.strokeStyle = isHead ? 'rgba(0,200,210,0.5)' : 'rgba(30,20,180,0.6)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(bx + 1, by + 1, size - 2, size - 2);

      // Olhos na cabeça: 2 pixels brancos de 2x2
      if (isHead) {
        drawEyes(ctx, seg);
      }
    }
    ctx.restore();
  }

  // Olhos: 2 quadradinhos brancos de 2x2px, posicionados de acordo com a direção
  function drawEyes(ctx, seg) {
    var cx = Math.floor(seg.x * CELL + CELL / 2);
    var cy = Math.floor(seg.y * CELL + CELL / 2);

    // Deslocamento lateral (perpendicular à direção)
    var latX = dir.y !== 0 ? 3 : 0;
    var latY = dir.x !== 0 ? 3 : 0;

    // Deslocamento para frente
    var fwdX = Math.floor(dir.x * 3);
    var fwdY = Math.floor(dir.y * 3);

    ctx.fillStyle = '#ffffff';

    // Olho esquerdo
    ctx.fillRect(
      Math.floor(cx + fwdX - latX) - 1,
      Math.floor(cy + fwdY - latY) - 1,
      2, 2
    );

    // Olho direito
    ctx.fillRect(
      Math.floor(cx + fwdX + latX) - 1,
      Math.floor(cy + fwdY + latY) - 1,
      2, 2
    );
  }

  // Comida: quadrado sólido que pulsa em 3 tamanhos discretos (sem smooth, sem glow)
  function drawFood(ctx, f, pulse) {
    // Índice do step discreto (0,1,2,1,0,1,2,...)
    var stepIdx = Math.floor(pulse) % FOOD_PULSE_STEPS.length;
    var offset  = FOOD_PULSE_STEPS[stepIdx];   // 0, 1 ou 2 px extras de cada lado

    var baseSize = CELL - 4;
    var size     = baseSize + offset * 2;
    var fx       = Math.floor(f.x * CELL + (CELL - size) / 2);
    var fy       = Math.floor(f.y * CELL + (CELL - size) / 2);

    ctx.save();

    // Quadrado principal
    ctx.fillStyle = COLOR_FOOD;
    ctx.fillRect(fx, fy, size, size);

    // Borda sólida de 2px (cor mais escura da comida)
    ctx.strokeStyle = '#c4004a';
    ctx.lineWidth   = 2;
    ctx.strokeRect(fx + 1, fy + 1, size - 2, size - 2);

    // Highlight de 2x2 no canto superior esquerdo (detalhe pixel art)
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(Math.floor(fx + 2), Math.floor(fy + 2), 2, 2);

    ctx.restore();
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
    food      = pos;
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
