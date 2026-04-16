/**
 * game-c/game.js — Asteroids completo.
 * Agente 4 — Implementação do jogo Asteroids usando GameBase.
 */
(function () {
  'use strict';

  /* ─── Constantes de cores ─────────────────────────────────── */
  var COLOR_BG        = '#0d0d1a';
  var COLOR_SHIP      = '#00e5ff';
  var COLOR_BULLET    = '#6c63ff';
  var COLOR_ASTEROID  = '#e0e0f0';
  var COLOR_STAR      = 'rgba(224,224,240,0.7)';

  /* ─── Constantes de jogo ──────────────────────────────────── */
  var SHIP_ACCEL      = 220;   // px/s²
  var SHIP_FRICTION   = 0.97;  // multiplicador por frame (aplicado sobre dt)
  var SHIP_ROTATE     = 3.2;   // rad/s
  var BULLET_SPEED    = 520;   // px/s
  var BULLET_LIFE     = 1.4;   // s
  var MAX_BULLETS     = 5;
  var SHOOT_COOLDOWN  = 0.25;  // s
  var INVULN_TIME     = 2.0;   // s
  var BLINK_RATE      = 8;     // piscadas/s durante invulnerabilidade
  var PARTICLE_LIFE   = 0.7;   // s
  var NUM_STARS       = 90;

  var ASTEROID_SIZES  = { large: 50, medium: 30, small: 15 };
  var ASTEROID_SCORES = { large: 100, medium: 50, small: 25 };
  var ASTEROID_SPEEDS = { large: 55, medium: 90, small: 140 };
  var ASTEROID_VERTS  = { min: 5, max: 9 };

  /* ─── Utilitários ─────────────────────────────────────────── */
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function twoPi() { return Math.PI * 2; }

  function wrapCoord(val, max) {
    if (val < 0)   return val + max;
    if (val > max) return val - max;
    return val;
  }

  /* ─── Estrelas estáticas ──────────────────────────────────── */
  function buildStars(w, h) {
    var stars = [];
    for (var i = 0; i < NUM_STARS; i++) {
      stars.push({
        x:    rand(0, w),
        y:    rand(0, h),
        r:    rand(0.5, 2),
        a:    rand(0.3, 1)
      });
    }
    return stars;
  }

  /* ─── Nave ────────────────────────────────────────────────── */
  function Ship(x, y) {
    this.x       = x;
    this.y       = y;
    this.vx      = 0;
    this.vy      = 0;
    this.angle   = -Math.PI / 2; // aponta para cima
    this.radius  = 14;
    this.thrusting = false;
  }

  Ship.prototype.update = function (dt, keys, w, h) {
    // rotação
    if (keys.left)  this.angle -= SHIP_ROTATE * dt;
    if (keys.right) this.angle += SHIP_ROTATE * dt;

    // thrust
    this.thrusting = !!(keys.up);
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP_ACCEL * dt;
      this.vy += Math.sin(this.angle) * SHIP_ACCEL * dt;
    }

    // atrito
    var frict = Math.pow(SHIP_FRICTION, dt * 60);
    this.vx *= frict;
    this.vy *= frict;

    // movimento
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // warp
    this.x = wrapCoord(this.x, w);
    this.y = wrapCoord(this.y, h);
  };

  Ship.prototype.draw = function (ctx, blinkVisible) {
    if (!blinkVisible) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // glow
    ctx.shadowColor = COLOR_SHIP;
    ctx.shadowBlur  = 14;
    ctx.strokeStyle = COLOR_SHIP;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';

    // corpo triangular
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, 11);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, -11);
    ctx.closePath();
    ctx.stroke();

    // chama do thruster
    if (this.thrusting) {
      ctx.strokeStyle = '#ff6584';
      ctx.shadowColor = '#ff6584';
      ctx.shadowBlur  = 18;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(-7, 5);
      ctx.lineTo(-18 - rand(0, 6), 0);
      ctx.lineTo(-7, -5);
      ctx.stroke();
    }

    ctx.restore();
  };

  /* ─── Projétil ────────────────────────────────────────────── */
  function Bullet(x, y, angle) {
    this.x    = x + Math.cos(angle) * 20;
    this.y    = y + Math.sin(angle) * 20;
    this.vx   = Math.cos(angle) * BULLET_SPEED;
    this.vy   = Math.sin(angle) * BULLET_SPEED;
    this.life = BULLET_LIFE;
    this.radius = 3;
  }

  Bullet.prototype.update = function (dt, w, h) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.x = wrapCoord(this.x, w);
    this.y = wrapCoord(this.y, h);
  };

  Bullet.prototype.draw = function (ctx) {
    ctx.save();
    ctx.shadowColor = COLOR_BULLET;
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = COLOR_BULLET;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, twoPi());
    ctx.fill();
    ctx.restore();
  };

  /* ─── Asteroide ───────────────────────────────────────────── */
  function Asteroid(x, y, size) {
    this.x      = x;
    this.y      = y;
    this.size   = size; // 'large' | 'medium' | 'small'
    this.radius = ASTEROID_SIZES[size];
    var spd     = ASTEROID_SPEEDS[size];
    var angle   = rand(0, twoPi());
    this.vx     = Math.cos(angle) * rand(spd * 0.6, spd * 1.4);
    this.vy     = Math.sin(angle) * rand(spd * 0.6, spd * 1.4);
    this.rotSpeed = rand(-1.5, 1.5);
    this.rot    = rand(0, twoPi());
    this._buildShape();
  }

  Asteroid.prototype._buildShape = function () {
    var n   = randInt(ASTEROID_VERTS.min, ASTEROID_VERTS.max);
    var r   = this.radius;
    this.verts = [];
    for (var i = 0; i < n; i++) {
      var a   = (i / n) * twoPi();
      var jit = rand(0.6, 1.3);
      this.verts.push({
        x: Math.cos(a) * r * jit,
        y: Math.sin(a) * r * jit
      });
    }
  };

  Asteroid.prototype.update = function (dt, w, h) {
    this.x   += this.vx * dt;
    this.y   += this.vy * dt;
    this.rot += this.rotSpeed * dt;
    this.x = wrapCoord(this.x, w);
    this.y = wrapCoord(this.y, h);
  };

  Asteroid.prototype.draw = function (ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.shadowColor = COLOR_ASTEROID;
    ctx.shadowBlur  = 8;
    ctx.strokeStyle = COLOR_ASTEROID;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.verts[0].x, this.verts[0].y);
    for (var i = 1; i < this.verts.length; i++) {
      ctx.lineTo(this.verts[i].x, this.verts[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };

  /* ─── Partícula de explosão ───────────────────────────────── */
  function Particle(x, y) {
    var angle = rand(0, twoPi());
    var spd   = rand(40, 160);
    this.x    = x;
    this.y    = y;
    this.vx   = Math.cos(angle) * spd;
    this.vy   = Math.sin(angle) * spd;
    this.life = PARTICLE_LIFE;
    this.maxLife = PARTICLE_LIFE;
    this.len  = rand(4, 14);
    this.angle = angle;
    this.color = Math.random() < 0.5 ? '#ff6584' : '#00e5ff';
  }

  Particle.prototype.update = function (dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.97;
    this.vy *= 0.97;
    this.life -= dt;
  };

  Particle.prototype.draw = function (ctx) {
    var alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 6;
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(this.angle) * this.len,
      this.y + Math.sin(this.angle) * this.len
    );
    ctx.stroke();
    ctx.restore();
  };

  /* ─── Função de spawn de asteroides para uma wave ─────────── */
  function spawnWave(count, w, h, ship) {
    var asteroids = [];
    for (var i = 0; i < count; i++) {
      var x, y;
      // spawn longe da nave
      do {
        x = rand(0, w);
        y = rand(0, h);
      } while (dist(x, y, ship.x, ship.y) < 120);
      asteroids.push(new Asteroid(x, y, 'large'));
    }
    return asteroids;
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function circlesOverlap(ax, ay, ar, bx, by, br) {
    return dist(ax, ay, bx, by) < ar + br;
  }

  /* ─── Overlay helpers ─────────────────────────────────────── */
  function showOverlay(title, score) {
    var overlay = document.getElementById('overlay');
    var titleEl = document.getElementById('overlay-title');
    var scoreEl = document.getElementById('overlay-score');
    if (overlay) overlay.classList.remove('overlay--hidden');
    if (titleEl) titleEl.textContent = title;
    if (scoreEl) scoreEl.textContent = 'Pontuação: ' + score;
  }

  function hideOverlay() {
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('overlay--hidden');
  }

  function updateHUD(score) {
    var el = document.getElementById('score');
    if (el) el.textContent = score;
  }

  /* ─── Classe principal Asteroids ──────────────────────────── */
  function Asteroids(canvas) {
    GameBase.call(this, canvas);
    this._keys       = {};
    this._score      = 0;
    this._lives      = 3;
    this._wave       = 1;
    this._ship       = null;
    this._bullets    = [];
    this._asteroids  = [];
    this._particles  = [];
    this._stars      = [];
    this._shootTimer = 0;
    this._invuln     = 0;  // tempo restante de invulnerabilidade
    this._gameOver   = false;
    this._waveClearing = false; // flag para aguardar nova wave
    this._wavePause  = 0;      // contador de pausa entre waves

    var self = this;
    document.addEventListener('keydown', function (e) {
      self._keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    document.addEventListener('keyup', function (e) {
      self._keys[e.code] = false;
    });
  }

  GameBase.extend(Asteroids);

  Asteroids.prototype.init = function () {
    this._score      = 0;
    this._lives      = 3;
    this._wave       = 1;
    this._bullets    = [];
    this._particles  = [];
    this._shootTimer = 0;
    this._invuln     = 0;
    this._gameOver   = false;
    this._waveClearing = false;
    this._wavePause  = 0;

    this._stars = buildStars(this.width, this.height);
    this._ship  = new Ship(this.width / 2, this.height / 2);
    this._asteroids = spawnWave(this._wave + 2, this.width, this.height, this._ship);

    updateHUD(this._score);
    hideOverlay();
  };

  Asteroids.prototype.update = function (dt) {
    if (this._gameOver) return;

    /* ── Pausa entre waves ── */
    if (this._waveClearing) {
      this._wavePause -= dt;
      if (this._wavePause <= 0) {
        this._waveClearing = false;
        this._wave++;
        this._asteroids = spawnWave(this._wave + 2, this.width, this.height, this._ship);
      }
      this._updateParticles(dt);
      return;
    }

    /* ── Tiro ── */
    this._shootTimer = Math.max(0, this._shootTimer - dt);
    var canShoot = this._keys['Space'] && this._shootTimer === 0 && this._bullets.length < MAX_BULLETS;
    if (canShoot) {
      this._bullets.push(new Bullet(this._ship.x, this._ship.y, this._ship.angle));
      this._shootTimer = SHOOT_COOLDOWN;
    }

    /* ── Nave ── */
    this._ship.update(dt, {
      left:  this._keys['ArrowLeft']  || this._keys['KeyA'],
      right: this._keys['ArrowRight'] || this._keys['KeyD'],
      up:    this._keys['ArrowUp']    || this._keys['KeyW']
    }, this.width, this.height);

    /* ── Invulnerabilidade ── */
    if (this._invuln > 0) this._invuln -= dt;

    /* ── Projéteis ── */
    for (var bi = this._bullets.length - 1; bi >= 0; bi--) {
      this._bullets[bi].update(dt, this.width, this.height);
      if (this._bullets[bi].life <= 0) {
        this._bullets.splice(bi, 1);
      }
    }

    /* ── Asteroides ── */
    for (var ai = 0; ai < this._asteroids.length; ai++) {
      this._asteroids[ai].update(dt, this.width, this.height);
    }

    /* ── Colisão: projétil × asteroide ── */
    for (var bi2 = this._bullets.length - 1; bi2 >= 0; bi2--) {
      var bullet = this._bullets[bi2];
      var hit = false;
      for (var ai2 = this._asteroids.length - 1; ai2 >= 0; ai2--) {
        var ast = this._asteroids[ai2];
        if (circlesOverlap(bullet.x, bullet.y, bullet.radius, ast.x, ast.y, ast.radius)) {
          this._destroyAsteroid(ai2);
          this._bullets.splice(bi2, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    /* ── Colisão: nave × asteroide ── */
    if (this._invuln <= 0) {
      for (var ai3 = 0; ai3 < this._asteroids.length; ai3++) {
        var ast3 = this._asteroids[ai3];
        if (circlesOverlap(this._ship.x, this._ship.y, this._ship.radius - 4,
                           ast3.x, ast3.y, ast3.radius)) {
          this._loseLife();
          break;
        }
      }
    }

    /* ── Partículas ── */
    this._updateParticles(dt);

    /* ── Verificar wave vazia ── */
    if (this._asteroids.length === 0 && !this._waveClearing) {
      this._waveClearing = true;
      this._wavePause    = 2.0;
    }
  };

  Asteroids.prototype._updateParticles = function (dt) {
    for (var pi = this._particles.length - 1; pi >= 0; pi--) {
      this._particles[pi].update(dt);
      if (this._particles[pi].life <= 0) {
        this._particles.splice(pi, 1);
      }
    }
  };

  Asteroids.prototype._destroyAsteroid = function (idx) {
    var ast = this._asteroids[idx];

    // score
    this._score += ASTEROID_SCORES[ast.size];
    updateHUD(this._score);

    // partículas
    var count = ast.size === 'large' ? 14 : ast.size === 'medium' ? 9 : 5;
    for (var p = 0; p < count; p++) {
      this._particles.push(new Particle(ast.x, ast.y));
    }

    // fragmentação
    if (ast.size === 'large') {
      this._asteroids.push(new Asteroid(ast.x, ast.y, 'medium'));
      this._asteroids.push(new Asteroid(ast.x, ast.y, 'medium'));
    } else if (ast.size === 'medium') {
      this._asteroids.push(new Asteroid(ast.x, ast.y, 'small'));
      this._asteroids.push(new Asteroid(ast.x, ast.y, 'small'));
    }

    this._asteroids.splice(idx, 1);
  };

  Asteroids.prototype._loseLife = function () {
    this._lives--;
    // partículas de explosão da nave
    for (var p = 0; p < 20; p++) {
      this._particles.push(new Particle(this._ship.x, this._ship.y));
    }

    if (this._lives <= 0) {
      this._gameOver = true;
      var self = this;
      // pequeno delay para ver a explosão
      setTimeout(function () {
        showOverlay('Game Over', self._score);
        self.stop();
      }, 600);
      return;
    }

    // reposicionar nave ao centro
    this._ship.x  = this.width  / 2;
    this._ship.y  = this.height / 2;
    this._ship.vx = 0;
    this._ship.vy = 0;
    this._invuln  = INVULN_TIME;
  };

  Asteroids.prototype.render = function () {
    this.clear(COLOR_BG);
    var ctx = this.ctx;

    /* ── Estrelas ── */
    for (var si = 0; si < this._stars.length; si++) {
      var s = this._stars[si];
      ctx.save();
      ctx.globalAlpha = s.a;
      ctx.fillStyle   = COLOR_STAR;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, twoPi());
      ctx.fill();
      ctx.restore();
    }

    /* ── Asteroides ── */
    for (var ai = 0; ai < this._asteroids.length; ai++) {
      this._asteroids[ai].draw(ctx);
    }

    /* ── Projéteis ── */
    for (var bi = 0; bi < this._bullets.length; bi++) {
      this._bullets[bi].draw(ctx);
    }

    /* ── Partículas ── */
    for (var pi = 0; pi < this._particles.length; pi++) {
      this._particles[pi].draw(ctx);
    }

    /* ── Nave (com blink durante invulnerabilidade) ── */
    var blinkVisible = true;
    if (this._invuln > 0) {
      blinkVisible = Math.floor(this._invuln * BLINK_RATE) % 2 === 0;
    }
    if (!this._gameOver) {
      this._ship.draw(ctx, blinkVisible);
    }

    /* ── HUD canvas: vidas e wave ── */
    this._drawCanvasHUD(ctx);

    /* ── Mensagem de wave vazia ── */
    if (this._waveClearing) {
      ctx.save();
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.font         = 'bold 28px "Courier New", monospace';
      ctx.shadowColor  = '#00e5ff';
      ctx.shadowBlur   = 20;
      ctx.fillStyle    = '#00e5ff';
      ctx.fillText('Wave ' + (this._wave + 1) + ' em breve...', this.width / 2, this.height / 2);
      ctx.restore();
    }
  };

  Asteroids.prototype._drawCanvasHUD = function (ctx) {
    /* Vidas como ícones triangulares no canto superior direito */
    ctx.save();
    ctx.strokeStyle = COLOR_SHIP;
    ctx.shadowColor = COLOR_SHIP;
    ctx.shadowBlur  = 10;
    ctx.lineWidth   = 1.5;
    for (var i = 0; i < this._lives; i++) {
      var lx = this.width - 30 - i * 28;
      var ly = 22;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(-Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-7, 6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, -6);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    /* Wave no canto inferior esquerdo */
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'bottom';
    ctx.font         = '13px "Courier New", monospace';
    ctx.fillStyle    = 'rgba(224,224,240,0.5)';
    ctx.shadowBlur   = 0;
    ctx.fillText('WAVE ' + this._wave, 16, this.height - 12);
    ctx.restore();
  };

  /* ─── Bootstrap ───────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('game-canvas');
    var game   = new Asteroids(canvas);
    game.start();
    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });
    window._game = game;
  });

}());
