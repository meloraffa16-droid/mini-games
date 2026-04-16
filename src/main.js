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
