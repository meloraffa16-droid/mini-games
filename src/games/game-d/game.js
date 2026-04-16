(function () {
  'use strict';

  // --- Paleta 8-bit ---
  var COLOR_BG      = '#0a0a1a';
  var COLOR_PADDLE  = '#00fff0';   // cyan
  var COLOR_BALL    = '#ffff00';   // yellow
  var COLOR_CENTER  = '#4a3aff';   // accent purple
  var COLOR_SCORE   = '#e8e8ff';   // score text

  // --- Dimensoes ---
  var PADDLE_W      = 8;
  var PADDLE_H      = 60;
  var BALL_SIZE     = 8;
  var PADDLE_MARGIN = 16;          // distancia da borda lateral
  var BALL_BASE_SPD = 280;         // px/s
  var BALL_MAX_SPD  = BALL_BASE_SPD * 1.5;
  var PADDLE_SPD    = 320;         // px/s (jogador)
  var CPU_SPD       = 240;         // px/s (cpu)
  var CPU_REACT     = 0.08;        // delay em segundos para IA reagir
  var WIN_SCORE     = 11;
  var DASH_LEN      = 4;
  var DASH_GAP      = 8;

  // --- HUD helpers ---
  function updateHUD(score) {
    var el = document.getElementById('score');
    if (el) el.textContent = score;
  }
  function showOverlay(title, score) {
    var o = document.getElementById('overlay');
    var t = document.getElementById('overlay-title');
    var s = document.getElementById('overlay-score');
    if (o) o.classList.remove('overlay--hidden');
    if (t) t.textContent = title;
    if (s) s.textContent = 'Score: ' + score;
  }
  function hideOverlay() {
    var o = document.getElementById('overlay');
    if (o) o.classList.add('overlay--hidden');
  }

  // --- Construtor ---
  function Pong(canvas) {
    GameBase.call(this, canvas);

    // Estado do jogo
    this.playerY   = 0;
    this.cpuY      = 0;
    this.ballX     = 0;
    this.ballY     = 0;
    this.ballVX    = 0;
    this.ballVY    = 0;
    this.ballSpeed = BALL_BASE_SPD;
    this.scorePlayer = 0;
    this.scoreCpu    = 0;
    this.gameOver    = false;
    this.winner      = '';

    // CPU reaction
    this._cpuTargetY   = 0;
    this._cpuReactTimer = 0;

    // Entrada do jogador
    this._keys = {};
    var self = this;
    window.addEventListener('keydown', function (e) { self._keys[e.key] = true; });
    window.addEventListener('keyup',   function (e) { self._keys[e.key] = false; });
  }

  GameBase.extend(Pong);

  // --- init ---
  Pong.prototype.init = function () {
    this.scorePlayer = 0;
    this.scoreCpu    = 0;
    this.gameOver    = false;
    this.winner      = '';
    hideOverlay();
    this._resetRound(1);
    updateHUD('0 x 0');
  };

  // Reposiciona bola e paddles; dir: 1 = bola vai pra direita, -1 = esquerda
  Pong.prototype._resetRound = function (dir) {
    var cx = Math.floor(this.width  / 2);
    var cy = Math.floor(this.height / 2);

    this.playerY = cy - Math.floor(PADDLE_H / 2);
    this.cpuY    = cy - Math.floor(PADDLE_H / 2);

    this.ballX = cx - Math.floor(BALL_SIZE / 2);
    this.ballY = cy - Math.floor(BALL_SIZE / 2);

    this.ballSpeed = BALL_BASE_SPD;

    // Angulo aleatorio entre -35 e +35 graus
    var angle = (Math.random() * 70 - 35) * (Math.PI / 180);
    this.ballVX = dir * this.ballSpeed * Math.cos(angle);
    this.ballVY = this.ballSpeed * Math.sin(angle);

    this._cpuTargetY    = this.cpuY;
    this._cpuReactTimer = CPU_REACT;
  };

  // --- update ---
  Pong.prototype.update = function (dt) {
    if (this.gameOver) return;

    this._movePlayer(dt);
    this._moveCpu(dt);
    this._moveBall(dt);
  };

  Pong.prototype._movePlayer = function (dt) {
    var up   = this._keys['ArrowUp']   || this._keys['w'] || this._keys['W'];
    var down = this._keys['ArrowDown'] || this._keys['s'] || this._keys['S'];
    if (up)   this.playerY -= PADDLE_SPD * dt;
    if (down) this.playerY += PADDLE_SPD * dt;
    this.playerY = this._clampPaddle(this.playerY);
  };

  Pong.prototype._moveCpu = function (dt) {
    // Atualiza o alvo com delay para simular reacao humana
    this._cpuReactTimer -= dt;
    if (this._cpuReactTimer <= 0) {
      this._cpuReactTimer = CPU_REACT;
      // Erro proposital: CPU mira perto do centro da bola mas com pequena imprecisao
      var err = (Math.random() - 0.5) * (PADDLE_H * 0.35);
      this._cpuTargetY = this.ballY - Math.floor(PADDLE_H / 2) + err;
    }

    // Move em direcao ao alvo
    var diff = this._cpuTargetY - this.cpuY;
    var maxMove = CPU_SPD * dt;
    if (Math.abs(diff) <= maxMove) {
      this.cpuY = this._cpuTargetY;
    } else {
      this.cpuY += (diff > 0 ? 1 : -1) * maxMove;
    }
    this.cpuY = this._clampPaddle(this.cpuY);
  };

  Pong.prototype._clampPaddle = function (y) {
    if (y < 0) return 0;
    if (y + PADDLE_H > this.height) return this.height - PADDLE_H;
    return y;
  };

  Pong.prototype._moveBall = function (dt) {
    this.ballX += this.ballVX * dt;
    this.ballY += this.ballVY * dt;

    // Rebate topo/base
    if (this.ballY <= 0) {
      this.ballY  = 0;
      this.ballVY = Math.abs(this.ballVY);
    }
    if (this.ballY + BALL_SIZE >= this.height) {
      this.ballY  = this.height - BALL_SIZE;
      this.ballVY = -Math.abs(this.ballVY);
    }

    // Colisao com paddle do jogador (esquerda)
    var playerX = PADDLE_MARGIN;
    if (
      this.ballVX < 0 &&
      this.ballX <= playerX + PADDLE_W &&
      this.ballX + BALL_SIZE >= playerX &&
      this.ballY + BALL_SIZE >= this.playerY &&
      this.ballY <= this.playerY + PADDLE_H
    ) {
      this._bounceOffPaddle(playerX + PADDLE_W, this.playerY, 1);
    }

    // Colisao com paddle da CPU (direita)
    var cpuX = this.width - PADDLE_MARGIN - PADDLE_W;
    if (
      this.ballVX > 0 &&
      this.ballX + BALL_SIZE >= cpuX &&
      this.ballX <= cpuX + PADDLE_W &&
      this.ballY + BALL_SIZE >= this.cpuY &&
      this.ballY <= this.cpuY + PADDLE_H
    ) {
      this._bounceOffPaddle(cpuX - BALL_SIZE, this.cpuY, -1);
    }

    // Ponto: bola sai pela esquerda -> ponto CPU
    if (this.ballX + BALL_SIZE < 0) {
      this.scoreCpu++;
      this._checkWin('CPU WINS', this.scoreCpu);
    }

    // Ponto: bola sai pela direita -> ponto Jogador
    if (this.ballX > this.width) {
      this.scorePlayer++;
      this._checkWin('YOU WIN', this.scorePlayer);
    }
  };

  Pong.prototype._bounceOffPaddle = function (newBallX, paddleY, dirX) {
    // Reposiciona a bola fora do paddle
    this.ballX = newBallX;

    // Calcula angulo com base em onde a bola atingiu o paddle (normalizado -1..1)
    var paddleCenter = paddleY + PADDLE_H / 2;
    var ballCenter   = this.ballY + BALL_SIZE / 2;
    var relative     = (ballCenter - paddleCenter) / (PADDLE_H / 2);

    // Angulo maximo de 45 graus
    var maxAngle = 45 * (Math.PI / 180);
    var angle    = relative * maxAngle;

    // Acelera ligeiramente (cap em BALL_MAX_SPD)
    this.ballSpeed = Math.min(this.ballSpeed * 1.05, BALL_MAX_SPD);

    this.ballVX = dirX * this.ballSpeed * Math.cos(angle);
    this.ballVY = this.ballSpeed * Math.sin(angle);
  };

  Pong.prototype._checkWin = function (title, winnerScore) {
    updateHUD(this.scorePlayer + ' x ' + this.scoreCpu);
    if (winnerScore >= WIN_SCORE) {
      this.gameOver = true;
      this.winner   = title;
      var finalScore = (title === 'YOU WIN') ? this.scorePlayer : this.scoreCpu;
      showOverlay(title, finalScore);
    } else {
      // Proximo round: bola vai na direcao de quem perdeu o ponto
      var nextDir = (title === 'YOU WIN') ? -1 : 1;
      this._resetRound(nextDir);
    }
  };

  // --- render ---
  Pong.prototype.render = function () {
    var ctx = this.ctx;
    var w   = this.width;
    var h   = this.height;

    // Background
    this.clear(COLOR_BG);

    // Linha central pontilhada
    this._drawDashedLine(ctx, w, h);

    // Score no canvas (estilo arcade, centro)
    this._drawScore(ctx, w, h);

    // Paddles
    ctx.fillStyle = COLOR_PADDLE;
    ctx.fillRect(
      Math.floor(PADDLE_MARGIN),
      Math.floor(this.playerY),
      PADDLE_W,
      PADDLE_H
    );
    ctx.fillRect(
      Math.floor(this.width - PADDLE_MARGIN - PADDLE_W),
      Math.floor(this.cpuY),
      PADDLE_W,
      PADDLE_H
    );

    // Bola
    ctx.fillStyle = COLOR_BALL;
    ctx.fillRect(
      Math.floor(this.ballX),
      Math.floor(this.ballY),
      BALL_SIZE,
      BALL_SIZE
    );
  };

  Pong.prototype._drawDashedLine = function (ctx, w, h) {
    ctx.fillStyle = COLOR_CENTER;
    var x   = Math.floor(w / 2) - 2;
    var y   = 0;
    var seg = DASH_LEN + DASH_GAP;
    while (y < h) {
      ctx.fillRect(x, y, 4, Math.min(DASH_LEN, h - y));
      y += seg;
    }
  };

  Pong.prototype._drawScore = function (ctx, w, h) {
    ctx.fillStyle  = COLOR_SCORE;
    ctx.font       = '24px \'Press Start 2P\', monospace';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'top';

    var quarter = Math.floor(w / 4);
    var y       = Math.floor(h * 0.08);

    ctx.fillText(String(this.scorePlayer), quarter, y);
    ctx.fillText(String(this.scoreCpu),    w - quarter, y);
  };

  // --- Bootstrap ---
  document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('game-canvas');
    var game   = new Pong(canvas);
    game.start();
    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });
    window._game = game;
  });

}());
