(function () {
  'use strict';

  // --- Constantes ---
  var DOODLER_W      = 24;
  var DOODLER_H      = 24;
  var PLAT_W         = 60;
  var PLAT_H         = 10;
  var GRAVITY        = 900;       // px/s^2
  var JUMP_VEL       = -450;      // velocidade vertical ao pular
  var MOVE_SPEED     = 300;       // velocidade horizontal px/s
  var NUM_PLATFORMS   = 10;       // plataformas visíveis alvo
  var MIN_GAP        = 40;       // gap vertical mínimo entre plataformas
  var MAX_GAP        = 80;       // gap vertical máximo
  var SCORE_MILESTONE = 500;     // a cada N pontos, SoundFX.score()
  var STAR_COUNT      = 60;      // estrelas no fundo

  // --- Paleta 8-bit ---
  var COLOR_BG        = '#0a0a1a';
  var COLOR_PLAT      = '#39ff14';
  var COLOR_PLAT_BREAK = '#ff8c00';
  var COLOR_PLAT_MOVE  = '#00fff0';
  var COLOR_DOODLER   = '#39ff14';
  var COLOR_HIGHLIGHT = 'rgba(255,255,255,0.35)';
  var COLOR_STAR      = 'rgba(255,255,255,0.4)';

  // --- Estado do jogo ---
  var doodler;          // { x, y, vy, facingRight }
  var platforms;        // [{ x, y, type, broken, moveDir, moveSpeed }]
  var cameraY;          // offset vertical da câmera (mundo → tela)
  var score;
  var maxHeight;        // altura máxima alcançada (em pixels do mundo, para cima = negativo)
  var lastMilestone;    // último milestone de score
  var gameOver;
  var stars;            // [{ x, y, size }] — posições relativas à tela
  var keys;             // teclas pressionadas

  // --- Construtor ---
  function DoodleJump(canvas) {
    GameBase.call(this, canvas);
    this._boundKeydown = null;
    this._boundKeyup   = null;
  }
  GameBase.extend(DoodleJump);

  // ---------------------------------------------------------------
  // init
  // ---------------------------------------------------------------
  DoodleJump.prototype.init = function () {
    keys = {};
    gameOver = false;
    score = 0;
    lastMilestone = 0;
    maxHeight = 0;

    // Gerar estrelas estáticas (relativas à tela, se repetem)
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.floor(Math.random() * this.width),
        y: Math.floor(Math.random() * this.height),
        size: Math.random() < 0.5 ? 1 : 2
      });
    }

    // Câmera começa no chão
    cameraY = 0;

    // Gerar plataformas iniciais
    platforms = [];
    this._generateInitialPlatforms();

    // Doodler começa em cima da plataforma mais baixa
    var bottomPlat = platforms[platforms.length - 1];
    doodler = {
      x: bottomPlat.x + PLAT_W / 2 - DOODLER_W / 2,
      y: bottomPlat.y - DOODLER_H,
      vy: JUMP_VEL,
      facingRight: true
    };

    updateHUD();
    hideOverlay();
    this._registerKeys();
  };

  // ---------------------------------------------------------------
  // Geração de plataformas iniciais
  // ---------------------------------------------------------------
  DoodleJump.prototype._generateInitialPlatforms = function () {
    // Plataforma sólida no chão para o jogador começar
    platforms.push({
      x: this.width / 2 - PLAT_W / 2,
      y: this.height - 40,
      type: 'normal',
      broken: false,
      moveDir: 0,
      moveSpeed: 0
    });

    // Gerar plataformas subindo
    var curY = this.height - 40;
    for (var i = 1; i < NUM_PLATFORMS; i++) {
      var gap = MIN_GAP + Math.floor(Math.random() * (MAX_GAP - MIN_GAP));
      curY -= gap;
      platforms.push(createPlatform(curY, this.width, 0));
    }
  };

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  DoodleJump.prototype.update = function (dt) {
    if (gameOver) return;

    var w = this.width;
    var h = this.height;

    // --- Input horizontal ---
    var moveX = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) moveX = -1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) moveX = 1;

    doodler.x += moveX * MOVE_SPEED * dt;
    if (moveX > 0) doodler.facingRight = true;
    if (moveX < 0) doodler.facingRight = false;

    // Wrap horizontal
    if (doodler.x + DOODLER_W < 0) {
      doodler.x = w;
    } else if (doodler.x > w) {
      doodler.x = -DOODLER_W;
    }

    // --- Gravidade ---
    doodler.vy += GRAVITY * dt;
    doodler.y += doodler.vy * dt;

    // --- Colisão com plataformas (apenas caindo) ---
    if (doodler.vy > 0) {
      for (var i = 0; i < platforms.length; i++) {
        var p = platforms[i];
        if (p.broken) continue;

        // Checar se o doodler está sobre a plataforma
        var doodlerBottom = doodler.y + DOODLER_H;
        var doodlerRight  = doodler.x + DOODLER_W;

        // Colisão AABB: pés do doodler tocam a superfície da plataforma
        if (doodlerRight > p.x && doodler.x < p.x + PLAT_W &&
            doodlerBottom >= p.y && doodlerBottom <= p.y + PLAT_H + doodler.vy * dt) {

          if (p.type === 'breakable') {
            p.broken = true;
            SoundFX.brick();
          } else {
            // Pular!
            doodler.y = p.y - DOODLER_H;
            doodler.vy = JUMP_VEL;
            SoundFX.hit();
          }
        }
      }
    }

    // --- Mover plataformas móveis ---
    for (var j = 0; j < platforms.length; j++) {
      var pm = platforms[j];
      if (pm.type === 'moving' && !pm.broken) {
        pm.x += pm.moveDir * pm.moveSpeed * dt;
        if (pm.x <= 0) {
          pm.x = 0;
          pm.moveDir = 1;
        } else if (pm.x + PLAT_W >= w) {
          pm.x = w - PLAT_W;
          pm.moveDir = -1;
        }
      }
    }

    // --- Câmera: subir quando doodler passa do meio da tela ---
    var screenY = doodler.y - cameraY;
    if (screenY < h / 2) {
      cameraY = doodler.y - h / 2;
    }

    // --- Score baseado na altura ---
    var currentHeight = -doodler.y; // quanto mais alto, mais negativo é y → positivo aqui
    if (currentHeight > maxHeight) {
      var gained = Math.floor(currentHeight - maxHeight);
      score += gained;
      maxHeight = currentHeight;
      updateHUD();

      // Milestone de score
      var currentMilestone = Math.floor(score / SCORE_MILESTONE);
      if (currentMilestone > lastMilestone) {
        lastMilestone = currentMilestone;
        SoundFX.score();
      }
    }

    // --- Remover plataformas abaixo da tela e gerar novas no topo ---
    var bottomEdge = cameraY + h + 50;
    var topEdge    = cameraY - 50;

    // Remover plataformas que saíram pela parte de baixo
    for (var k = platforms.length - 1; k >= 0; k--) {
      if (platforms[k].y > bottomEdge) {
        platforms.splice(k, 1);
      }
    }

    // Encontrar a plataforma mais alta
    var highestY = Infinity;
    for (var m = 0; m < platforms.length; m++) {
      if (platforms[m].y < highestY) {
        highestY = platforms[m].y;
      }
    }

    // Gerar novas plataformas acima
    // A dificuldade aumenta: gap cresce com a altura
    var heightFactor = Math.min(maxHeight / 5000, 1); // 0→1 conforme sobe
    while (highestY > topEdge) {
      var minG = MIN_GAP + Math.floor(heightFactor * 10);
      var maxG = MAX_GAP + Math.floor(heightFactor * 20);
      var gap = minG + Math.floor(Math.random() * (maxG - minG));
      highestY -= gap;
      platforms.push(createPlatform(highestY, w, heightFactor));
    }

    // --- Game Over: doodler caiu abaixo da tela ---
    if (doodler.y - cameraY > h + 50) {
      this._triggerGameOver();
    }
  };

  // ---------------------------------------------------------------
  // render
  // ---------------------------------------------------------------
  DoodleJump.prototype.render = function () {
    var ctx = this.ctx;
    var w   = this.width;
    var h   = this.height;

    // Fundo
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    // Estrelas estáticas
    ctx.fillStyle = COLOR_STAR;
    for (var s = 0; s < stars.length; s++) {
      var star = stars[s];
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // Desenhar plataformas
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (p.broken) continue;

      var screenX = Math.floor(p.x);
      var screenY = Math.floor(p.y - cameraY);

      // Só desenhar se visível
      if (screenY < -PLAT_H || screenY > h + PLAT_H) continue;

      // Cor conforme tipo
      if (p.type === 'breakable') {
        ctx.fillStyle = COLOR_PLAT_BREAK;
      } else if (p.type === 'moving') {
        ctx.fillStyle = COLOR_PLAT_MOVE;
      } else {
        ctx.fillStyle = COLOR_PLAT;
      }

      // Plataforma principal
      ctx.fillRect(screenX, screenY, PLAT_W, PLAT_H);

      // Highlight 1px no topo (borda interna)
      ctx.fillStyle = COLOR_HIGHLIGHT;
      ctx.fillRect(screenX + 1, screenY, PLAT_W - 2, 1);
    }

    // Desenhar doodler
    var dx = Math.floor(doodler.x);
    var dy = Math.floor(doodler.y - cameraY);

    // Corpo principal
    ctx.fillStyle = COLOR_DOODLER;
    ctx.fillRect(dx, dy, DOODLER_W, DOODLER_H);

    // Pés pixel art: 2 quadradinhos de 6x4 na base
    ctx.fillStyle = COLOR_DOODLER;
    ctx.fillRect(dx + 2, dy + DOODLER_H, 6, 4);
    ctx.fillRect(dx + DOODLER_W - 8, dy + DOODLER_H, 6, 4);

    // Olhos: 2 quadrados brancos de 2x2
    ctx.fillStyle = '#ffffff';
    if (doodler.facingRight) {
      // Olhos à direita
      ctx.fillRect(dx + 14, dy + 6, 2, 2);
      ctx.fillRect(dx + 14, dy + 12, 2, 2);
    } else {
      // Olhos à esquerda
      ctx.fillRect(dx + 8, dy + 6, 2, 2);
      ctx.fillRect(dx + 8, dy + 12, 2, 2);
    }

    // Pupilas: 1x1 px preto
    ctx.fillStyle = '#000000';
    if (doodler.facingRight) {
      ctx.fillRect(dx + 15, dy + 7, 1, 1);
      ctx.fillRect(dx + 15, dy + 13, 1, 1);
    } else {
      ctx.fillRect(dx + 8, dy + 7, 1, 1);
      ctx.fillRect(dx + 8, dy + 13, 1, 1);
    }
  };

  // ---------------------------------------------------------------
  // Game Over
  // ---------------------------------------------------------------
  DoodleJump.prototype._triggerGameOver = function () {
    gameOver = true;
    SoundFX.gameOver();
    this.stop();
    showOverlay('GAME OVER', score);
  };

  // ---------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------
  DoodleJump.prototype._registerKeys = function () {
    if (this._boundKeydown) {
      window.removeEventListener('keydown', this._boundKeydown);
    }
    if (this._boundKeyup) {
      window.removeEventListener('keyup', this._boundKeyup);
    }

    var self = this;
    this._boundKeydown = function (e) {
      keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) {
        e.preventDefault();
      }
    };
    this._boundKeyup = function (e) {
      keys[e.key] = false;
    };
    window.addEventListener('keydown', this._boundKeydown);
    window.addEventListener('keyup', this._boundKeyup);
  };

  // ---------------------------------------------------------------
  // Funções auxiliares
  // ---------------------------------------------------------------

  /**
   * Cria uma plataforma em uma posição Y, com tipo aleatório
   * baseado na dificuldade (heightFactor 0-1).
   */
  function createPlatform(y, canvasWidth, heightFactor) {
    var x = Math.floor(Math.random() * (canvasWidth - PLAT_W));
    var type = 'normal';

    // Probabilidade de tipos especiais aumenta com a altura
    var rand = Math.random();
    var breakChance = 0.05 + heightFactor * 0.15;  // 5%→20%
    var moveChance  = 0.05 + heightFactor * 0.15;  // 5%→20%

    if (rand < breakChance) {
      type = 'breakable';
    } else if (rand < breakChance + moveChance) {
      type = 'moving';
    }

    var moveDir   = Math.random() < 0.5 ? -1 : 1;
    var moveSpeed = 60 + Math.floor(Math.random() * 80);

    return {
      x: x,
      y: y,
      type: type,
      broken: false,
      moveDir: moveDir,
      moveSpeed: moveSpeed
    };
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
    if (oTitle)  oTitle.textContent = title;
    if (oScore)  oScore.textContent = 'Score: ' + finalScore;
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
    var game   = new DoodleJump(canvas);
    game.start();

    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });

    window._game = game;
  });

}());
