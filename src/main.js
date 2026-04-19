/**
 * main.js — Registro de jogos e geração do menu principal.
 * JS puro, sem módulos.
 *
 * Para adicionar um novo jogo:
 *   1. Crie a pasta src/games/seu-jogo/ com index.html e game.js
 *   2. Adicione uma entrada no array GAMES abaixo.
 */
(function () {
  'use strict';

  var GAMES = [
    {
      id:    'game-a',
      title: 'Snake',
      desc:  'Guie a cobra para comer a comida sem bater nas paredes. Quanto mais come, maior fica!',
      icon:  '🐍',
      tag:   'canvas',
      url:   'src/games/game-a/index.html',
    },
    {
      id:    'game-b',
      title: 'Breakout',
      desc:  'Destrua todos os blocos com a bola e a raquete. Não deixe a bola cair!',
      icon:  '🧱',
      tag:   'canvas',
      url:   'src/games/game-b/index.html',
    },
    {
      id:    'game-c',
      title: 'Asteroids',
      desc:  'Pilote sua nave e destrua asteroides antes que te alcancem. Sobreviva o máximo possível!',
      icon:  '☄️',
      tag:   'canvas',
      url:   'src/games/game-c/index.html',
    },
    {
      id:    'game-d',
      title: 'Pong',
      desc:  'O clássico dos clássicos! Rebata a bola e vença a CPU em partidas épicas.',
      icon:  '🏓',
      tag:   'canvas',
      url:   'src/games/game-d/index.html',
    },
    {
      id:    'game-e',
      title: 'Space Invaders',
      desc:  'Defenda a Terra! Destrua as ondas de aliens antes que cheguem ao chão.',
      icon:  '👾',
      tag:   'canvas',
      url:   'src/games/game-e/index.html',
    },
    {
      id:    'game-f',
      title: 'Tetris',
      desc:  'Encaixe as peças e limpe linhas. Quanto mais rápido, maior o score!',
      icon:  '🧩',
      tag:   'canvas',
      url:   'src/games/game-f/index.html',
    },
    {
      id:    'game-g',
      title: 'Flappy Bird',
      desc:  'Toque para voar entre os canos! Parece fácil, mas um erro e acabou.',
      icon:  '🐦',
      tag:   'canvas',
      url:   'src/games/game-g/index.html',
    },
    {
      id:    'game-h',
      title: 'Frogger',
      desc:  'Atravesse estradas e rios sem ser atropelado. Cuidado com os carros!',
      icon:  '🐸',
      tag:   'canvas',
      url:   'src/games/game-h/index.html',
    },
    {
      id:    'game-i',
      title: 'Pac-Man',
      desc:  'Coma todos os dots e fuja dos fantasmas no labirinto clássico.',
      icon:  '👻',
      tag:   'canvas',
      url:   'src/games/game-i/index.html',
    },
    {
      id:    'game-j',
      title: 'Minesweeper',
      desc:  'O campo minado clássico do Windows! Revele células sem explodir.',
      icon:  '💣',
      tag:   'canvas',
      url:   'src/games/game-j/index.html',
    },
    {
      id:    'game-k',
      title: 'Tron',
      desc:  'Pilote sua moto de luz e force a CPU a bater no seu rastro!',
      icon:  '🏍️',
      tag:   'canvas',
      url:   'src/games/game-k/index.html',
    },
    {
      id:    'game-l',
      title: 'Doodle Jump',
      desc:  'Pule de plataforma em plataforma e suba o mais alto possível!',
      icon:  '🦘',
      tag:   'canvas',
      url:   'src/games/game-l/index.html',
    },
  ];

  function createCard(game) {
    var a = document.createElement('a');
    a.className = 'game-card';
    a.href = game.url;
    a.setAttribute('data-game-id', game.id);
    a.innerHTML =
      '<span class="game-card__icon">' + game.icon + '</span>' +
      '<span class="game-card__title">' + game.title + '</span>' +
      '<span class="game-card__desc">'  + game.desc  + '</span>' +
      '<span class="game-card__tag">'   + game.tag   + '</span>';
    return a;
  }

  function renderMenu() {
    var grid = document.getElementById('games-grid');
    if (!grid) return;
    GAMES.forEach(function (game) {
      grid.appendChild(createCard(game));
    });
  }

  document.addEventListener('DOMContentLoaded', renderMenu);

}());
