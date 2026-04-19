(function () {
  'use strict';

  // --- Constantes ---
  var COLS       = 16;
  var ROWS       = 16;
  var CELL       = 28;
  var TOTAL_MINES = 20;
  var GRID_W     = COLS * CELL;   // 448
  var GRID_H     = ROWS * CELL;   // 448

  // --- Estados de célula ---
  var STATE_COVERED  = 0;
  var STATE_REVEALED = 1;
  var STATE_FLAGGED  = 2;

  // --- Paleta 8-bit ---
  var COLOR_BG           = '#0a0a1a';
  var COLOR_COVERED      = '#1a1a3a';
  var COLOR_COVERED_BORDER = '#4a3aff';
  var COLOR_HIGHLIGHT    = '#5a4aff';  // highlight topo/esquerda
  var COLOR_SHADOW       = '#0e0e2a';  // sombra base/direita
  var COLOR_REVEALED     = '#0a0a1a';
  var COLOR_REVEALED_BORDER = '#222240';
  var COLOR_FLAG         = '#ff2d6f';
  var COLOR_MINE         = '#000000';
  var COLOR_MINE_CROSS   = '#000000';

  // Cores dos números (1-8)
  var NUM_COLORS = [
    null,         // 0 = sem número
    '#00fff0',    // 1 cyan
    '#39ff14',    // 2 green
    '#ff2d6f',    // 3 pink
    '#4a3aff',    // 4 purple
    '#ff8c00',    // 5 orange
    '#00fff0',    // 6 cyan
    '#e8e8ff',    // 7 white
    '#6a6a9a'     // 8 gray
  ];

  // --- Estado do jogo ---
  var grid       = [];   // grid[row][col] = { mine, adjacentMines, state }
  var flagCount  = 0;
  var gameOver   = false;
  var gameWon    = false;
  var firstClick = true;
  var offsetX    = 0;    // offset para centralizar grid no canvas
  var offsetY    = 0;

  // --- Construtor ---
  function Minesweeper(canvas) {
    GameBase.call(this, canvas);
    this._boundClick       = null;
    this._boundContextMenu = null;
  }
  GameBase.extend(Minesweeper);

  // ---------------------------------------------------------------
  // init
  // ---------------------------------------------------------------
  Minesweeper.prototype.init = function () {
    // Calcular offset para centralizar o grid
    offsetX = Math.floor((this.width  - GRID_W) / 2);
    offsetY = Math.floor((this.height - GRID_H) / 2);

    // Criar grid vazio
    grid      = [];
    flagCount = 0;
    gameOver  = false;
    gameWon   = false;
    firstClick = true;

    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        grid[r][c] = {
          mine: false,
          adjacentMines: 0,
          state: STATE_COVERED
        };
      }
    }

    updateHUD();
    hideOverlay();
    this._registerInput();
  };

  // ---------------------------------------------------------------
  // update — jogo é event-driven, nada para fazer por frame
  // ---------------------------------------------------------------
  Minesweeper.prototype.update = function (_dt) {
    // Minesweeper não precisa de update por frame
  };

  // ---------------------------------------------------------------
  // render
  // ---------------------------------------------------------------
  Minesweeper.prototype.render = function () {
    this.clear(COLOR_BG);
    var ctx = this.ctx;

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = grid[r][c];
        var x = offsetX + c * CELL;
        var y = offsetY + r * CELL;

        if (cell.state === STATE_REVEALED) {
          drawRevealedCell(ctx, x, y, cell);
        } else if (cell.state === STATE_FLAGGED) {
          drawCoveredCell(ctx, x, y);
          drawFlag(ctx, x, y);
        } else {
          drawCoveredCell(ctx, x, y);
        }
      }
    }
  };

  // ---------------------------------------------------------------
  // Desenho de células — fillRect ONLY, efeito 3D pixel
  // ---------------------------------------------------------------

  function drawCoveredCell(ctx, x, y) {
    // Preenchimento principal
    ctx.fillStyle = COLOR_COVERED;
    ctx.fillRect(x, y, CELL, CELL);

    // Borda externa
    ctx.fillStyle = COLOR_COVERED_BORDER;
    // Top
    ctx.fillRect(x, y, CELL, 1);
    // Left
    ctx.fillRect(x, y, 1, CELL);
    // Bottom
    ctx.fillRect(x, y + CELL - 1, CELL, 1);
    // Right
    ctx.fillRect(x + CELL - 1, y, 1, CELL);

    // Highlight topo/esquerda (efeito 3D)
    ctx.fillStyle = COLOR_HIGHLIGHT;
    ctx.fillRect(x + 1, y + 1, CELL - 2, 1);   // topo interno
    ctx.fillRect(x + 1, y + 1, 1, CELL - 2);   // esquerda interna

    // Sombra base/direita (efeito 3D)
    ctx.fillStyle = COLOR_SHADOW;
    ctx.fillRect(x + 1, y + CELL - 2, CELL - 2, 1);  // base interna
    ctx.fillRect(x + CELL - 2, y + 1, 1, CELL - 2);  // direita interna
  }

  function drawRevealedCell(ctx, x, y, cell) {
    // Preenchimento
    ctx.fillStyle = COLOR_REVEALED;
    ctx.fillRect(x, y, CELL, CELL);

    // Borda
    ctx.fillStyle = COLOR_REVEALED_BORDER;
    ctx.fillRect(x, y, CELL, 1);
    ctx.fillRect(x, y, 1, CELL);
    ctx.fillRect(x, y + CELL - 1, CELL, 1);
    ctx.fillRect(x + CELL - 1, y, 1, CELL);

    if (cell.mine) {
      drawMine(ctx, x, y);
    } else if (cell.adjacentMines > 0) {
      drawNumber(ctx, x, y, cell.adjacentMines);
    }
  }

  function drawFlag(ctx, x, y) {
    // Quadrado vermelho 6x6 centrado
    var fx = x + Math.floor((CELL - 6) / 2);
    var fy = y + Math.floor((CELL - 6) / 2);
    ctx.fillStyle = COLOR_FLAG;
    ctx.fillRect(fx, fy, 6, 6);
  }

  function drawMine(ctx, x, y) {
    var cx = x + Math.floor(CELL / 2);
    var cy = y + Math.floor(CELL / 2);

    // Quadrado preto 8x8 centrado
    ctx.fillStyle = COLOR_MINE;
    ctx.fillRect(cx - 4, cy - 4, 8, 8);

    // Linhas cruzadas (em cruz) de 1px
    ctx.fillStyle = COLOR_MINE_CROSS;
    // Horizontal
    ctx.fillRect(cx - 6, cy, 12, 1);
    // Vertical
    ctx.fillRect(cx, cy - 6, 1, 12);
  }

  function drawNumber(ctx, x, y, num) {
    ctx.fillStyle = NUM_COLORS[num] || '#e8e8ff';
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), x + Math.floor(CELL / 2), y + Math.floor(CELL / 2) + 1);
  }

  // ---------------------------------------------------------------
  // Lógica de minas
  // ---------------------------------------------------------------

  function placeMines(safeRow, safeCol) {
    var placed = 0;
    while (placed < TOTAL_MINES) {
      var r = Math.floor(Math.random() * ROWS);
      var c = Math.floor(Math.random() * COLS);

      // Nunca colocar mina na célula clicada nem nas adjacentes
      if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
      if (grid[r][c].mine) continue;

      grid[r][c].mine = true;
      placed++;
    }

    // Calcular números adjacentes
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c].mine) continue;
        var count = 0;
        forEachNeighbor(r, c, function (nr, nc) {
          if (grid[nr][nc].mine) count++;
        });
        grid[r][c].adjacentMines = count;
      }
    }
  }

  function forEachNeighbor(row, col, callback) {
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = row + dr;
        var nc = col + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          callback(nr, nc);
        }
      }
    }
  }

  function revealCell(row, col) {
    var cell = grid[row][col];
    if (cell.state !== STATE_COVERED) return;

    cell.state = STATE_REVEALED;

    if (cell.mine) {
      // Game over — revelar todas as minas
      SoundFX.explosion();
      revealAllMines();
      gameOver = true;
      SoundFX.gameOver();
      showOverlay('GAME OVER', 'Voce pisou em uma mina!');
      return;
    }

    if (cell.adjacentMines > 0) {
      SoundFX.hit();
    } else {
      // Flood fill
      SoundFX.eat();
      floodFill(row, col);
    }

    // Verificar vitória
    if (checkWin()) {
      gameWon = true;
      gameOver = true;
      SoundFX.win();
      showOverlay('VOCE VENCEU!', 'Todas as minas encontradas!');
    }
  }

  function floodFill(row, col) {
    forEachNeighbor(row, col, function (nr, nc) {
      var neighbor = grid[nr][nc];
      if (neighbor.state !== STATE_COVERED) return;
      if (neighbor.mine) return;

      neighbor.state = STATE_REVEALED;

      if (neighbor.adjacentMines === 0) {
        floodFill(nr, nc);
      }
    });
  }

  function toggleFlag(row, col) {
    var cell = grid[row][col];
    if (cell.state === STATE_REVEALED) return;

    if (cell.state === STATE_FLAGGED) {
      cell.state = STATE_COVERED;
      flagCount--;
      SoundFX.move();
    } else {
      cell.state = STATE_FLAGGED;
      flagCount++;
      SoundFX.move();
    }

    updateHUD();
  }

  function revealAllMines() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c].mine) {
          grid[r][c].state = STATE_REVEALED;
        }
      }
    }
  }

  function checkWin() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = grid[r][c];
        if (!cell.mine && cell.state !== STATE_REVEALED) {
          return false;
        }
      }
    }
    return true;
  }

  // ---------------------------------------------------------------
  // Input — click e contextmenu no canvas
  // ---------------------------------------------------------------
  Minesweeper.prototype._registerInput = function () {
    var canvas = this.canvas;
    var self   = this;

    // Remover listeners anteriores
    if (this._boundClick) {
      canvas.removeEventListener('click', this._boundClick);
    }
    if (this._boundContextMenu) {
      canvas.removeEventListener('contextmenu', this._boundContextMenu);
    }

    this._boundClick = function (e) {
      if (gameOver) return;
      var pos = getCellFromEvent(e, canvas);
      if (!pos) return;

      if (e.shiftKey) {
        // Shift+Click = flag
        if (firstClick) return; // Não permitir flag antes do primeiro reveal
        toggleFlag(pos.row, pos.col);
      } else {
        // Click normal = revelar
        if (firstClick) {
          firstClick = false;
          placeMines(pos.row, pos.col);
        }
        revealCell(pos.row, pos.col);
      }
    };

    this._boundContextMenu = function (e) {
      e.preventDefault();
      if (gameOver) return;
      var pos = getCellFromEvent(e, canvas);
      if (!pos) return;
      if (firstClick) return; // Não permitir flag antes do primeiro reveal
      toggleFlag(pos.row, pos.col);
    };

    canvas.addEventListener('click', this._boundClick);
    canvas.addEventListener('contextmenu', this._boundContextMenu);
  };

  function getCellFromEvent(e, canvas) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width  / rect.width;
    var scaleY = canvas.height / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top)  * scaleY;

    // Converter para coordenadas do grid
    var gx = mx - offsetX;
    var gy = my - offsetY;

    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return null;

    var col = Math.floor(gx / CELL);
    var row = Math.floor(gy / CELL);

    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;

    return { row: row, col: col };
  }

  // ---------------------------------------------------------------
  // HUD / Overlay
  // ---------------------------------------------------------------
  function updateHUD() {
    var el = document.getElementById('score');
    if (el) el.textContent = TOTAL_MINES - flagCount;
  }

  function showOverlay(title, message) {
    var overlay = document.getElementById('overlay');
    var oTitle  = document.getElementById('overlay-title');
    var oScore  = document.getElementById('overlay-score');
    if (overlay) overlay.classList.remove('overlay--hidden');
    if (oTitle)  oTitle.textContent  = title;
    if (oScore)  oScore.textContent  = message;
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
    var game   = new Minesweeper(canvas);
    game.start();

    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });

    window._game = game;
  });

}());
