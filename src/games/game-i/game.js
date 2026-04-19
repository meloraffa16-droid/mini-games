(function () {
  'use strict';

  // --- Constantes ---
  var TILE = 20;
  var COLS = 28;
  var ROWS = 21;
  var MAZE_W = COLS * TILE;
  var MAZE_H = ROWS * TILE;

  var PAC_SIZE   = 16;
  var GHOST_SIZE = 16;
  var DOT_SIZE   = 4;
  var PELLET_SIZE = 8;

  var PAC_SPEED   = 100;  // px/s
  var GHOST_SPEED = 80;   // px/s
  var GHOST_FRIGHT_SPEED = 50;

  var POWER_DURATION = 8;  // seconds
  var LIVES_START    = 3;

  var SCORE_DOT    = 10;
  var SCORE_PELLET = 50;
  var SCORE_GHOST  = 200;

  // --- Paleta 8-bit ---
  var COLOR_BG       = '#0a0a1a';
  var COLOR_WALL     = '#4a3aff';
  var COLOR_PAC      = '#ffff00';
  var COLOR_DOT      = '#ffffff';
  var COLOR_PELLET   = '#ffffff';
  var COLOR_FRIGHT   = '#4a3aff';
  var GHOST_COLORS   = ['#ff2d6f', '#00fff0', '#ff8c00', '#ff69b4'];

  // --- Mapa do labirinto ---
  // 1=wall, 0=dot, 2=power pellet, 3=ghost house, 4=empty (no dot)
  var MAZE_TEMPLATE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,2,1,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,1,2,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,1,1,1,4,1,1,4,1,1,1,1,1,1,0,1,1,1,1,1],
    [1,1,1,1,1,0,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1,0,1,1,1,1,1],
    [1,1,1,1,1,0,1,4,1,1,1,1,3,3,3,3,1,1,1,1,4,1,0,1,1,1,1,1],
    [4,4,4,4,4,0,4,4,1,3,3,3,3,3,3,3,3,3,3,1,4,4,0,4,4,4,4,4],
    [1,1,1,1,1,0,1,4,1,3,3,3,3,3,3,3,3,3,3,1,4,1,0,1,1,1,1,1],
    [1,1,1,1,1,0,1,4,1,1,1,1,1,1,1,1,1,1,1,1,4,1,0,1,1,1,1,1],
    [1,1,1,1,1,0,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,2,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,2,1],
    [1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  // Adjust ROWS to actual maze height
  // MAZE_TEMPLATE is 22 rows (index 0-21)

  // --- Estado do jogo ---
  var maze       = [];
  var pacman     = null;
  var ghosts     = [];
  var score      = 0;
  var lives      = LIVES_START;
  var totalDots  = 0;
  var dotsEaten  = 0;
  var powerTimer = 0;
  var gameOver   = false;
  var gameWon    = false;
  var level      = 1;
  var mouthOpen  = true;
  var mouthTimer = 0;
  var offsetX    = 0;
  var offsetY    = 0;
  var deathTimer = 0;
  var dying      = false;
  var actualRows = 0;

  // --- Construtor ---
  function PacMan(canvas) {
    GameBase.call(this, canvas);
    this._boundKeydown = null;
    this._boundKeyup   = null;
  }
  GameBase.extend(PacMan);

  // ---------------------------------------------------------------
  // init
  // ---------------------------------------------------------------
  PacMan.prototype.init = function () {
    actualRows = MAZE_TEMPLATE.length;
    var mazePixH = actualRows * TILE;

    // Center maze in canvas
    offsetX = Math.floor((this.width  - MAZE_W) / 2);
    offsetY = Math.floor((this.height - mazePixH) / 2);

    // Copy maze template
    maze = [];
    totalDots = 0;
    for (var r = 0; r < actualRows; r++) {
      maze[r] = [];
      for (var c = 0; c < COLS; c++) {
        maze[r][c] = MAZE_TEMPLATE[r][c];
        if (maze[r][c] === 0) totalDots++;
        if (maze[r][c] === 2) totalDots++;
      }
    }

    dotsEaten  = 0;
    score      = 0;
    lives      = LIVES_START;
    gameOver   = false;
    gameWon    = false;
    powerTimer = 0;
    mouthOpen  = true;
    mouthTimer = 0;
    deathTimer = 0;
    dying      = false;
    level      = 1;

    initEntities();
    updateHUD();
    hideOverlay();
    this._registerKeys();
  };

  function initEntities() {
    // Pac-Man starts at row 16, col 14 (center bottom area)
    pacman = {
      col: 14,
      row: 16,
      x: 14 * TILE + TILE / 2,
      y: 16 * TILE + TILE / 2,
      dir: { x: 0, y: 0 },
      nextDir: { x: 0, y: 0 },
      moving: false
    };

    // 4 ghosts start in ghost house (row 10, cols 12-15)
    ghosts = [];
    var ghostStartPositions = [
      { col: 13, row: 9 },   // red - above house
      { col: 12, row: 10 },  // cyan
      { col: 14, row: 10 },  // orange
      { col: 15, row: 10 }   // pink
    ];
    for (var i = 0; i < 4; i++) {
      var gp = ghostStartPositions[i];
      ghosts.push({
        col: gp.col,
        row: gp.row,
        x: gp.col * TILE + TILE / 2,
        y: gp.row * TILE + TILE / 2,
        dir: { x: 0, y: -1 },
        color: GHOST_COLORS[i],
        frightened: false,
        eaten: false,
        exitTimer: i * 2,  // stagger ghost exits
        exited: i === 0     // red starts outside
      });
    }
  }

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  PacMan.prototype.update = function (dt) {
    if (gameOver || gameWon) return;

    if (dying) {
      deathTimer -= dt;
      if (deathTimer <= 0) {
        dying = false;
        if (lives <= 0) {
          gameOver = true;
          SoundFX.gameOver();
          this.stop();
          showOverlay('GAME OVER', score);
          return;
        }
        resetPositions();
      }
      return;
    }

    // Mouth animation
    mouthTimer += dt;
    if (mouthTimer > 0.12) {
      mouthTimer = 0;
      mouthOpen = !mouthOpen;
    }

    // Power timer
    if (powerTimer > 0) {
      powerTimer -= dt;
      if (powerTimer <= 0) {
        powerTimer = 0;
        for (var g = 0; g < ghosts.length; g++) {
          ghosts[g].frightened = false;
        }
      }
    }

    // Update Pac-Man
    updatePacman(dt);

    // Update ghosts
    for (var gi = 0; gi < ghosts.length; gi++) {
      updateGhost(ghosts[gi], dt, gi);
    }

    // Check collisions
    checkCollisions(this);

    // Check win
    if (dotsEaten >= totalDots) {
      gameWon = true;
      SoundFX.win();
      level++;
      var self = this;
      setTimeout(function () {
        gameWon = false;
        self.init();
        // Restore level
      }, 1500);
    }
  };

  function resetPositions() {
    pacman.col = 14;
    pacman.row = 16;
    pacman.x   = 14 * TILE + TILE / 2;
    pacman.y   = 16 * TILE + TILE / 2;
    pacman.dir     = { x: 0, y: 0 };
    pacman.nextDir = { x: 0, y: 0 };
    pacman.moving  = false;

    var ghostStartPositions = [
      { col: 13, row: 9 },
      { col: 12, row: 10 },
      { col: 14, row: 10 },
      { col: 15, row: 10 }
    ];
    for (var i = 0; i < ghosts.length; i++) {
      var gp = ghostStartPositions[i];
      ghosts[i].col = gp.col;
      ghosts[i].row = gp.row;
      ghosts[i].x   = gp.col * TILE + TILE / 2;
      ghosts[i].y   = gp.row * TILE + TILE / 2;
      ghosts[i].dir = { x: 0, y: -1 };
      ghosts[i].frightened = false;
      ghosts[i].eaten = false;
      ghosts[i].exitTimer = i * 2;
      ghosts[i].exited = (i === 0);
    }
    powerTimer = 0;
  }

  function updatePacman(dt) {
    var speed = PAC_SPEED;
    var targetX = pacman.col * TILE + TILE / 2;
    var targetY = pacman.row * TILE + TILE / 2;

    var dx = targetX - pacman.x;
    var dy = targetY - pacman.y;
    var distToCenter = Math.abs(dx) + Math.abs(dy);

    // If close enough to cell center, snap and allow direction change
    if (distToCenter < 2) {
      pacman.x = targetX;
      pacman.y = targetY;

      // Try next direction first
      var nd = pacman.nextDir;
      if ((nd.x !== 0 || nd.y !== 0) && canMove(pacman.col, pacman.row, nd)) {
        pacman.dir = { x: nd.x, y: nd.y };
        pacman.moving = true;
      }

      // Check if current direction is still valid
      if (pacman.moving && !canMove(pacman.col, pacman.row, pacman.dir)) {
        pacman.moving = false;
      }

      if (pacman.moving) {
        var newCol = pacman.col + pacman.dir.x;
        var newRow = pacman.row + pacman.dir.y;

        // Tunnel wrap
        if (newCol < 0) {
          newCol = COLS - 1;
          pacman.x = (COLS - 1) * TILE + TILE / 2;
        } else if (newCol >= COLS) {
          newCol = 0;
          pacman.x = 0 * TILE + TILE / 2;
        }

        pacman.col = newCol;
        pacman.row = newRow;

        // Eat dot
        eatDot(newCol, newRow);
      }
    }

    // Move toward target cell center
    if (pacman.moving) {
      var tx = pacman.col * TILE + TILE / 2;
      var ty = pacman.row * TILE + TILE / 2;
      var mx = tx - pacman.x;
      var my = ty - pacman.y;
      var md = Math.sqrt(mx * mx + my * my);
      if (md > 0) {
        var step = speed * dt;
        if (step >= md) {
          pacman.x = tx;
          pacman.y = ty;
        } else {
          pacman.x += (mx / md) * step;
          pacman.y += (my / md) * step;
        }
      }
    }
  }

  function eatDot(col, row) {
    if (row < 0 || row >= actualRows || col < 0 || col >= COLS) return;
    var tile = maze[row][col];
    if (tile === 0) {
      maze[row][col] = 4;
      score += SCORE_DOT;
      dotsEaten++;
      SoundFX.eat();
      updateHUD();
    } else if (tile === 2) {
      maze[row][col] = 4;
      score += SCORE_PELLET;
      dotsEaten++;
      SoundFX.score();
      updateHUD();
      activatePower();
    }
  }

  function activatePower() {
    powerTimer = POWER_DURATION;
    for (var i = 0; i < ghosts.length; i++) {
      if (!ghosts[i].eaten) {
        ghosts[i].frightened = true;
        // Reverse direction when frightened
        ghosts[i].dir = { x: -ghosts[i].dir.x, y: -ghosts[i].dir.y };
      }
    }
  }

  function canMove(col, row, dir) {
    var nc = col + dir.x;
    var nr = row + dir.y;

    // Tunnel
    if (nc < 0 || nc >= COLS) return true;
    if (nr < 0 || nr >= actualRows) return false;

    var tile = maze[nr][nc];
    return tile !== 1;
  }

  function canMoveGhost(col, row, dir, allowHouse) {
    var nc = col + dir.x;
    var nr = row + dir.y;

    // Tunnel
    if (nc < 0 || nc >= COLS) return true;
    if (nr < 0 || nr >= actualRows) return false;

    var tile = maze[nr][nc];
    if (tile === 1) return false;
    if (tile === 3 && !allowHouse) return false;
    return true;
  }

  // ---------------------------------------------------------------
  // Ghost AI
  // ---------------------------------------------------------------
  function updateGhost(ghost, dt, idx) {
    // Ghost house exit logic
    if (!ghost.exited) {
      ghost.exitTimer -= dt;
      if (ghost.exitTimer <= 0) {
        // Move ghost to exit position
        ghost.col = 13;
        ghost.row = 8;
        ghost.x   = 13 * TILE + TILE / 2;
        ghost.y   = 8  * TILE + TILE / 2;
        ghost.exited = true;
        ghost.dir = { x: 1, y: 0 };
      }
      return;
    }

    // If eaten, return to house
    if (ghost.eaten) {
      // Move toward ghost house entrance
      var homeCol = 13;
      var homeRow = 10;
      var hdx = homeCol * TILE + TILE / 2 - ghost.x;
      var hdy = homeRow * TILE + TILE / 2 - ghost.y;
      var hd  = Math.sqrt(hdx * hdx + hdy * hdy);
      if (hd < 4) {
        ghost.eaten = false;
        ghost.frightened = false;
        ghost.col = homeCol;
        ghost.row = homeRow;
        ghost.x = homeCol * TILE + TILE / 2;
        ghost.y = homeRow * TILE + TILE / 2;
        ghost.exited = false;
        ghost.exitTimer = 1;
        return;
      }
      var espeed = PAC_SPEED * 2;
      ghost.x += (hdx / hd) * espeed * dt;
      ghost.y += (hdy / hd) * espeed * dt;
      return;
    }

    var speed = ghost.frightened ? GHOST_FRIGHT_SPEED : GHOST_SPEED;
    var targetX = ghost.col * TILE + TILE / 2;
    var targetY = ghost.row * TILE + TILE / 2;

    var gdx = targetX - ghost.x;
    var gdy = targetY - ghost.y;
    var distToCenter = Math.abs(gdx) + Math.abs(gdy);

    if (distToCenter < 2) {
      ghost.x = targetX;
      ghost.y = targetY;

      // Choose new direction at intersection
      var dirs = [
        { x:  0, y: -1 },
        { x:  0, y:  1 },
        { x: -1, y:  0 },
        { x:  1, y:  0 }
      ];

      // Filter valid directions (no reversing, no walls)
      var valid = [];
      for (var d = 0; d < dirs.length; d++) {
        // Don't reverse
        if (dirs[d].x === -ghost.dir.x && dirs[d].y === -ghost.dir.y) continue;
        if (canMoveGhost(ghost.col, ghost.row, dirs[d], false)) {
          valid.push(dirs[d]);
        }
      }

      if (valid.length === 0) {
        // Allow reversing as last resort
        for (var d2 = 0; d2 < dirs.length; d2++) {
          if (canMoveGhost(ghost.col, ghost.row, dirs[d2], false)) {
            valid.push(dirs[d2]);
          }
        }
      }

      if (valid.length > 0) {
        var chosen;
        if (ghost.frightened) {
          // Random direction when frightened
          chosen = valid[Math.floor(Math.random() * valid.length)];
        } else {
          // Chase: pick direction that reduces distance to pacman
          // Each ghost has slightly different targeting
          var targetCol = pacman.col;
          var targetRow = pacman.row;

          // Vary targeting per ghost
          if (idx === 1) {
            // Cyan: target 4 tiles ahead of pacman
            targetCol = pacman.col + pacman.dir.x * 4;
            targetRow = pacman.row + pacman.dir.y * 4;
          } else if (idx === 2) {
            // Orange: if close, scatter to corner; else chase
            var odx2 = ghost.col - pacman.col;
            var ody2 = ghost.row - pacman.row;
            if (odx2 * odx2 + ody2 * ody2 < 64) {
              targetCol = 0;
              targetRow = actualRows - 1;
            }
          } else if (idx === 3) {
            // Pink: target 2 tiles ahead
            targetCol = pacman.col + pacman.dir.x * 2;
            targetRow = pacman.row + pacman.dir.y * 2;
          }

          var bestDist = 999999;
          chosen = valid[0];
          for (var v = 0; v < valid.length; v++) {
            var nc = ghost.col + valid[v].x;
            var nr = ghost.row + valid[v].y;
            var ddx = nc - targetCol;
            var ddy = nr - targetRow;
            var dist = ddx * ddx + ddy * ddy;
            // Add small randomness for variety
            dist += Math.random() * 4;
            if (dist < bestDist) {
              bestDist = dist;
              chosen = valid[v];
            }
          }
        }

        ghost.dir = { x: chosen.x, y: chosen.y };
        var newCol = ghost.col + ghost.dir.x;
        var newRow = ghost.row + ghost.dir.y;

        // Tunnel wrap for ghosts
        if (newCol < 0) {
          newCol = COLS - 1;
          ghost.x = (COLS - 1) * TILE + TILE / 2;
        } else if (newCol >= COLS) {
          newCol = 0;
          ghost.x = 0 * TILE + TILE / 2;
        }

        ghost.col = newCol;
        ghost.row = newRow;
      }
    }

    // Move toward target cell
    if (ghost.dir.x !== 0 || ghost.dir.y !== 0) {
      var tx = ghost.col * TILE + TILE / 2;
      var ty = ghost.row * TILE + TILE / 2;
      var mx = tx - ghost.x;
      var my = ty - ghost.y;
      var md = Math.sqrt(mx * mx + my * my);
      if (md > 0) {
        var step = speed * dt;
        if (step >= md) {
          ghost.x = tx;
          ghost.y = ty;
        } else {
          ghost.x += (mx / md) * step;
          ghost.y += (my / md) * step;
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // Collisions
  // ---------------------------------------------------------------
  function checkCollisions(game) {
    for (var i = 0; i < ghosts.length; i++) {
      var g = ghosts[i];
      if (g.eaten || !g.exited) continue;

      var dx = pacman.x - g.x;
      var dy = pacman.y - g.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < TILE * 0.7) {
        if (g.frightened) {
          // Eat ghost
          g.eaten = true;
          g.frightened = false;
          score += SCORE_GHOST;
          SoundFX.alienDie();
          updateHUD();
        } else {
          // Pac-Man dies
          lives--;
          dying = true;
          deathTimer = 1.0;
          SoundFX.loseLife();
          updateHUD();
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // render
  // ---------------------------------------------------------------
  PacMan.prototype.render = function () {
    this.clear(COLOR_BG);
    var ctx = this.ctx;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    drawMaze(ctx);
    drawDots(ctx);

    if (!dying) {
      drawPacman(ctx);
    } else {
      // Blink pacman during death
      if (Math.floor(deathTimer * 8) % 2 === 0) {
        drawPacman(ctx);
      }
    }

    drawGhosts(ctx);

    ctx.restore();

    // Draw lives indicator
    drawLives(ctx, this.width);

    // Draw level indicator
    drawLevel(ctx, this.width);
  };

  // ---------------------------------------------------------------
  // Drawing functions — 8-bit pixel art, fillRect ONLY
  // ---------------------------------------------------------------
  function drawMaze(ctx) {
    ctx.fillStyle = COLOR_WALL;
    for (var r = 0; r < actualRows; r++) {
      for (var c = 0; c < COLS; c++) {
        if (maze[r][c] === 1) {
          var x = Math.floor(c * TILE);
          var y = Math.floor(r * TILE);
          ctx.fillRect(x, y, TILE, TILE);
        }
      }
    }

    // Draw wall inner edge for pixel art effect
    ctx.fillStyle = '#3328cc';
    for (var r2 = 0; r2 < actualRows; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        if (maze[r2][c2] === 1) {
          // Check if adjacent to a non-wall
          var hasOpenNeighbor = false;
          if (r2 > 0 && maze[r2 - 1][c2] !== 1) hasOpenNeighbor = true;
          if (r2 < actualRows - 1 && maze[r2 + 1][c2] !== 1) hasOpenNeighbor = true;
          if (c2 > 0 && maze[r2][c2 - 1] !== 1) hasOpenNeighbor = true;
          if (c2 < COLS - 1 && maze[r2][c2 + 1] !== 1) hasOpenNeighbor = true;

          if (hasOpenNeighbor) {
            var bx = Math.floor(c2 * TILE) + 2;
            var by = Math.floor(r2 * TILE) + 2;
            ctx.fillRect(bx, by, TILE - 4, TILE - 4);
          }
        }
      }
    }

    // Ghost house door
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(Math.floor(12 * TILE), Math.floor(9 * TILE) + TILE - 3, TILE * 4, 3);
  }

  function drawDots(ctx) {
    for (var r = 0; r < actualRows; r++) {
      for (var c = 0; c < COLS; c++) {
        var tile = maze[r][c];
        if (tile === 0) {
          // Small dot
          ctx.fillStyle = COLOR_DOT;
          var dx = Math.floor(c * TILE + (TILE - DOT_SIZE) / 2);
          var dy = Math.floor(r * TILE + (TILE - DOT_SIZE) / 2);
          ctx.fillRect(dx, dy, DOT_SIZE, DOT_SIZE);
        } else if (tile === 2) {
          // Power pellet (pulsing)
          ctx.fillStyle = COLOR_PELLET;
          var px = Math.floor(c * TILE + (TILE - PELLET_SIZE) / 2);
          var py = Math.floor(r * TILE + (TILE - PELLET_SIZE) / 2);
          ctx.fillRect(px, py, PELLET_SIZE, PELLET_SIZE);
        }
      }
    }
  }

  function drawPacman(ctx) {
    var px = Math.floor(pacman.x - PAC_SIZE / 2);
    var py = Math.floor(pacman.y - PAC_SIZE / 2);

    // Body
    ctx.fillStyle = COLOR_PAC;
    ctx.fillRect(px, py, PAC_SIZE, PAC_SIZE);

    // Mouth (cut out a section based on direction)
    if (mouthOpen) {
      ctx.fillStyle = COLOR_BG;
      var mw = 6;
      var mh = 6;
      var mx, my;

      if (pacman.dir.x === 1) {
        // Facing right
        mx = px + PAC_SIZE - mw;
        my = py + (PAC_SIZE - mh) / 2;
      } else if (pacman.dir.x === -1) {
        // Facing left
        mx = px;
        my = py + (PAC_SIZE - mh) / 2;
      } else if (pacman.dir.y === -1) {
        // Facing up
        mx = px + (PAC_SIZE - mh) / 2;
        my = py;
        var tmp = mw; mw = mh; mh = tmp;
      } else if (pacman.dir.y === 1) {
        // Facing down
        mx = px + (PAC_SIZE - mh) / 2;
        my = py + PAC_SIZE - mw;
        var tmp2 = mw; mw = mh; mh = tmp2;
      } else {
        // Default facing right
        mx = px + PAC_SIZE - mw;
        my = py + (PAC_SIZE - mh) / 2;
      }
      ctx.fillRect(Math.floor(mx), Math.floor(my), mw, mh);
    }

    // Eye
    ctx.fillStyle = '#000000';
    var ex, ey;
    if (pacman.dir.y === 1) {
      ex = px + PAC_SIZE / 2 + 1;
      ey = py + PAC_SIZE / 2 + 2;
    } else if (pacman.dir.x === -1) {
      ex = px + 3;
      ey = py + 3;
    } else if (pacman.dir.y === -1) {
      ex = px + PAC_SIZE / 2 + 1;
      ey = py + 3;
    } else {
      // right or default
      ex = px + PAC_SIZE - 5;
      ey = py + 3;
    }
    ctx.fillRect(Math.floor(ex), Math.floor(ey), 2, 2);
  }

  function drawGhosts(ctx) {
    for (var i = 0; i < ghosts.length; i++) {
      var g = ghosts[i];
      var gx = Math.floor(g.x - GHOST_SIZE / 2);
      var gy = Math.floor(g.y - GHOST_SIZE / 2);

      if (g.eaten) {
        // Just draw eyes when eaten
        drawGhostEyes(ctx, gx, gy, g);
        continue;
      }

      // Body color
      if (g.frightened) {
        // Blink white near end of power
        if (powerTimer < 2 && Math.floor(powerTimer * 4) % 2 === 0) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = COLOR_FRIGHT;
        }
      } else {
        ctx.fillStyle = g.color;
      }

      // Ghost body — rectangle
      ctx.fillRect(gx, gy, GHOST_SIZE, GHOST_SIZE - 2);

      // Ghost "skirt" — 3 little bumps at bottom
      var bumpW = Math.floor(GHOST_SIZE / 3);
      ctx.fillRect(gx, gy + GHOST_SIZE - 4, bumpW, 4);
      ctx.fillRect(gx + bumpW * 2, gy + GHOST_SIZE - 4, bumpW, 4);
      // Middle bump slightly shorter
      ctx.fillRect(gx + bumpW, gy + GHOST_SIZE - 2, bumpW, 2);

      // Eyes
      if (g.frightened) {
        // Frightened face — just two white squares for eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx + 3, gy + 5, 3, 3);
        ctx.fillRect(gx + GHOST_SIZE - 6, gy + 5, 3, 3);

        // Wavy mouth
        ctx.fillRect(gx + 3, gy + 10, 2, 2);
        ctx.fillRect(gx + 6, gy + 11, 2, 2);
        ctx.fillRect(gx + 9, gy + 10, 2, 2);
        ctx.fillRect(gx + 12, gy + 11, 2, 2);
      } else {
        drawGhostEyes(ctx, gx, gy, g);
      }
    }
  }

  function drawGhostEyes(ctx, gx, gy, ghost) {
    // White sclera
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gx + 3, gy + 4, 4, 5);
    ctx.fillRect(gx + GHOST_SIZE - 7, gy + 4, 4, 5);

    // Blue pupil — offset by direction
    ctx.fillStyle = '#4a3aff';
    var pox = ghost.dir.x;
    var poy = ghost.dir.y;
    ctx.fillRect(gx + 4 + pox, gy + 5 + poy, 2, 2);
    ctx.fillRect(gx + GHOST_SIZE - 6 + pox, gy + 5 + poy, 2, 2);
  }

  function drawLives(ctx, canvasW) {
    ctx.fillStyle = COLOR_PAC;
    for (var i = 0; i < lives; i++) {
      var lx = Math.floor(10 + i * 22);
      var ly = Math.floor(offsetY + actualRows * TILE + 6);
      ctx.fillRect(lx, ly, 14, 14);
      // Mouth cutout
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(lx + 10, ly + 4, 4, 6);
      ctx.fillStyle = COLOR_PAC;
    }
  }

  function drawLevel(ctx, canvasW) {
    // Draw small level indicator in bottom right
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('LV ' + level, canvasW - 10, offsetY + actualRows * TILE + 16);
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------
  PacMan.prototype._registerKeys = function () {
    if (this._boundKeydown) {
      window.removeEventListener('keydown', this._boundKeydown);
    }
    var self = this;
    this._boundKeydown = function (e) {
      self._handleKey(e);
    };
    window.addEventListener('keydown', this._boundKeydown);
  };

  PacMan.prototype._handleKey = function (e) {
    if (gameOver || dying) return;

    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W':
        pacman.nextDir = { x:  0, y: -1 };
        if (!pacman.moving) pacman.moving = true;
        break;
      case 'ArrowDown':  case 's': case 'S':
        pacman.nextDir = { x:  0, y:  1 };
        if (!pacman.moving) pacman.moving = true;
        break;
      case 'ArrowLeft':  case 'a': case 'A':
        pacman.nextDir = { x: -1, y:  0 };
        if (!pacman.moving) pacman.moving = true;
        break;
      case 'ArrowRight': case 'd': case 'D':
        pacman.nextDir = { x:  1, y:  0 };
        if (!pacman.moving) pacman.moving = true;
        break;
    }

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) !== -1) {
      e.preventDefault();
    }
  };

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
    if (oScore)  oScore.textContent  = 'Score: ' + finalScore;
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
    var game   = new PacMan(canvas);
    game.start();

    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });

    window._game = game;
  });

}());
