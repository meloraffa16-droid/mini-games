/**
 * game-c/game.js — Asteroids completo.
 * Agente 4 — Implementação do jogo Asteroids usando GameBase.
 * Visual: 8-BIT / PIXEL ART — zero shadowBlur, zero gradientes, zero arc() arredondado.
 */
(function () {
  'use strict';

  /* ─── Constantes de cores (paleta 8-bit obrigatória) ─────────── */
  var COLOR_BG        = '#0a0a1a';
  var COLOR_SHIP      = '#00fff0';   // cyan
  var COLOR_THRUSTER  = '#ff2d6f';   // pink
  var COLOR_BULLET    = '#ffff00';   // yellow
  var COLOR_AST_FILL  = '#1a1a3a';   // escuro sólido
  var COLOR_AST_STROKE= '#e8e8ff';   // claro
  var COLOR_STAR      = '#e8e8ff';
  var COLOR_PART_A    = '#ff2d6f';   // partícula rosa
  var COLOR_PART_B    = '#ffff00';   // partícula amarela
  var COLOR_TEXT      = '#00fff0';   // cyan para texto wave

  /* ─── Constantes de jogo ──────────────────────────────────────── */
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

  /* ─── Utilitários ─────────────────────────────────────────────── */
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function twoPi() { return Math.PI * 2; }

  function wrapCoord(val, max) {
    if (val < 0)   return val + max;
    if (val > max) return val - max;
    return val;
  }

  /* helper: piso de coordenada para pixel-aligned */
  function px(v) { return Math.floor(v); }

  /* ─── Estrelas estáticas ──────────────────────────────────────── */
  /* Cada estrela tem tamanho 1 ou 2 px; alpha fixo em 0.6 */
  function buildStars(w, h) {
    var stars = [];
    for (var i = 0; i < NUM_STARS; i++) {
      stars.push({
        x: px(rand(0, w)),
        y: px(rand(0, h)),
        s: Math.random() < 0.35 ? 2 : 1   // tamanho: 1×1 ou 2×2
      });
    }
    return stars;
  }

  /* ─── Nave ────────────────────────────────────────────────────── */
  function Ship(x, y) {
    this.x         = x;
    this.y         = y;
    this.vx        = 0;
    this.vy        = 0;
    this.angle     = -Math.PI / 2; // aponta para cima
    this.radius    = 14;
    this.thrusting = false;
    this._thrusterFrame = 0; // alterna entre 2 frames fixos do thruster
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
      // alterna frame do thruster a ~8fps
      this._thrusterFrame = Math.floor(Date.now() / 120) % 2;
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
    ctx.translate(px(this.x), px(this.y));
    ctx.rotate(this.angle);

    /* ── corpo triangular: stroke sólido, sem glow ── */
    ctx.strokeStyle = COLOR_SHIP;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'miter';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, 11);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, -11);
    ctx.closePath();
    ctx.stroke();

    /* ── chama do thruster: 2 frames alternados, sem rand() por frame ── */
    if (this.thrusting) {
      ctx.strokeStyle = COLOR_THRUSTER;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'miter';
      if (this._thrusterFrame === 0) {
        /* frame A — chama curta */
        ctx.beginPath();
        ctx.moveTo(-7, 5);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-7, -5);
        ctx.stroke();
      } else {
        /* frame B — chama longa */
        ctx.beginPath();
        ctx.moveTo(-7, 4);
        ctx.lineTo(-24, 0);
        ctx.lineTo(-7, -4);
        ctx.stroke();
        /* linha central extra para dar volume no frame longo */
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-20, 0);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  /* ─── Projétil ────────────────────────────────────────────────── */
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

  /* quadradinho 4×4 sólido — zero arc(), zero glow */
  Bullet.prototype.draw = function (ctx) {
    ctx.fillStyle = COLOR_BULLET;
    ctx.fillRect(px(this.x) - 2, px(this.y) - 2, 4, 4);
  };

  /* ─── Asteroide ───────────────────────────────────────────────── */
  function Asteroid(x, y, size) {
    this.x        = x;
    this.y        = y;
    this.size     = size; // 'large' | 'medium' | 'small'
    this.radius   = ASTEROID_SIZES[size];
    var spd       = ASTEROID_SPEEDS[size];
    var angle     = rand(0, twoPi());
    this.vx       = Math.cos(angle) * rand(spd * 0.6, spd * 1.4);
    this.vy       = Math.sin(angle) * rand(spd * 0.6, spd * 1.4);
    this.rotSpeed = rand(-1.5, 1.5);
    this.rot      = rand(0, twoPi());
    this._buildShape();
  }

  Asteroid.prototype._buildShape = function () {
    var n      = randInt(ASTEROID_VERTS.min, ASTEROID_VERTS.max);
    var r      = this.radius;
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

  /* fill escuro sólido + stroke claro grosso — zero shadowBlur */
  Asteroid.prototype.draw = function (ctx) {
    ctx.save();
    ctx.translate(px(this.x), px(this.y));
    ctx.rotate(this.rot);

    ctx.beginPath();
    ctx.moveTo(px(this.verts[0].x), px(this.verts[0].y));
    for (var i = 1; i < this.verts.length; i++) {
      ctx.lineTo(px(this.verts[i].x), px(this.verts[i].y));
    }
    ctx.closePath();

    /* fill sólido escuro */
    ctx.fillStyle = COLOR_AST_FILL;
    ctx.fill();

    /* stroke claro grosso */
    ctx.strokeStyle = COLOR_AST_STROKE;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'miter';
    ctx.stroke();

    ctx.restore();
  };

  /* ─── Partícula de explosão ───────────────────────────────────── */
  function Particle(x, y) {
    var angle      = rand(0, twoPi());
    var spd        = rand(40, 160);
    this.x         = x;
    this.y         = y;
    this.vx        = Math.cos(angle) * spd;
    this.vy        = Math.sin(angle) * spd;
    this.life      = PARTICLE_LIFE;
    this.maxLife   = PARTICLE_LIFE;
    this.color     = Math.random() < 0.5 ? COLOR_PART_A : COLOR_PART_B;
  }

  Particle.prototype.update = function (dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.97;
    this.vy *= 0.97;
    this.life -= dt;
  };

  /* quadrado 2×2 com fade em steps discretos: 1.0 → 0.5 → 0 */
  Particle.prototype.draw = function (ctx) {
    var ratio = Math.max(0, this.life / this.maxLife);
    var alpha;
    if (ratio > 0.5) {
      alpha = 1.0;
    } else if (ratio > 0.15) {
      alpha = 0.5;
    } else {
      return; // invisível
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = this.color;
    ctx.fillRect(px(this.x) - 1, px(this.y) - 1, 3, 3);
    ctx.restore();
  };

  /* ─── Função de spawn de asteroides para uma wave ─────────────── */
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

  /* ─── Overlay helpers ─────────────────────────────────────────── */
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

  /* ─── Classe principal Asteroids ──────────────────────────────── */
  function Asteroids(canvas) {
    GameBase.call(this, canvas);
    this._keys         = {};
    this._score        = 0;
    this._lives        = 3;
    this._wave         = 1;
    this._ship         = null;
    this._bullets      = [];
    this._asteroids    = [];
    this._particles    = [];
    this._stars        = [];
    this._shootTimer   = 0;
    this._invuln       = 0;  // tempo restante de invulnerabilidade
    this._gameOver     = false;
    this._waveClearing = false; // flag para aguardar nova wave
    this._wavePause    = 0;     // contador de pausa entre waves

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
    this._score        = 0;
    this._lives        = 3;
    this._wave         = 1;
    this._bullets      = [];
    this._particles    = [];
    this._shootTimer   = 0;
    this._invuln       = 0;
    this._gameOver     = false;
    this._waveClearing = false;
    this._wavePause    = 0;

    this._stars      = buildStars(this.width, this.height);
    this._ship       = new Ship(this.width / 2, this.height / 2);
    this._asteroids  = spawnWave(this._wave + 2, this.width, this.height, this._ship);

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

    /* ── Estrelas: quadrados fixos, alpha fixo 0.6, zero arc() ── */
    ctx.fillStyle   = COLOR_STAR;
    ctx.globalAlpha = 0.6;
    for (var si = 0; si < this._stars.length; si++) {
      var s = this._stars[si];
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

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
      /* usa 'Press Start 2P' se disponível, senão monospace */
      ctx.font         = '18px "Press Start 2P", "Courier New", monospace';
      ctx.fillStyle    = COLOR_TEXT;
      ctx.fillText('WAVE ' + (this._wave + 1), this.width / 2, this.height / 2 - 12);
      ctx.font         = '12px "Press Start 2P", "Courier New", monospace';
      ctx.fillStyle    = COLOR_AST_STROKE;
      ctx.fillText('EM BREVE...', this.width / 2, this.height / 2 + 14);
      ctx.restore();
    }
  };

  Asteroids.prototype._drawCanvasHUD = function (ctx) {
    /* Vidas como ícones triangulares no canto superior direito — zero shadow */
    ctx.save();
    ctx.strokeStyle = COLOR_SHIP;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'miter';
    for (var i = 0; i < this._lives; i++) {
      var lx = this.width - 30 - i * 28;
      var ly = 22;
      ctx.save();
      ctx.translate(px(lx), px(ly));
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
    ctx.font         = '10px "Press Start 2P", "Courier New", monospace';
    ctx.fillStyle    = COLOR_AST_STROKE;
    ctx.globalAlpha  = 0.6;
    ctx.fillText('WAVE ' + this._wave, 16, this.height - 12);
    ctx.globalAlpha  = 1;
    ctx.restore();
  };

  /* ─── Bootstrap ───────────────────────────────────────────────── */
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
