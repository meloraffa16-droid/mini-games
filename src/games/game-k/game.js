(function () {
  'use strict';

  // --- Constantes ---
  var CELL        = 4;        // 4x4px por célula
  var COLS        = 200;      // 800 / 4
  var ROWS        = 125;      // 500 / 4
  var TICK        = 0.04;     // segundos entre cada movimento
  var ROUNDS_TO_WIN = 3;      // melhor de 5 (primeiro a 3)

  // --- Paleta 8-bit ---
  var COLOR_BG       = '#0a0a1a';
  var COLOR_GRID     = 'rgba(74,58,255,0.06)';
  var COLOR_BORDER   = '#4a3aff';

  var PLAYER_HEAD    = '#00fff0';
  var PLAYER_TRAIL   = 'rgba(0,255,240,0.5)';
  var CPU_HEAD       = '#ff2d6f';
  var CPU_TRAIL      = 'rgba(255,45,111,0.5)';

  // Direções: 0=cima, 1=direita, 2=baixo, 3=esquerda
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];

  // --- Estado do jogo ---
  var grid;          // Uint8Array COLS*ROWS: 0=vazio, 1=jogador, 2=cpu
  var player, cpu;   // { x, y, dir }
  var playerWins;
  var cpuWins;
  var roundOver;
  var matchOver;
  var timer;
  var winner;        // 'player' | 'cpu' | 'draw'
  var roundDelay;    // delay antes de começar novo round

  // --- Construtor ---
  function Tron(canvas) {
    GameBase.call(this, canvas);
    this._boundKeydown = null;
  }
  GameBase.extend(Tron);

  // ---------------------------------------------------------------
  // Grid helpers
  // ---------------------------------------------------------------
  function gridIdx(x, y) {
    return y * COLS + x;
  }

  function gridGet(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return 255; // parede
    return grid[gridIdx(x, y)];
  }

  function gridSet(x, y, val) {
    grid[gridIdx(x, y)] = val;
  }

  function isBlocked(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    return grid[gridIdx(x, y)] !== 0;
  }

  function oppositeDir(d) {
    return (d + 2) % 4;
  }

  // ---------------------------------------------------------------
  // CPU IA — flood fill limitado para cada direção possível
  // ---------------------------------------------------------------
  function cpuChooseDir() {
    var bestDir = cpu.dir;
    var bestScore = -1;

    // Testa 3 direções (frente, esquerda, direita — nunca 180°)
    var dirs = [cpu.dir, (cpu.dir + 3) % 4, (cpu.dir + 1) % 4];

    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      var nx = cpu.x + DX[d];
      var ny = cpu.y + DY[d];

      if (isBlocked(nx, ny)) continue;

      var score = floodCount(nx, ny, 120);

      // Pequeno bônus para manter a direção atual (evita zigue-zague)
      if (d === cpu.dir) score += 2;

      if (score > bestScore) {
        bestScore = score;
        bestDir = d;
      }
    }

    return bestDir;
  }

  // Flood fill limitado — conta células livres acessíveis (BFS)
  function floodCount(startX, startY, maxCount) {
    var visited = {};
    var queue = [startX * 10000 + startY];
    visited[queue[0]] = true;
    var count = 0;

    while (queue.length > 0 && count < maxCount) {
      var key = queue.shift();
      var cx = Math.floor(key / 10000);
      var cy = key % 10000;
      count++;

      for (var d = 0; d < 4; d++) {
        var nx = cx + DX[d];
        var ny = cy + DY[d];
        var nk = nx * 10000 + ny;
        if (!visited[nk] && !isBlocked(nx, ny)) {
          visited[nk] = true;
          queue.push(nk);
        }
      }
    }

    return count;
  }

  // ---------------------------------------------------------------
  // init — reset de um round
  // ---------------------------------------------------------------
  Tron.prototype.init = function () {
    // Primeiro init: reset completo
    if (playerWins === undefined) {
      playerWins = 0;
      cpuWins = 0;
    }

    grid = new Uint8Array(COLS * ROWS);

    // Jogador começa à esquerda, indo para direita
    player = {
      x: Math.floor(COLS * 0.25),
      y: Math.floor(ROWS / 2),
      dir: 1,        // direita
      nextDir: 1
    };

    // CPU começa à direita, indo para esquerda
    cpu = {
      x: Math.floor(COLS * 0.75),
      y: Math.floor(ROWS / 2),
      dir: 3,        // esquerda
      nextDir: 3
    };

    // Marca posições iniciais no grid
    gridSet(player.x, player.y, 1);
    gridSet(cpu.x, cpu.y, 2);

    roundOver = false;
    matchOver = false;
    timer = 0;
    winner = null;
    roundDelay = 0;

    updateHUD();
    hideOverlay();
    this._registerKeys();
  };

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  Tron.prototype.update = function (dt) {
    if (matchOver) return;

    // Delay entre rounds
    if (roundDelay > 0) {
      roundDelay -= dt;
      if (roundDelay <= 0) {
        // Novo round
        grid = new Uint8Array(COLS * ROWS);
        player = {
          x: Math.floor(COLS * 0.25),
          y: Math.floor(ROWS / 2),
          dir: 1,
          nextDir: 1
        };
        cpu = {
          x: Math.floor(COLS * 0.75),
          y: Math.floor(ROWS / 2),
          dir: 3,
          nextDir: 3
        };
        gridSet(player.x, player.y, 1);
        gridSet(cpu.x, cpu.y, 2);
        roundOver = false;
        winner = null;
        SoundFX.newWave();
      }
      return;
    }

    if (roundOver) return;

    timer += dt;
    if (timer < TICK) return;
    timer -= TICK;

    // Aplica direção pendente do jogador (impede 180°)
    if (oppositeDir(player.nextDir) !== player.dir) {
      player.dir = player.nextDir;
    }

    // CPU decide direção
    cpu.dir = cpuChooseDir();

    // Calcula novas posições
    var pnx = player.x + DX[player.dir];
    var pny = player.y + DY[player.dir];
    var cnx = cpu.x + DX[cpu.dir];
    var cny = cpu.y + DY[cpu.dir];

    var playerDead = isBlocked(pnx, pny);
    var cpuDead = isBlocked(cnx, cny);

    // Colisão frontal (ambos tentam ocupar a mesma célula)
    if (!playerDead && !cpuDead && pnx === cnx && pny === cny) {
      playerDead = true;
      cpuDead = true;
    }

    if (playerDead && cpuDead) {
      // Empate — ninguém ganha o round
      winner = 'draw';
      this._endRound();
      return;
    } else if (playerDead) {
      winner = 'cpu';
      cpuWins++;
      this._endRound();
      return;
    } else if (cpuDead) {
      winner = 'player';
      playerWins++;
      this._endRound();
      return;
    }

    // Move
    player.x = pnx;
    player.y = pny;
    gridSet(player.x, player.y, 1);

    cpu.x = cnx;
    cpu.y = cny;
    gridSet(cpu.x, cpu.y, 2);
  };

  // ---------------------------------------------------------------
  // _endRound
  // ---------------------------------------------------------------
  Tron.prototype._endRound = function () {
    roundOver = true;
    updateHUD();

    SoundFX.explosion();

    // Verifica se o match acabou
    if (playerWins >= ROUNDS_TO_WIN) {
      matchOver = true;
      this.stop();
      setTimeout(function () {
        SoundFX.win();
      }, 400);
      showOverlay('YOU WIN!', playerWins + ' x ' + cpuWins);
    } else if (cpuWins >= ROUNDS_TO_WIN) {
      matchOver = true;
      this.stop();
      setTimeout(function () {
        SoundFX.gameOver();
      }, 400);
      showOverlay('GAME OVER', cpuWins + ' x ' + playerWins);
    } else {
      // Próximo round após breve pausa
      if (winner === 'player') {
        setTimeout(function () { SoundFX.win(); }, 300);
      } else if (winner === 'cpu') {
        setTimeout(function () { SoundFX.gameOver(); }, 300);
      }
      roundDelay = 1.5; // 1.5s de pausa entre rounds
    }
  };

  // ---------------------------------------------------------------
  // render
  // ---------------------------------------------------------------
  Tron.prototype.render = function () {
    var ctx = this.ctx;
    var w = this.width;
    var h = this.height;

    // BG
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    // Grid sutil
    drawGrid(ctx, w, h);

    // Borda da arena
    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    // Rastros e cabeças
    drawTrails(ctx);
    drawHead(ctx, player.x, player.y, PLAYER_HEAD);
    drawHead(ctx, cpu.x, cpu.y, CPU_HEAD);

    // Info do round durante o jogo
    drawRoundInfo(ctx, w);

    // Mensagem de fim de round (antes do próximo)
    if (roundOver && !matchOver) {
      drawRoundResult(ctx, w, h);
    }
  };

  // ---------------------------------------------------------------
  // Funções de desenho — 8-bit fillRect ONLY
  // ---------------------------------------------------------------
  function drawGrid(ctx, w, h) {
    ctx.fillStyle = COLOR_GRID;
    var x, y;
    for (x = 0; x < w; x += CELL) {
      ctx.fillRect(x, 0, 1, h);
    }
    for (y = 0; y < h; y += CELL) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  function drawTrails(ctx) {
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var val = grid[gridIdx(x, y)];
        if (val === 0) continue;

        // Não desenha sobre a cabeça (desenhada separado com cor cheia)
        if (val === 1 && x === player.x && y === player.y) continue;
        if (val === 2 && x === cpu.x && y === cpu.y) continue;

        ctx.fillStyle = val === 1 ? PLAYER_TRAIL : CPU_TRAIL;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  function drawHead(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
  }

  function drawRoundInfo(ctx, w) {
    // Placar no topo: "P 0 x 0 CPU  |  Round X/5"
    ctx.fillStyle = 'rgba(0,255,240,0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('P: ' + playerWins, 8, 14);

    ctx.fillStyle = 'rgba(255,45,111,0.7)';
    ctx.textAlign = 'right';
    ctx.fillText('CPU: ' + cpuWins, w - 8, 14);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    var totalRounds = playerWins + cpuWins;
    ctx.fillText('ROUND ' + (totalRounds + 1) + '/5', w / 2, 14);
  }

  function drawRoundResult(ctx, w, h) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(10,10,26,0.6)';
    ctx.fillRect(0, h / 2 - 20, w, 40);

    ctx.font = '14px monospace';
    ctx.textAlign = 'center';

    if (winner === 'player') {
      ctx.fillStyle = PLAYER_HEAD;
      ctx.fillText('ROUND WIN!', w / 2, h / 2 + 5);
    } else if (winner === 'cpu') {
      ctx.fillStyle = CPU_HEAD;
      ctx.fillText('ROUND LOST', w / 2, h / 2 + 5);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('DRAW', w / 2, h / 2 + 5);
    }
  }

  // ---------------------------------------------------------------
  // Controles
  // ---------------------------------------------------------------
  Tron.prototype._registerKeys = function () {
    if (this._boundKeydown) {
      window.removeEventListener('keydown', this._boundKeydown);
    }
    var self = this;
    this._boundKeydown = function (e) {
      self._handleKey(e);
    };
    window.addEventListener('keydown', this._boundKeydown);
  };

  Tron.prototype._handleKey = function (e) {
    var newDir = -1;
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': newDir = 0; break; // cima
      case 'ArrowRight': case 'd': case 'D': newDir = 1; break; // direita
      case 'ArrowDown':  case 's': case 'S': newDir = 2; break; // baixo
      case 'ArrowLeft':  case 'a': case 'A': newDir = 3; break; // esquerda
    }

    if (newDir !== -1) {
      // Impede inversão 180°
      if (oppositeDir(newDir) !== player.dir) {
        player.nextDir = newDir;
      }
      e.preventDefault();
    }
  };

  // ---------------------------------------------------------------
  // HUD / Overlay
  // ---------------------------------------------------------------
  function updateHUD() {
    var el = document.getElementById('score');
    if (el) el.textContent = playerWins;
  }

  function showOverlay(title, scoreText) {
    var overlay = document.getElementById('overlay');
    var oTitle  = document.getElementById('overlay-title');
    var oScore  = document.getElementById('overlay-score');
    if (overlay) overlay.classList.remove('overlay--hidden');
    if (oTitle)  oTitle.textContent  = title;
    if (oScore)  oScore.textContent  = scoreText;
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
    var game   = new Tron(canvas);

    // Reset completo do match
    playerWins = 0;
    cpuWins = 0;
    game.start();
    SoundFX.newWave();

    document.getElementById('btn-restart').addEventListener('click', function () {
      playerWins = 0;
      cpuWins = 0;
      game.start();
      SoundFX.newWave();
    });

    window._game = game;
  });

}());
