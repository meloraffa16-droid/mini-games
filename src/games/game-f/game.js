(function () {
  'use strict';

  // ─── HUD / Overlay helpers ────────────────────────────────────────────────
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

  // ─── Constants ───────────────────────────────────────────────────────────
  var COLS         = 10;
  var ROWS         = 20;
  var CANVAS_W     = 800;
  var CANVAS_H     = 500;
  var CELL         = 24;           // px per cell  (20 rows × 24 = 480, fits in 500)
  var BOARD_W      = COLS * CELL;  // 240
  var BOARD_H      = ROWS * CELL;  // 480
  var BOARD_X      = Math.floor((CANVAS_W - BOARD_W) / 2); // centered horizontally
  var BOARD_Y      = Math.floor((CANVAS_H - BOARD_H) / 2); // centered vertically
  var PANEL_X      = BOARD_X + BOARD_W + 16;               // right panel start
  var LOCK_DELAY   = 0.5;          // seconds before piece locks
  var COLOR_BG     = '#0a0a1a';
  var COLOR_GRID   = 'rgba(74,58,255,0.08)';
  var COLOR_BORDER = '#4a3aff';
  var COLOR_LABEL  = '#6a6a9a';
  var COLOR_TEXT   = '#e0e0ff';
  var FONT_SMALL   = '8px \'Press Start 2P\', monospace';
  var FONT_MED     = '10px \'Press Start 2P\', monospace';
  var FONT_LARGE   = '14px \'Press Start 2P\', monospace';

  // ─── Piece definitions (SRS shapes, spawn in rows 0-1) ───────────────────
  // Each shape: array of [row, col] offsets from pivot
  var PIECES = {
    I: {
      color: '#00fff0',
      dark:  '#00b3aa',
      shapes: [
        [[0,0],[0,1],[0,2],[0,3]],  // 0
        [[0,2],[1,2],[2,2],[3,2]],  // R
        [[1,0],[1,1],[1,2],[1,3]],  // 2
        [[0,1],[1,1],[2,1],[3,1]]   // L
      ]
    },
    O: {
      color: '#ffff00',
      dark:  '#b3b300',
      shapes: [
        [[0,0],[0,1],[1,0],[1,1]]
      ]
    },
    T: {
      color: '#4a3aff',
      dark:  '#2a1fd9',
      shapes: [
        [[0,1],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[1,2],[2,1]],
        [[0,1],[1,0],[1,1],[2,1]]
      ]
    },
    S: {
      color: '#39ff14',
      dark:  '#1fa800',
      shapes: [
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,1],[1,1],[1,2],[2,2]],
        [[1,1],[1,2],[2,0],[2,1]],
        [[0,0],[1,0],[1,1],[2,1]]
      ]
    },
    Z: {
      color: '#ff2d6f',
      dark:  '#b3003d',
      shapes: [
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,2],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[2,1],[2,2]],
        [[0,1],[1,0],[1,1],[2,0]]
      ]
    },
    L: {
      color: '#ff8c00',
      dark:  '#b36000',
      shapes: [
        [[0,2],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[2,1],[2,2]],
        [[1,0],[1,1],[1,2],[2,0]],
        [[0,0],[0,1],[1,1],[2,1]]
      ]
    },
    J: {
      color: '#4a8aff',
      dark:  '#1a5acc',
      shapes: [
        [[0,0],[1,0],[1,1],[1,2]],
        [[0,1],[0,2],[1,1],[2,1]],
        [[1,0],[1,1],[1,2],[2,2]],
        [[0,1],[1,1],[2,0],[2,1]]
      ]
    }
  };

  var PIECE_KEYS = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];

  // Scoring table (multiplier × level)
  var LINE_SCORES = [0, 100, 300, 500, 800];

  // Gravity per level (seconds per row drop), levels 1-15+
  function gravityForLevel(level) {
    var base = 0.8 - (level - 1) * 0.05;
    return Math.max(base, 0.05);
  }

  // ─── Tetris constructor ───────────────────────────────────────────────────
  function Tetris(canvas) {
    GameBase.call(this, canvas);
    this._keysDown = {};
    this._bindKeys();
  }
  GameBase.extend(Tetris);

  Tetris.prototype._bindKeys = function () {
    var self = this;
    this._onKeyDown = function (e) { self._handleKey(e); };
    document.addEventListener('keydown', this._onKeyDown);
  };

  Tetris.prototype._handleKey = function (e) {
    if (!this.running || this.paused) return;
    if (this._gameOver) return;

    switch (e.code) {
      case 'ArrowLeft':  case 'KeyA': this._tryMove(0, -1); break;
      case 'ArrowRight': case 'KeyD': this._tryMove(0,  1); break;
      case 'ArrowUp':    case 'KeyW': this._tryRotate(); break;
      case 'ArrowDown':  case 'KeyS':
        // soft drop: move down immediately
        if (this._tryMove(1, 0)) { this._score += 1; updateHUD(this._score); }
        this._gravTimer = 0; // reset gravity timer so we don't double-drop
        break;
      case 'Space':
        this._hardDrop();
        break;
    }
    e.preventDefault && e.preventDefault();
  };

  // ─── init ─────────────────────────────────────────────────────────────────
  Tetris.prototype.init = function () {
    hideOverlay();

    this._board      = this._emptyBoard();
    this._score      = 0;
    this._lines      = 0;
    this._level      = 1;
    this._gravTimer  = 0;
    this._lockTimer  = 0;
    this._locking    = false;
    this._gameOver   = false;
    this._clearing   = false; // flash animation state
    this._flashTimer = 0;
    this._flashLines = [];

    this._bag        = [];
    this._current    = this._spawnPiece();
    this._next       = this._spawnPiece();
    this._ghost      = this._calcGhost();

    updateHUD(0);
  };

  Tetris.prototype._emptyBoard = function () {
    var board = [];
    for (var r = 0; r < ROWS; r++) {
      board[r] = [];
      for (var c = 0; c < COLS; c++) {
        board[r][c] = null;
      }
    }
    return board;
  };

  // 7-bag randomizer
  Tetris.prototype._nextFromBag = function () {
    if (this._bag.length === 0) {
      this._bag = PIECE_KEYS.slice();
      // Fisher-Yates shuffle
      for (var i = this._bag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = this._bag[i];
        this._bag[i] = this._bag[j];
        this._bag[j] = tmp;
      }
    }
    return this._bag.pop();
  };

  Tetris.prototype._spawnPiece = function () {
    var key = this._nextFromBag();
    var def = PIECES[key];
    return {
      key:      key,
      color:    def.color,
      dark:     def.dark,
      shapes:   def.shapes,
      rot:      0,
      row:      0,
      col:      Math.floor(COLS / 2) - Math.floor(this._bboxWidth(def.shapes[0]) / 2)
    };
  };

  Tetris.prototype._bboxWidth = function (shape) {
    var maxC = 0;
    for (var i = 0; i < shape.length; i++) {
      if (shape[i][1] > maxC) maxC = shape[i][1];
    }
    return maxC + 1;
  };

  // Returns absolute [row, col] cells for a piece at given state
  Tetris.prototype._cells = function (piece, row, col, rot) {
    var r   = (rot !== undefined) ? rot   : piece.rot;
    var pr  = (row !== undefined) ? row   : piece.row;
    var pc  = (col !== undefined) ? col   : piece.col;
    var shape = piece.shapes[r % piece.shapes.length];
    var cells = [];
    for (var i = 0; i < shape.length; i++) {
      cells.push([pr + shape[i][0], pc + shape[i][1]]);
    }
    return cells;
  };

  Tetris.prototype._fits = function (piece, row, col, rot) {
    var cells = this._cells(piece, row, col, rot);
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0];
      var c = cells[i][1];
      if (c < 0 || c >= COLS) return false;
      if (r >= ROWS) return false;
      if (r >= 0 && this._board[r][c] !== null) return false;
    }
    return true;
  };

  Tetris.prototype._calcGhost = function () {
    if (!this._current) return null;
    var p   = this._current;
    var row = p.row;
    while (this._fits(p, row + 1, p.col, p.rot)) row++;
    return row;
  };

  Tetris.prototype._tryMove = function (dr, dc) {
    var p = this._current;
    if (this._fits(p, p.row + dr, p.col + dc, p.rot)) {
      p.row += dr;
      p.col += dc;
      this._ghost = this._calcGhost();
      // if piece moved down and is no longer resting, cancel lock
      if (dr > 0 || dc !== 0) {
        if (this._fits(p, p.row + 1, p.col, p.rot)) {
          this._locking   = false;
          this._lockTimer = 0;
        }
      }
      return true;
    }
    return false;
  };

  Tetris.prototype._tryRotate = function () {
    var p      = this._current;
    var newRot = (p.rot + 1) % p.shapes.length;
    // Basic SRS kicks: try 0, -1, +1, -2, +2 column offsets
    var kicks = [0, -1, 1, -2, 2];
    for (var k = 0; k < kicks.length; k++) {
      if (this._fits(p, p.row, p.col + kicks[k], newRot)) {
        p.rot  = newRot;
        p.col += kicks[k];
        this._ghost = this._calcGhost();
        // reset lock timer on successful rotation
        if (!this._fits(p, p.row + 1, p.col, p.rot)) {
          this._lockTimer = 0;
        } else {
          this._locking   = false;
          this._lockTimer = 0;
        }
        return;
      }
    }
  };

  Tetris.prototype._hardDrop = function () {
    var p = this._current;
    var dropDist = this._ghost - p.row;
    p.row = this._ghost;
    this._score += dropDist * 2;
    updateHUD(this._score);
    this._lockPiece();
  };

  Tetris.prototype._lockPiece = function () {
    var p     = this._current;
    var cells = this._cells(p);
    var topRow = ROWS; // track highest locked row for game-over check

    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0];
      var c = cells[i][1];
      if (r < topRow) topRow = r;
      if (r < 0) {
        // piece locked above board → game over
        this._triggerGameOver();
        return;
      }
      this._board[r][c] = { color: p.color, dark: p.dark };
    }

    this._locking   = false;
    this._lockTimer = 0;

    // Check for completed lines
    var full = [];
    for (var row = 0; row < ROWS; row++) {
      var complete = true;
      for (var col = 0; col < COLS; col++) {
        if (this._board[row][col] === null) { complete = false; break; }
      }
      if (complete) full.push(row);
    }

    if (full.length > 0) {
      this._flashLines = full;
      this._clearing   = true;
      this._flashTimer = 0;
      // Defer board clearing + next piece spawn until flash finishes
    } else {
      this._spawnNext();
    }
  };

  Tetris.prototype._clearLines = function () {
    var full  = this._flashLines;
    var count = full.length;

    // Remove completed rows, add empty rows at top
    for (var i = 0; i < count; i++) {
      this._board.splice(full[i], 1);
      this._board.unshift(this._emptyBoard()[0]);
      // Adjust remaining indices
      for (var j = i + 1; j < full.length; j++) {
        full[j]++;
      }
    }

    this._lines  += count;
    this._level   = Math.floor(this._lines / 10) + 1;
    this._score  += LINE_SCORES[count] * this._level;
    updateHUD(this._score);

    this._flashLines = [];
    this._clearing   = false;
    this._spawnNext();
  };

  Tetris.prototype._spawnNext = function () {
    this._current = this._next;
    this._next    = this._spawnPiece();
    // Reset position (spawnPiece already sets row=0, col=center)
    // But adjust col for current piece in case bboxWidth changed
    this._current.row = 0;
    this._current.col = Math.floor(COLS / 2) - Math.floor(
      this._bboxWidth(this._current.shapes[this._current.rot]) / 2
    );

    this._ghost     = this._calcGhost();
    this._locking   = false;
    this._lockTimer = 0;
    this._gravTimer = 0;

    // Game over if new piece doesn't fit
    if (!this._fits(this._current, this._current.row, this._current.col, this._current.rot)) {
      this._triggerGameOver();
    }
  };

  Tetris.prototype._triggerGameOver = function () {
    this._gameOver = true;
    showOverlay('GAME OVER', this._score);
  };

  // ─── update ───────────────────────────────────────────────────────────────
  Tetris.prototype.update = function (dt) {
    if (this._gameOver) return;

    // Flash animation for line clearing
    if (this._clearing) {
      this._flashTimer += dt;
      if (this._flashTimer >= 0.35) {
        this._clearLines();
      }
      return; // pause gravity during flash
    }

    var p = this._current;

    // Gravity
    this._gravTimer += dt;
    var gravity = gravityForLevel(this._level);
    if (this._gravTimer >= gravity) {
      this._gravTimer -= gravity;
      if (!this._tryMove(1, 0)) {
        // Piece hit the floor → start lock delay
        this._locking = true;
      }
    }

    // Lock delay
    if (this._locking) {
      this._lockTimer += dt;
      if (this._lockTimer >= LOCK_DELAY) {
        this._lockPiece();
      }
    } else {
      // Check each frame if piece is resting (floor or stack below)
      if (!this._fits(p, p.row + 1, p.col, p.rot)) {
        this._locking = true;
      }
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────
  Tetris.prototype.render = function () {
    var ctx = this.ctx;
    ctx.save();

    // Background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this._drawBgGrid(ctx);
    this._drawBoard(ctx);
    this._drawGhost(ctx);
    this._drawCurrent(ctx);
    this._drawBorder(ctx);
    this._drawPanel(ctx);

    ctx.restore();
  };

  Tetris.prototype._drawBgGrid = function (ctx) {
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth   = 1;

    // Only draw grid inside the board area
    for (var c = 0; c <= COLS; c++) {
      var x = Math.floor(BOARD_X + c * CELL);
      ctx.beginPath();
      ctx.moveTo(x, BOARD_Y);
      ctx.lineTo(x, BOARD_Y + BOARD_H);
      ctx.stroke();
    }
    for (var r = 0; r <= ROWS; r++) {
      var y = Math.floor(BOARD_Y + r * CELL);
      ctx.beginPath();
      ctx.moveTo(BOARD_X, y);
      ctx.lineTo(BOARD_X + BOARD_W, y);
      ctx.stroke();
    }
  };

  Tetris.prototype._drawBlock = function (ctx, col, row, color, dark) {
    var x = Math.floor(BOARD_X + col * CELL);
    var y = Math.floor(BOARD_Y + row * CELL);
    var s = CELL;

    // Main fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);

    // Inner dark border (1px each side)
    ctx.fillStyle = dark || '#000000';
    ctx.fillRect(x,         y,         s,     1); // top
    ctx.fillRect(x,         y,         1,     s); // left
    ctx.fillRect(x + s - 1, y,         1,     s); // right
    ctx.fillRect(x,         y + s - 1, s,     1); // bottom
  };

  Tetris.prototype._drawBoard = function (ctx) {
    // Flash effect: draw flashing lines as white/accent alternating
    var flashSet = {};
    if (this._clearing) {
      for (var fi = 0; fi < this._flashLines.length; fi++) {
        flashSet[this._flashLines[fi]] = true;
      }
    }

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = this._board[r][c];
        if (cell !== null) {
          if (flashSet[r]) {
            // Alternating flash: white then accent
            var flashPhase = Math.floor(this._flashTimer / 0.08) % 2;
            var fc = flashPhase === 0 ? '#ffffff' : '#4a3aff';
            this._drawBlock(ctx, c, r, fc, '#000000');
          } else {
            this._drawBlock(ctx, c, r, cell.color, cell.dark);
          }
        }
      }
    }
  };

  Tetris.prototype._drawGhost = function (ctx) {
    if (!this._current || this._ghost === null) return;
    var p     = this._current;
    var gRow  = this._ghost;
    if (gRow === p.row) return; // ghost overlaps piece, skip

    var cells = this._cells(p, gRow, p.col, p.rot);
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0];
      var c = cells[i][1];
      if (r < 0) continue;
      var x = Math.floor(BOARD_X + c * CELL);
      var y = Math.floor(BOARD_Y + r * CELL);
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, CELL, CELL);
    }
    ctx.restore();
  };

  Tetris.prototype._drawCurrent = function (ctx) {
    if (!this._current) return;
    var p     = this._current;
    var cells = this._cells(p);
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0];
      var c = cells[i][1];
      if (r < 0) continue; // don't draw cells above board
      this._drawBlock(ctx, c, r, p.color, p.dark);
    }
  };

  Tetris.prototype._drawBorder = function (ctx) {
    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth   = 2;
    ctx.strokeRect(
      Math.floor(BOARD_X) - 1,
      Math.floor(BOARD_Y) - 1,
      BOARD_W + 2,
      BOARD_H + 2
    );
  };

  Tetris.prototype._drawPanel = function (ctx) {
    var px  = PANEL_X;
    var py  = BOARD_Y;

    // ── NEXT label ───────────────────────────────────────────────────────
    ctx.fillStyle = COLOR_LABEL;
    ctx.font      = FONT_SMALL;
    ctx.textAlign = 'left';
    ctx.fillText('NEXT', Math.floor(px), Math.floor(py + 8));

    // Next piece preview box
    var boxSize = 4 * CELL + 4; // enough for any piece (4 wide)
    var boxX    = Math.floor(px);
    var boxY    = Math.floor(py + 16);

    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth   = 1;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // Draw next piece centered in box
    if (this._next) {
      this._drawPreview(ctx, this._next, boxX, boxY, boxSize);
    }

    // ── LEVEL ─────────────────────────────────────────────────────────────
    var levelY = boxY + boxSize + 24;
    ctx.fillStyle = COLOR_LABEL;
    ctx.font      = FONT_SMALL;
    ctx.fillText('LEVEL', Math.floor(px), Math.floor(levelY));

    ctx.fillStyle = COLOR_TEXT;
    ctx.font      = FONT_LARGE;
    ctx.fillText(String(this._level), Math.floor(px), Math.floor(levelY + 20));

    // ── LINES ─────────────────────────────────────────────────────────────
    var linesY = levelY + 52;
    ctx.fillStyle = COLOR_LABEL;
    ctx.font      = FONT_SMALL;
    ctx.fillText('LINES', Math.floor(px), Math.floor(linesY));

    ctx.fillStyle = COLOR_TEXT;
    ctx.font      = FONT_LARGE;
    ctx.fillText(String(this._lines), Math.floor(px), Math.floor(linesY + 20));
  };

  Tetris.prototype._drawPreview = function (ctx, piece, boxX, boxY, boxSize) {
    var shape  = piece.shapes[0]; // always show rotation 0 in preview
    // Find bounding box of shape
    var minR = 99, maxR = -99, minC = 99, maxC = -99;
    for (var i = 0; i < shape.length; i++) {
      if (shape[i][0] < minR) minR = shape[i][0];
      if (shape[i][0] > maxR) maxR = shape[i][0];
      if (shape[i][1] < minC) minC = shape[i][1];
      if (shape[i][1] > maxC) maxC = shape[i][1];
    }
    var pieceH = (maxR - minR + 1) * CELL;
    var pieceW = (maxC - minC + 1) * CELL;
    var offX   = Math.floor(boxX + (boxSize - pieceW) / 2);
    var offY   = Math.floor(boxY + (boxSize - pieceH) / 2);

    for (var j = 0; j < shape.length; j++) {
      var dr = shape[j][0] - minR;
      var dc = shape[j][1] - minC;
      var bx = Math.floor(offX + dc * CELL);
      var by = Math.floor(offY + dr * CELL);

      // Main fill
      ctx.fillStyle = piece.color;
      ctx.fillRect(bx, by, CELL, CELL);

      // Inner dark border
      ctx.fillStyle = piece.dark;
      ctx.fillRect(bx,          by,          CELL, 1);
      ctx.fillRect(bx,          by,          1,    CELL);
      ctx.fillRect(bx + CELL-1, by,          1,    CELL);
      ctx.fillRect(bx,          by + CELL-1, CELL, 1);
    }
  };

  // ─── Bootstrap ───────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('game-canvas');
    var game   = new Tetris(canvas);
    game.start();

    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });

    window._game = game;
  });

}());
