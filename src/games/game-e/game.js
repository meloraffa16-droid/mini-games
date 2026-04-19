(function () {
  'use strict';

  // ─── HUD / Overlay helpers ───────────────────────────────────────────────────
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

  // ─── Palette ─────────────────────────────────────────────────────────────────
  var C_BG        = '#0a0a1a';
  var C_PLAYER    = '#00fff0';
  var C_ALIEN1    = '#39ff14';   // rows 0-1 (squid)
  var C_ALIEN2    = '#ff2d6f';   // rows 2-3 (crab)
  var C_BULLET_P  = '#ffff00';   // player bullet
  var C_BULLET_A  = '#ff2d6f';   // alien bullet
  var C_BARRIER   = '#00fff0';
  var C_HUD       = '#00fff0';

  // ─── Grid / Layout ───────────────────────────────────────────────────────────
  var COLS        = 8;
  var ROWS        = 4;
  var ALIEN_W     = 28;   // cell width  (px)
  var ALIEN_H     = 20;   // cell height (px)
  var ALIEN_GAP_X = 12;
  var ALIEN_GAP_Y = 14;
  var STEP_PX     = 16;   // horizontal step per tick
  var DROP_PX     = 20;   // vertical drop when changing direction
  var PLAYER_W    = 28;
  var PLAYER_H    = 14;
  var PLAYER_SPEED = 180; // px/s
  var BULLET_SPEED_P = 380; // px/s
  var BULLET_SPEED_A = 160; // px/s
  var BULLET_W    = 3;
  var BULLET_H    = 10;

  // ─── Pixel-art sprite data (14 cols × 10 rows, pixel = 2x2) ─────────────────
  // Each sprite is an array of [col, row] "on" pixels in a 14×10 grid
  // Rendered as 2×2 blocks → sprite bounding box ≈ 28×20
  // Two frames per alien type (frame 0 and frame 1)

  // Squid (type 1) — frame 0
  var SQUID_F0 = [
    [3,0],[4,0],[9,0],[10,0],
    [2,1],[3,1],[4,1],[5,1],[8,1],[9,1],[10,1],[11,1],
    [1,2],[2,2],[4,2],[5,2],[7,2],[8,2],[10,2],[11,2],[12,2],
    [0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[11,3],[12,3],[13,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],
    [1,5],[2,5],[3,5],[5,5],[6,5],[7,5],[8,5],[10,5],[11,5],[12,5],
    [2,6],[3,6],[10,6],[11,6],
    [3,7],[4,7],[9,7],[10,7],
    [2,8],[3,8],[5,8],[8,8],[10,8],[11,8],
    [1,9],[2,9],[12,9],[13,9]
  ];
  // Squid (type 1) — frame 1 (legs spread)
  var SQUID_F1 = [
    [3,0],[4,0],[9,0],[10,0],
    [2,1],[3,1],[4,1],[5,1],[8,1],[9,1],[10,1],[11,1],
    [1,2],[2,2],[4,2],[5,2],[7,2],[8,2],[10,2],[11,2],[12,2],
    [0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[11,3],[12,3],[13,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],
    [1,5],[2,5],[3,5],[5,5],[6,5],[7,5],[8,5],[10,5],[11,5],[12,5],
    [2,6],[3,6],[10,6],[11,6],
    [4,7],[5,7],[8,7],[9,7],
    [3,8],[4,8],[5,8],[8,8],[9,8],[10,8],
    [2,9],[3,9],[11,9],[12,9]
  ];

  // Crab (type 2) — frame 0
  var CRAB_F0 = [
    [2,0],[11,0],
    [1,1],[2,1],[5,1],[6,1],[7,1],[8,1],[11,1],[12,1],
    [0,2],[1,2],[2,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[11,2],[12,2],[13,2],
    [0,3],[1,3],[2,3],[3,3],[5,3],[6,3],[7,3],[8,3],[10,3],[11,3],[12,3],[13,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],
    [0,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[13,5],
    [0,6],[2,6],[3,6],[10,6],[11,6],[13,6],
    [4,7],[5,7],[8,7],[9,7],
    [3,8],[4,8],[9,8],[10,8],
    [2,9],[3,9],[10,9],[11,9]
  ];
  // Crab (type 2) — frame 1
  var CRAB_F1 = [
    [2,0],[11,0],
    [1,1],[2,1],[5,1],[6,1],[7,1],[8,1],[11,1],[12,1],
    [0,2],[1,2],[2,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[11,2],[12,2],[13,2],
    [0,3],[1,3],[2,3],[3,3],[5,3],[6,3],[7,3],[8,3],[10,3],[11,3],[12,3],[13,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],
    [0,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[13,5],
    [0,6],[2,6],[3,6],[10,6],[11,6],[13,6],
    [3,7],[4,7],[9,7],[10,7],
    [2,8],[3,8],[4,8],[9,8],[10,8],[11,8],
    [1,9],[2,9],[11,9],[12,9]
  ];

  function drawSprite(ctx, pixels, ox, oy, color) {
    ctx.fillStyle = color;
    for (var i = 0; i < pixels.length; i++) {
      var px = pixels[i][0];
      var py = pixels[i][1];
      ctx.fillRect(Math.floor(ox + px * 2), Math.floor(oy + py * 2), 2, 2);
    }
  }

  // ─── Player sprite (28×14 via fillRect) ──────────────────────────────────────
  // Simple cannon shape in a 14×7 grid × 2px blocks
  var PLAYER_SPRITE = [
    [6,0],[7,0],
    [5,1],[6,1],[7,1],[8,1],
    [4,2],[5,2],[6,2],[7,2],[8,2],[9,2],
    [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[12,3],[13,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],
    [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5],
    [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],[13,6]
  ];

  function drawPlayer(ctx, x, y) {
    drawSprite(ctx, PLAYER_SPRITE, x - PLAYER_W / 2, y - PLAYER_H, C_PLAYER);
  }

  // ─── Barrier pixel data (40×24, pixel = 2px) — classic bunker shape ───────
  // 20 cols × 12 rows
  var BARRIER_PIXELS = (function () {
    var pixels = [];
    var mask = [
      '  xxxxxxxxxxxxxxxx  ',
      ' xxxxxxxxxxxxxxxxxxxx',
      'xxxxxxxxxxxxxxxxxxxx',
      'xxxxxxxxxxxxxxxxxxxx',
      'xxxxxxxxxxxxxxxxxxxx',
      'xxxxxxxxxxxxxxxxxxxx',
      'xxxxxxxxxxxxxxxxxxxx',
      'xxxxxxxxxxxxxxxxxxxx',
      'xxxxxxxxx  xxxxxxxxx',
      'xxxxxxxx    xxxxxxxx',
      'xxxxxxx      xxxxxxx',
      'xxxxxx        xxxxxx'
    ];
    for (var row = 0; row < mask.length; row++) {
      for (var col = 0; col < mask[row].length; col++) {
        if (mask[row][col] === 'x') {
          pixels.push([col, row]);
        }
      }
    }
    return pixels;
  }());
  var BARRIER_PIXEL_SIZE = 2;
  var BARRIER_W = 21 * BARRIER_PIXEL_SIZE; // ~42
  var BARRIER_H = 12 * BARRIER_PIXEL_SIZE; // 24

  // ─── SpaceInvaders constructor ────────────────────────────────────────────────
  function SpaceInvaders(canvas) {
    GameBase.call(this, canvas);

    // input state
    this._keys = {};
    var self = this;
    window.addEventListener('keydown', function (e) {
      self._keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      self._keys[e.code] = false;
    });
  }
  GameBase.extend(SpaceInvaders);

  // ─── init ─────────────────────────────────────────────────────────────────────
  SpaceInvaders.prototype.init = function () {
    hideOverlay();
    this._wave      = 1;
    this._score     = 0;
    this._lives     = 3;
    this._gameOver  = false;
    this._won       = false;

    this._initWave();
    updateHUD(0);
  };

  SpaceInvaders.prototype._initWave = function () {
    var W = this.width;
    var H = this.height;

    // Player
    this._px     = Math.floor(W / 2);
    this._py     = H - 32;

    // Player bullet (null = no bullet)
    this._pb     = null;  // {x, y}

    // Alien bullets
    this._abs    = [];    // [{x, y}]

    // Alien grid
    this._aliens = [];    // {row, col, alive, x, y}
    this._frame  = 0;     // animation frame (0 or 1)

    // Grid origin so grid is centred
    var gridW = COLS * (ALIEN_W + ALIEN_GAP_X) - ALIEN_GAP_X;
    var gridH = ROWS * (ALIEN_H + ALIEN_GAP_Y) - ALIEN_GAP_Y;
    var ox = Math.floor((W - gridW) / 2);
    var oy = 60;

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        this._aliens.push({
          row: r,
          col: c,
          alive: true,
          x: ox + c * (ALIEN_W + ALIEN_GAP_X),
          y: oy + r * (ALIEN_H + ALIEN_GAP_Y)
        });
      }
    }

    // Movement
    this._dir        = 1;   // 1 = right, -1 = left
    this._stepTimer  = 0;
    this._baseInterval = Math.max(0.08, 0.65 - (this._wave - 1) * 0.07);
    this._stepInterval = this._baseInterval;

    // Barriers — 4 bunkers spread across width
    this._barriers = [];
    var bCount = 4;
    var bSpacing = Math.floor(W / (bCount + 1));
    var bY = this._py - 60;
    for (var i = 0; i < bCount; i++) {
      this._barriers.push({
        x: bSpacing * (i + 1) - Math.floor(BARRIER_W / 2),
        y: bY,
        pixels: BARRIER_PIXELS.slice()  // shared ref is OK, we'll track damage per-barrier
      });
    }
    // Per-barrier damage: use a Set of "col,row" strings for destroyed pixels
    this._barrierDamage = [];
    for (var j = 0; j < bCount; j++) {
      this._barrierDamage.push({});
    }

    // Alien shoot cooldown
    this._alienShootTimer = 1.0;
  };

  // ─── update ───────────────────────────────────────────────────────────────────
  SpaceInvaders.prototype.update = function (dt) {
    if (this._gameOver || this._won) return;

    this._movePlayer(dt);
    this._updatePlayerBullet(dt);
    this._updateAlienBullets(dt);
    this._moveAliens(dt);
    this._alienShoot(dt);
    this._checkCollisions();
    this._checkWinLose();
  };

  SpaceInvaders.prototype._movePlayer = function (dt) {
    var speed = PLAYER_SPEED * dt;
    if (this._keys['ArrowLeft'] || this._keys['KeyA']) {
      this._px -= speed;
    }
    if (this._keys['ArrowRight'] || this._keys['KeyD']) {
      this._px += speed;
    }
    // clamp
    var half = PLAYER_W / 2;
    if (this._px < half) this._px = half;
    if (this._px > this.width - half) this._px = this.width - half;

    // Fire
    if ((this._keys['Space'] || this._keys['ArrowUp'] || this._keys['KeyW']) && !this._pb) {
      this._pb = { x: this._px, y: this._py - PLAYER_H };
      SoundFX.shoot();
    }
  };

  SpaceInvaders.prototype._updatePlayerBullet = function (dt) {
    if (!this._pb) return;
    this._pb.y -= BULLET_SPEED_P * dt;
    if (this._pb.y < -BULLET_H) {
      this._pb = null;
    }
  };

  SpaceInvaders.prototype._updateAlienBullets = function (dt) {
    for (var i = this._abs.length - 1; i >= 0; i--) {
      this._abs[i].y += BULLET_SPEED_A * dt;
      if (this._abs[i].y > this.height + BULLET_H) {
        this._abs.splice(i, 1);
      }
    }
  };

  SpaceInvaders.prototype._moveAliens = function (dt) {
    this._stepTimer += dt;
    if (this._stepTimer < this._stepInterval) return;
    this._stepTimer = 0;

    // Alternate animation frame
    this._frame = 1 - this._frame;

    var alive = this._aliveAliens();
    if (alive.length === 0) return;

    // Check if any alien would go out of bounds if we step horizontally
    var stepX = STEP_PX * this._dir;
    var minX = Infinity, maxX = -Infinity;
    for (var i = 0; i < alive.length; i++) {
      var ax = alive[i].x + stepX;
      if (ax < minX) minX = ax;
      if (ax + ALIEN_W > maxX) maxX = ax + ALIEN_W;
    }

    var margin = 6;
    var hitWall = (minX < margin) || (maxX > this.width - margin);

    if (hitWall) {
      // Drop down then reverse
      for (var j = 0; j < alive.length; j++) {
        alive[j].y += DROP_PX;
      }
      this._dir = -this._dir;
    } else {
      for (var k = 0; k < alive.length; k++) {
        alive[k].x += stepX;
      }
    }

    // Speed up as aliens die (fewer = faster)
    var total = COLS * ROWS;
    var remaining = alive.length;
    var frac = remaining / total;
    this._stepInterval = Math.max(0.05, this._baseInterval * frac);
  };

  SpaceInvaders.prototype._aliveAliens = function () {
    var out = [];
    for (var i = 0; i < this._aliens.length; i++) {
      if (this._aliens[i].alive) out.push(this._aliens[i]);
    }
    return out;
  };

  // Only the bottom-most alien in each column can shoot
  SpaceInvaders.prototype._frontAliens = function () {
    var front = {};  // col -> alien with highest row index (lowest on screen)
    for (var i = 0; i < this._aliens.length; i++) {
      var a = this._aliens[i];
      if (!a.alive) continue;
      if (front[a.col] === undefined || a.row > front[a.col].row) {
        front[a.col] = a;
      }
    }
    var out = [];
    for (var c in front) {
      if (Object.prototype.hasOwnProperty.call(front, c)) {
        out.push(front[c]);
      }
    }
    return out;
  };

  SpaceInvaders.prototype._alienShoot = function (dt) {
    this._alienShootTimer -= dt;
    if (this._alienShootTimer > 0) return;

    // Reset timer — faster on higher waves, max 3 bullets on screen
    this._alienShootTimer = Math.max(0.4, 1.5 - (this._wave - 1) * 0.15);

    if (this._abs.length >= 3) return;

    var front = this._frontAliens();
    if (front.length === 0) return;

    // Pick a random front alien
    var shooter = front[Math.floor(Math.random() * front.length)];
    this._abs.push({
      x: shooter.x + Math.floor(ALIEN_W / 2),
      y: shooter.y + ALIEN_H
    });
  };

  SpaceInvaders.prototype._checkCollisions = function () {
    var i, j, a, b, bx, by;

    // Player bullet vs aliens
    if (this._pb) {
      bx = this._pb.x;
      by = this._pb.y;
      for (i = 0; i < this._aliens.length; i++) {
        a = this._aliens[i];
        if (!a.alive) continue;
        if (bx >= a.x && bx <= a.x + ALIEN_W &&
            by >= a.y && by <= a.y + ALIEN_H) {
          a.alive = false;
          this._pb = null;
          SoundFX.alienDie();
          // Score by row: row 0 = 40, 1 = 30, 2 = 20, 3 = 10
          var pts = [40, 30, 20, 10][a.row] || 10;
          this._score += pts;
          updateHUD(this._score);
          break;
        }
      }
    }

    // Player bullet vs barriers
    if (this._pb) {
      this._bulletVsBarriers(this._pb, true);
    }

    // Alien bullets vs player
    for (i = this._abs.length - 1; i >= 0; i--) {
      b = this._abs[i];
      var px = this._px;
      var py = this._py;
      if (b.x >= px - PLAYER_W / 2 && b.x <= px + PLAYER_W / 2 &&
          b.y >= py - PLAYER_H && b.y <= py) {
        this._abs.splice(i, 1);
        this._lives--;
        SoundFX.loseLife();
        if (this._lives <= 0) {
          this._gameOver = true;
          SoundFX.gameOver();
        } else {
          // Brief invincibility reset (simple: just continue)
          this._px = Math.floor(this.width / 2);
        }
      }
    }

    // Alien bullets vs barriers
    for (i = this._abs.length - 1; i >= 0; i--) {
      if (this._bulletVsBarriers(this._abs[i], false)) {
        this._abs.splice(i, 1);
      }
    }

    // Aliens reach player line
    var playerLine = this._py - PLAYER_H;
    for (i = 0; i < this._aliens.length; i++) {
      a = this._aliens[i];
      if (!a.alive) continue;
      if (a.y + ALIEN_H >= playerLine) {
        this._gameOver = true;
        SoundFX.gameOver();
        break;
      }
    }
  };

  // Returns true if bullet hit a barrier pixel (and destroys it)
  SpaceInvaders.prototype._bulletVsBarriers = function (bullet, isPlayer) {
    var bx = Math.floor(bullet.x);
    var by = Math.floor(bullet.y);

    for (var bi = 0; bi < this._barriers.length; bi++) {
      var bar = this._barriers[bi];
      var dmg = this._barrierDamage[bi];
      // coarse AABB
      if (bx < bar.x || bx > bar.x + BARRIER_W || by < bar.y || by > bar.y + BARRIER_H) continue;

      // check per pixel
      var localX = bx - bar.x;
      var localY = by - bar.y;

      // find pixel column/row from local coords (each pixel is BARRIER_PIXEL_SIZE px)
      var pc = Math.floor(localX / BARRIER_PIXEL_SIZE);
      var pr = Math.floor(localY / BARRIER_PIXEL_SIZE);
      var key = pc + ',' + pr;

      // Check if this pixel exists in the sprite and is not already destroyed
      if (dmg[key]) continue;
      var pixels = BARRIER_PIXELS;
      var found = false;
      for (var pi = 0; pi < pixels.length; pi++) {
        if (pixels[pi][0] === pc && pixels[pi][1] === pr) {
          found = true;
          break;
        }
      }
      if (!found) continue;

      // Destroy 2×2 block of pixels around hit
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          dmg[(pc + dc) + ',' + (pr + dr)] = true;
        }
      }
      if (isPlayer) this._pb = null;
      return true;
    }
    return false;
  };

  SpaceInvaders.prototype._checkWinLose = function () {
    if (this._gameOver) {
      showOverlay('GAME OVER', this._score);
      this.paused = true;
      return;
    }
    var alive = this._aliveAliens();
    if (alive.length === 0) {
      SoundFX.newWave();
      this._wave++;
      this._initWave();
      // Show brief wave message drawn on canvas (handled in render)
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────────
  SpaceInvaders.prototype.render = function () {
    var ctx = this.ctx;
    var W   = this.width;
    var H   = this.height;

    this.clear(C_BG);

    this._drawBarriers(ctx);
    this._drawAliens(ctx);
    this._drawPlayer(ctx);
    this._drawBullets(ctx);
    this._drawHUDCanvas(ctx, W, H);
  };

  SpaceInvaders.prototype._drawAliens = function (ctx) {
    for (var i = 0; i < this._aliens.length; i++) {
      var a = this._aliens[i];
      if (!a.alive) continue;

      var color, sprites;
      if (a.row <= 1) {
        color   = C_ALIEN1;
        sprites = [SQUID_F0, SQUID_F1];
      } else {
        color   = C_ALIEN2;
        sprites = [CRAB_F0, CRAB_F1];
      }
      var pixels = sprites[this._frame];
      drawSprite(ctx, pixels, Math.floor(a.x), Math.floor(a.y), color);
    }
  };

  SpaceInvaders.prototype._drawPlayer = function (ctx) {
    drawPlayer(ctx, this._px, this._py);
  };

  SpaceInvaders.prototype._drawBullets = function (ctx) {
    // Player bullet
    if (this._pb) {
      ctx.fillStyle = C_BULLET_P;
      ctx.fillRect(
        Math.floor(this._pb.x - BULLET_W / 2),
        Math.floor(this._pb.y),
        BULLET_W, BULLET_H
      );
    }
    // Alien bullets (zigzag visual — alternate columns each step)
    ctx.fillStyle = C_BULLET_A;
    for (var i = 0; i < this._abs.length; i++) {
      var b = this._abs[i];
      // Draw zigzag: two offset rects
      var zigOffset = ((Math.floor(b.y / 6) % 2) === 0) ? -1 : 1;
      ctx.fillRect(Math.floor(b.x - 1 + zigOffset), Math.floor(b.y),     BULLET_W, 4);
      ctx.fillRect(Math.floor(b.x - 1 - zigOffset), Math.floor(b.y + 4), BULLET_W, 4);
    }
  };

  SpaceInvaders.prototype._drawBarriers = function (ctx) {
    for (var bi = 0; bi < this._barriers.length; bi++) {
      var bar = this._barriers[bi];
      var dmg = this._barrierDamage[bi];
      ctx.fillStyle = C_BARRIER;
      var pixels = BARRIER_PIXELS;
      for (var pi = 0; pi < pixels.length; pi++) {
        var pc = pixels[pi][0];
        var pr = pixels[pi][1];
        var key = pc + ',' + pr;
        if (dmg[key]) continue;
        ctx.fillRect(
          Math.floor(bar.x + pc * BARRIER_PIXEL_SIZE),
          Math.floor(bar.y + pr * BARRIER_PIXEL_SIZE),
          BARRIER_PIXEL_SIZE,
          BARRIER_PIXEL_SIZE
        );
      }
    }
  };

  SpaceInvaders.prototype._drawHUDCanvas = function (ctx, W, H) {
    // Lives (drawn as small player icons)
    ctx.fillStyle = C_HUD;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('LIVES', 8, H - 22);

    var iconScale = 10; // icon width
    for (var i = 0; i < this._lives; i++) {
      var ix = 70 + i * (iconScale + 4);
      var iy = H - 18;
      // tiny player icon: 10×6 — 5 cols × 3 rows, pixel = 2
      var tinyPlayer = [
        [2,0],
        [1,1],[2,1],[3,1],
        [0,2],[1,2],[2,2],[3,2],[4,2]
      ];
      for (var p = 0; p < tinyPlayer.length; p++) {
        ctx.fillRect(ix + tinyPlayer[p][0] * 2, iy + tinyPlayer[p][1] * 2, 2, 2);
      }
    }

    // Wave indicator
    ctx.fillStyle = C_HUD;
    ctx.textBaseline = 'top';
    var waveText = 'WAVE ' + this._wave;
    var tw = ctx.measureText(waveText).width;
    ctx.fillText(waveText, Math.floor(W / 2 - tw / 2), 8);
  };

  // ─── Bootstrap ────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('game-canvas');
    var game = new SpaceInvaders(canvas);
    game.start();
    document.getElementById('btn-restart').addEventListener('click', function () {
      game.paused = false;
      game.start();
    });
    window._game = game;
  });

}());
