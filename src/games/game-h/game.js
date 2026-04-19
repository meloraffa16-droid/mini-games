(function () {
  'use strict';

  // --- Constantes ---
  var CELL       = 40;       // tamanho de cada celula em px
  var COLS       = 20;       // 800 / 40
  var ROWS       = 12;       // 480 / 40 (usamos 480 de 500, margem no topo)
  var FROG_SIZE  = 30;       // tamanho do sapo em px
  var OFFSET_Y   = 20;       // margem superior para centralizar no canvas de 500

  var SCORE_STEP    = 10;    // pontos por passo para frente
  var SCORE_GOAL    = 100;   // pontos ao chegar no topo
  var START_LIVES   = 3;

  var MOVE_COOLDOWN = 0.12;  // segundos entre movimentos do sapo

  // --- Paleta 8-bit ---
  var COLOR_BG        = '#0a0a1a';
  var COLOR_SAFE      = '#1a1a3a';
  var COLOR_ROAD      = '#1a1a2a';
  var COLOR_WATER     = '#0a1a3a';
  var COLOR_GOAL      = '#1a1a3a';
  var COLOR_FROG      = '#39ff14';
  var COLOR_LOG       = '#8B4513';
  var COLOR_LOG_TEX   = '#6B3410';
  var COLOR_TURTLE    = '#39ff14';
  var COLOR_TURTLE_DK = '#20aa0a';
  var COLOR_ROAD_LINE = 'rgba(255,255,255,0.08)';

  var CAR_COLORS = ['#ff2d6f', '#ffff00', '#00fff0', '#ff8800', '#ff44ff'];

  // --- Layout das faixas (de cima para baixo, row 0..11) ---
  // row 0: zona de chegada (goal slots)
  // row 1-4: rio (water + logs/turtles)
  // row 5: calcada segura
  // row 6-9: estrada (road + cars/trucks)
  // row 10: zona segura inferior
  // row 11: zona de partida do sapo

  var ROW_TYPE = [];
  ROW_TYPE[0]  = 'goal';
  ROW_TYPE[1]  = 'water';
  ROW_TYPE[2]  = 'water';
  ROW_TYPE[3]  = 'water';
  ROW_TYPE[4]  = 'water';
  ROW_TYPE[5]  = 'safe';
  ROW_TYPE[6]  = 'road';
  ROW_TYPE[7]  = 'road';
  ROW_TYPE[8]  = 'road';
  ROW_TYPE[9]  = 'road';
  ROW_TYPE[10] = 'safe';
  ROW_TYPE[11] = 'safe';

  // --- Estado do jogo ---
  var frogX       = 0;
  var frogY       = 0;
  var highestRow  = 0;     // row mais alta alcancada nesta vida
  var score       = 0;
  var lives       = 0;
  var level       = 1;
  var gameOver    = false;
  var moveCooldown = 0;
  var dying       = false;
  var deathTimer  = 0;
  var DEATH_ANIM  = 0.5;

  // Slots de chegada (5 posicoes no topo)
  var goalSlots    = [];
  var GOAL_POSITIONS = [1, 5, 9, 13, 17]; // colunas dos 5 slots

  // Lanes: objetos em movimento
  var lanes = [];

  // --- Construtor ---
  function Frogger(canvas) {
    GameBase.call(this, canvas);
    this._boundKeydown = null;
  }
  GameBase.extend(Frogger);

  // ---------------------------------------------------------------
  // init
  // ---------------------------------------------------------------
  Frogger.prototype.init = function () {
    frogX       = Math.floor(COLS / 2);
    frogY       = ROWS - 1;
    highestRow  = ROWS - 1;
    score       = 0;
    lives       = START_LIVES;
    level       = 1;
    gameOver    = false;
    moveCooldown = 0;
    dying       = false;
    deathTimer  = 0;

    goalSlots = [];
    for (var i = 0; i < GOAL_POSITIONS.length; i++) {
      goalSlots.push(false);
    }

    initLanes();
    updateHUD();
    hideOverlay();
    this._registerKeys();
  };

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  Frogger.prototype.update = function (dt) {
    if (gameOver) return;

    // Animacao de morte
    if (dying) {
      deathTimer -= dt;
      if (deathTimer <= 0) {
        dying = false;
        if (lives <= 0) {
          this._triggerGameOver();
        } else {
          resetFrog();
        }
      }
      return;
    }

    // Cooldown de movimento
    if (moveCooldown > 0) {
      moveCooldown -= dt;
    }

    // Atualizar lanes
    var speedMult = 1 + (level - 1) * 0.2;
    for (var i = 0; i < lanes.length; i++) {
      var lane = lanes[i];
      for (var j = 0; j < lane.objects.length; j++) {
        var obj = lane.objects[j];
        obj.x += lane.speed * speedMult * dt;

        // Wrap around
        if (lane.speed > 0 && obj.x > COLS * CELL + obj.w) {
          obj.x = -obj.w;
        } else if (lane.speed < 0 && obj.x + obj.w < -obj.w) {
          obj.x = COLS * CELL + obj.w;
        }
      }
    }

    // Sapo em cima de tronco/tartaruga? Mover junto
    if (ROW_TYPE[frogY] === 'water') {
      var onPlatform = false;
      var laneIdx = frogY - 1; // water rows sao 1-4, lanes de water sao indices 0-3
      if (laneIdx >= 0 && laneIdx < lanes.length && lanes[laneIdx].type === 'water') {
        var wLane = lanes[laneIdx];
        var fPx = frogX * CELL;
        var fPy = frogY * CELL + OFFSET_Y;
        for (var k = 0; k < wLane.objects.length; k++) {
          var plat = wLane.objects[k];
          var platY = wLane.row * CELL + OFFSET_Y;
          if (fPx + CELL > plat.x && fPx < plat.x + plat.w &&
              fPy === platY) {
            onPlatform = true;
            // Mover o sapo junto com a plataforma
            var moveAmt = wLane.speed * speedMult * dt;
            frogX += moveAmt / CELL;

            // Sapo saiu da tela?
            if (frogX < -1 || frogX >= COLS + 1) {
              this._die();
              return;
            }
            break;
          }
        }
        if (!onPlatform) {
          // Caiu na agua!
          this._die();
          return;
        }
      }
    }

    // Checar colisao com carros (estrada)
    if (ROW_TYPE[frogY] === 'road') {
      var rLaneIdx = frogY - 1; // ajuste para indice de lanes
      for (var li = 0; li < lanes.length; li++) {
        if (lanes[li].row === frogY && lanes[li].type === 'road') {
          var rLane = lanes[li];
          var fCx = Math.floor(frogX) * CELL + 5;
          var fCy = frogY * CELL + OFFSET_Y + 5;
          var fCw = FROG_SIZE;
          var fCh = FROG_SIZE;
          for (var ci = 0; ci < rLane.objects.length; ci++) {
            var car = rLane.objects[ci];
            var carY = rLane.row * CELL + OFFSET_Y;
            if (fCx + fCw > car.x + 4 && fCx < car.x + car.w - 4 &&
                fCy + fCh > carY + 4 && fCy < carY + CELL - 4) {
              this._die();
              return;
            }
          }
        }
      }
    }

    // Checar se chegou na zona de goal
    if (frogY === 0) {
      var landed = false;
      var roundedX = Math.round(frogX);
      for (var gi = 0; gi < GOAL_POSITIONS.length; gi++) {
        if (!goalSlots[gi] && Math.abs(roundedX - GOAL_POSITIONS[gi]) <= 1) {
          goalSlots[gi] = true;
          score += SCORE_GOAL;
          SoundFX.score();
          landed = true;

          // Checar se todos os slots preenchidos
          var allFilled = true;
          for (var si = 0; si < goalSlots.length; si++) {
            if (!goalSlots[si]) { allFilled = false; break; }
          }

          if (allFilled) {
            // Proximo nivel
            level++;
            SoundFX.newWave();
            for (var ri = 0; ri < goalSlots.length; ri++) {
              goalSlots[ri] = false;
            }
            initLanes();
          }

          resetFrog();
          updateHUD();
          break;
        }
      }
      if (!landed) {
        // Nao pousou num slot valido
        this._die();
        return;
      }
    }
  };

  // ---------------------------------------------------------------
  // render
  // ---------------------------------------------------------------
  Frogger.prototype.render = function () {
    this.clear(COLOR_BG);
    var ctx = this.ctx;

    // Desenhar faixas de fundo
    for (var r = 0; r < ROWS; r++) {
      var ry = r * CELL + OFFSET_Y;
      var type = ROW_TYPE[r];

      if (type === 'goal') {
        ctx.fillStyle = COLOR_GOAL;
        ctx.fillRect(0, ry, COLS * CELL, CELL);
        // Desenhar slots de chegada
        for (var gs = 0; gs < GOAL_POSITIONS.length; gs++) {
          var gx = Math.floor(GOAL_POSITIONS[gs] * CELL);
          if (goalSlots[gs]) {
            // Slot preenchido: sapo pequeno
            ctx.fillStyle = COLOR_FROG;
            ctx.fillRect(gx + 8, ry + 8, 24, 24);
            // Olhos
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(gx + 12, ry + 12, 2, 2);
            ctx.fillRect(gx + 22, ry + 12, 2, 2);
          } else {
            // Slot vazio: contorno pontilhado
            ctx.fillStyle = 'rgba(57,255,20,0.15)';
            ctx.fillRect(gx + 4, ry + 4, 32, 32);
            ctx.fillStyle = 'rgba(57,255,20,0.3)';
            ctx.fillRect(gx + 4, ry + 4, 32, 2);
            ctx.fillRect(gx + 4, ry + 4, 2, 32);
            ctx.fillRect(gx + 34, ry + 4, 2, 32);
            ctx.fillRect(gx + 4, ry + 34, 32, 2);
          }
        }
      } else if (type === 'water') {
        ctx.fillStyle = COLOR_WATER;
        ctx.fillRect(0, ry, COLS * CELL, CELL);
        // Linhas de onda sutis
        ctx.fillStyle = 'rgba(0,100,200,0.08)';
        for (var wx = 0; wx < COLS * CELL; wx += 16) {
          ctx.fillRect(Math.floor(wx), ry + 18, 8, 2);
        }
      } else if (type === 'road') {
        ctx.fillStyle = COLOR_ROAD;
        ctx.fillRect(0, ry, COLS * CELL, CELL);
        // Linha tracejada central
        ctx.fillStyle = COLOR_ROAD_LINE;
        for (var dx = 0; dx < COLS * CELL; dx += 30) {
          ctx.fillRect(Math.floor(dx), ry + 19, 14, 2);
        }
      } else {
        // safe zones
        ctx.fillStyle = COLOR_SAFE;
        ctx.fillRect(0, ry, COLS * CELL, CELL);
        // Textura de calcada
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (var sx = 0; sx < COLS * CELL; sx += 20) {
          ctx.fillRect(Math.floor(sx), ry, 1, CELL);
        }
      }
    }

    // Desenhar objetos das lanes
    for (var li = 0; li < lanes.length; li++) {
      var lane = lanes[li];
      var laneY = lane.row * CELL + OFFSET_Y;

      for (var oi = 0; oi < lane.objects.length; oi++) {
        var obj = lane.objects[oi];
        var ox = Math.floor(obj.x);

        if (lane.type === 'water') {
          if (obj.kind === 'log') {
            drawLog(ctx, ox, laneY, obj.w);
          } else {
            drawTurtle(ctx, ox, laneY, obj.w);
          }
        } else {
          drawCar(ctx, ox, laneY, obj.w, obj.color, lane.speed < 0);
        }
      }
    }

    // Desenhar vidas
    drawLives(ctx);

    // Desenhar nivel
    drawLevel(ctx);

    // Desenhar sapo
    if (dying) {
      // Animacao de morte: piscando
      var blink = Math.floor(deathTimer * 10) % 2;
      if (blink) {
        drawFrog(ctx, Math.floor(frogX) * CELL, frogY * CELL + OFFSET_Y);
      }
      // X vermelho no lugar
      ctx.fillStyle = '#ff2d6f';
      var deadX = Math.floor(frogX) * CELL + 10;
      var deadY = frogY * CELL + OFFSET_Y + 10;
      ctx.fillRect(deadX, deadY, 4, 20);
      ctx.fillRect(deadX + 16, deadY, 4, 20);
      ctx.fillRect(deadX + 4, deadY + 4, 4, 4);
      ctx.fillRect(deadX + 12, deadY + 4, 4, 4);
      ctx.fillRect(deadX + 8, deadY + 8, 4, 4);
      ctx.fillRect(deadX + 4, deadY + 12, 4, 4);
      ctx.fillRect(deadX + 12, deadY + 12, 4, 4);
    } else if (!gameOver) {
      drawFrog(ctx, Math.floor(frogX) * CELL, frogY * CELL + OFFSET_Y);
    }
  };

  // ---------------------------------------------------------------
  // Funcoes de desenho — 8-bit pixel art (fillRect only)
  // ---------------------------------------------------------------

  function drawFrog(ctx, x, y) {
    var fx = Math.floor(x + 5);
    var fy = Math.floor(y + 5);

    // Corpo principal
    ctx.fillStyle = COLOR_FROG;
    ctx.fillRect(fx, fy, FROG_SIZE, FROG_SIZE);

    // Borda escura (detalhe pixel)
    ctx.fillStyle = '#20aa0a';
    ctx.fillRect(fx, fy, FROG_SIZE, 2);
    ctx.fillRect(fx, fy, 2, FROG_SIZE);
    ctx.fillRect(fx + FROG_SIZE - 2, fy, 2, FROG_SIZE);
    ctx.fillRect(fx, fy + FROG_SIZE - 2, FROG_SIZE, 2);

    // Olhos brancos 2x2
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx + 8, fy + 6, 4, 4);
    ctx.fillRect(fx + 18, fy + 6, 4, 4);

    // Pupilas pretas 2x2
    ctx.fillStyle = '#000000';
    ctx.fillRect(fx + 10, fy + 8, 2, 2);
    ctx.fillRect(fx + 20, fy + 8, 2, 2);

    // Patas (retangulos pequenos)
    ctx.fillStyle = COLOR_FROG;
    ctx.fillRect(fx - 4, fy + 4, 4, 6);
    ctx.fillRect(fx + FROG_SIZE, fy + 4, 4, 6);
    ctx.fillRect(fx - 4, fy + 20, 4, 6);
    ctx.fillRect(fx + FROG_SIZE, fy + 20, 4, 6);
  }

  function drawLog(ctx, x, y, w) {
    var lx = Math.floor(x);
    var ly = Math.floor(y + 4);
    var lh = CELL - 8;

    // Corpo do tronco
    ctx.fillStyle = COLOR_LOG;
    ctx.fillRect(lx, ly, Math.floor(w), lh);

    // Textura horizontal
    ctx.fillStyle = COLOR_LOG_TEX;
    ctx.fillRect(lx, ly + 6, Math.floor(w), 2);
    ctx.fillRect(lx, ly + 14, Math.floor(w), 2);
    ctx.fillRect(lx, ly + 22, Math.floor(w), 2);

    // Bordas (topo e base)
    ctx.fillStyle = '#5a2a08';
    ctx.fillRect(lx, ly, Math.floor(w), 2);
    ctx.fillRect(lx, ly + lh - 2, Math.floor(w), 2);

    // Nohs no tronco (detalhes pixel)
    ctx.fillStyle = '#5a2a08';
    for (var nx = lx + 20; nx < lx + w - 10; nx += 40) {
      ctx.fillRect(Math.floor(nx), ly + 10, 4, 4);
    }
  }

  function drawTurtle(ctx, x, y, w) {
    var numTurtles = Math.floor(w / CELL);
    for (var t = 0; t < numTurtles; t++) {
      var tx = Math.floor(x + t * CELL + 4);
      var ty = Math.floor(y + 6);
      var ts = CELL - 8;

      // Casco
      ctx.fillStyle = COLOR_TURTLE;
      ctx.fillRect(tx, ty, ts, ts - 4);

      // Padrao do casco
      ctx.fillStyle = COLOR_TURTLE_DK;
      ctx.fillRect(tx + 4, ty + 4, ts - 8, 2);
      ctx.fillRect(tx + 4, ty + 12, ts - 8, 2);
      ctx.fillRect(tx + Math.floor(ts / 2) - 1, ty + 2, 2, ts - 8);

      // Cabeca
      ctx.fillStyle = COLOR_TURTLE;
      ctx.fillRect(tx + Math.floor(ts / 2) - 4, ty - 4, 8, 6);

      // Olho
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tx + Math.floor(ts / 2), ty - 2, 2, 2);
    }
  }

  function drawCar(ctx, x, y, w, color, facingLeft) {
    var cx = Math.floor(x);
    var cy = Math.floor(y + 6);
    var ch = CELL - 12;
    var cw = Math.floor(w);

    // Corpo do carro
    ctx.fillStyle = color;
    ctx.fillRect(cx, cy, cw, ch);

    // Teto (mais escuro, centralizado)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    var roofX = facingLeft ? cx + 8 : cx + Math.floor(cw * 0.3);
    var roofW = Math.floor(cw * 0.4);
    ctx.fillRect(roofX, cy + 2, roofW, ch - 4);

    // Janelas (2x2 px claras)
    ctx.fillStyle = 'rgba(200,230,255,0.7)';
    if (facingLeft) {
      ctx.fillRect(cx + 10, cy + 4, 4, 4);
      ctx.fillRect(cx + 10, cy + ch - 8, 4, 4);
      ctx.fillRect(cx + 18, cy + 4, 4, 4);
      ctx.fillRect(cx + 18, cy + ch - 8, 4, 4);
    } else {
      ctx.fillRect(cx + cw - 14, cy + 4, 4, 4);
      ctx.fillRect(cx + cw - 14, cy + ch - 8, 4, 4);
      ctx.fillRect(cx + cw - 22, cy + 4, 4, 4);
      ctx.fillRect(cx + cw - 22, cy + ch - 8, 4, 4);
    }

    // Farois
    ctx.fillStyle = '#ffff88';
    if (facingLeft) {
      ctx.fillRect(cx, cy + 4, 4, 4);
      ctx.fillRect(cx, cy + ch - 8, 4, 4);
    } else {
      ctx.fillRect(cx + cw - 4, cy + 4, 4, 4);
      ctx.fillRect(cx + cw - 4, cy + ch - 8, 4, 4);
    }

    // Lanternas traseiras
    ctx.fillStyle = '#ff0000';
    if (facingLeft) {
      ctx.fillRect(cx + cw - 4, cy + 4, 4, 4);
      ctx.fillRect(cx + cw - 4, cy + ch - 8, 4, 4);
    } else {
      ctx.fillRect(cx, cy + 4, 4, 4);
      ctx.fillRect(cx, cy + ch - 8, 4, 4);
    }

    // Rodas
    ctx.fillStyle = '#111111';
    ctx.fillRect(cx + 4, cy - 2, 8, 4);
    ctx.fillRect(cx + cw - 12, cy - 2, 8, 4);
    ctx.fillRect(cx + 4, cy + ch - 2, 8, 4);
    ctx.fillRect(cx + cw - 12, cy + ch - 2, 8, 4);
  }

  function drawLives(ctx) {
    var lx = 10;
    var ly = 6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lx, ly, 2, 2); // Ponto decorativo

    for (var i = 0; i < lives; i++) {
      var hx = lx + 8 + i * 18;
      // Mini sapo como icone de vida
      ctx.fillStyle = COLOR_FROG;
      ctx.fillRect(Math.floor(hx), Math.floor(ly), 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.floor(hx + 2), Math.floor(ly + 2), 2, 2);
      ctx.fillRect(Math.floor(hx + 8), Math.floor(ly + 2), 2, 2);
    }
  }

  function drawLevel(ctx) {
    // Nivel indicado por quadrados no canto superior direito
    var rx = COLS * CELL - 10;
    var ry = 6;
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < level && i < 10; i++) {
      ctx.fillRect(Math.floor(rx - i * 10), Math.floor(ry), 6, 6);
    }
    // Texto "LV" pixel-style
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(Math.floor(rx - level * 10 - 20), ry, 2, 6);
    ctx.fillRect(Math.floor(rx - level * 10 - 20), ry + 4, 6, 2);
    ctx.fillRect(Math.floor(rx - level * 10 - 10), ry, 2, 6);
    ctx.fillRect(Math.floor(rx - level * 10 - 8), ry + 6, 2, -6);
    ctx.fillRect(Math.floor(rx - level * 10 - 6), ry, 2, 6);
  }

  // ---------------------------------------------------------------
  // Inicializar lanes
  // ---------------------------------------------------------------
  function initLanes() {
    lanes = [];

    // Water lanes (rows 1-4)
    // Row 1: troncos indo para direita
    lanes.push(createLane(1, 'water', 60, [
      { kind: 'log', x: 0, w: 120 },
      { kind: 'log', x: 240, w: 120 },
      { kind: 'log', x: 480, w: 120 },
      { kind: 'log', x: 680, w: 120 }
    ]));

    // Row 2: tartarugas indo para esquerda
    lanes.push(createLane(2, 'water', -50, [
      { kind: 'turtle', x: 0, w: 120 },
      { kind: 'turtle', x: 200, w: 80 },
      { kind: 'turtle', x: 400, w: 120 },
      { kind: 'turtle', x: 600, w: 80 }
    ]));

    // Row 3: troncos longos indo para direita
    lanes.push(createLane(3, 'water', 40, [
      { kind: 'log', x: 0, w: 200 },
      { kind: 'log', x: 350, w: 200 },
      { kind: 'log', x: 650, w: 160 }
    ]));

    // Row 4: tartarugas indo para esquerda
    lanes.push(createLane(4, 'water', -70, [
      { kind: 'turtle', x: 0, w: 80 },
      { kind: 'turtle', x: 180, w: 120 },
      { kind: 'turtle', x: 380, w: 80 },
      { kind: 'turtle', x: 560, w: 120 },
      { kind: 'turtle', x: 720, w: 80 }
    ]));

    // Road lanes (rows 6-9)
    // Row 6: carros indo para esquerda
    lanes.push(createLane(6, 'road', -80, [
      { kind: 'car', x: 0, w: 60, color: CAR_COLORS[0] },
      { kind: 'car', x: 200, w: 60, color: CAR_COLORS[0] },
      { kind: 'car', x: 450, w: 60, color: CAR_COLORS[0] },
      { kind: 'car', x: 650, w: 60, color: CAR_COLORS[0] }
    ]));

    // Row 7: caminhoes indo para direita
    lanes.push(createLane(7, 'road', 55, [
      { kind: 'truck', x: 0, w: 100, color: CAR_COLORS[1] },
      { kind: 'truck', x: 300, w: 100, color: CAR_COLORS[1] },
      { kind: 'truck', x: 600, w: 100, color: CAR_COLORS[1] }
    ]));

    // Row 8: carros rapidos indo para esquerda
    lanes.push(createLane(8, 'road', -100, [
      { kind: 'car', x: 0, w: 50, color: CAR_COLORS[2] },
      { kind: 'car', x: 250, w: 50, color: CAR_COLORS[2] },
      { kind: 'car', x: 500, w: 50, color: CAR_COLORS[2] }
    ]));

    // Row 9: caminhoes indo para direita
    lanes.push(createLane(9, 'road', 65, [
      { kind: 'truck', x: 0, w: 90, color: CAR_COLORS[3] },
      { kind: 'truck', x: 220, w: 90, color: CAR_COLORS[4] },
      { kind: 'truck', x: 440, w: 90, color: CAR_COLORS[3] },
      { kind: 'truck', x: 660, w: 90, color: CAR_COLORS[4] }
    ]));
  }

  function createLane(row, type, speed, objects) {
    return {
      row: row,
      type: type,
      speed: speed,
      objects: objects
    };
  }

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  function resetFrog() {
    frogX = Math.floor(COLS / 2);
    frogY = ROWS - 1;
    highestRow = ROWS - 1;
  }

  Frogger.prototype._die = function () {
    if (dying) return;
    lives--;
    dying = true;
    deathTimer = DEATH_ANIM;
    SoundFX.loseLife();
    updateHUD();
  };

  Frogger.prototype._triggerGameOver = function () {
    gameOver = true;
    SoundFX.gameOver();
    this.stop();
    showOverlay('GAME OVER', score);
  };

  Frogger.prototype._registerKeys = function () {
    if (this._boundKeydown) {
      window.removeEventListener('keydown', this._boundKeydown);
    }
    var self = this;
    this._boundKeydown = function (e) {
      self._handleKey(e);
    };
    window.addEventListener('keydown', this._boundKeydown);
  };

  Frogger.prototype._handleKey = function (e) {
    if (gameOver || dying) return;
    if (moveCooldown > 0) return;

    var moved = false;
    var prevY = frogY;

    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W':
        if (frogY > 0) { frogY--; moved = true; }
        break;
      case 'ArrowDown':  case 's': case 'S':
        if (frogY < ROWS - 1) { frogY++; moved = true; }
        break;
      case 'ArrowLeft':  case 'a': case 'A':
        if (frogX > 0) { frogX--; moved = true; }
        break;
      case 'ArrowRight': case 'd': case 'D':
        if (frogX < COLS - 1) { frogX++; moved = true; }
        break;
    }

    if (moved) {
      SoundFX.move();
      moveCooldown = MOVE_COOLDOWN;

      // Score por andar para frente
      if (frogY < highestRow) {
        score += SCORE_STEP * (highestRow - frogY);
        highestRow = frogY;
        updateHUD();
      }
    }

    // Evita scroll pelas setas
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) {
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
    if (oScore)  oScore.textContent  = 'Pontuacao: ' + finalScore;
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
    var game   = new Frogger(canvas);
    game.start();

    document.getElementById('btn-restart').addEventListener('click', function () {
      game.start();
    });

    window._game = game;
  });

}());
