(function (global) {
  'use strict';

  var CHANGELOG = [
    {
      version: '2.0.0',
      date: '2026-04-16',
      items: [
        { emoji: '🏓', text: 'Pong — o classico dos classicos, jogador vs CPU' },
        { emoji: '👾', text: 'Space Invaders — defenda a Terra contra ondas de aliens' },
        { emoji: '🧩', text: 'Tetris — encaixe pecas e limpe linhas' },
        { emoji: '🎮', text: 'Design system 8-BIT com pixel art' },
        { emoji: '🔄', text: 'Todos os jogos convertidos para visual 8-bit' },
      ]
    },
    {
      version: '1.0.0',
      date: '2026-04-15',
      items: [
        { emoji: '🐍', text: 'Snake — cobra classica com controles por teclado' },
        { emoji: '🧱', text: 'Breakout — destrua blocos com bola e raquete' },
        { emoji: '☄️', text: 'Asteroids — pilote sua nave e destrua asteroides' },
        { emoji: '🎮', text: 'Design system 8-bit com pixel art' },
        { emoji: '⚙️', text: 'Motor base (GameBase) com game loop e delta time' },
      ]
    }
  ];

  var FONT = "'Press Start 2P', monospace";
  var _modal = null;

  function buildModal() {
    var overlay = document.createElement('div');
    overlay.id = 'changelog-overlay';
    overlay.style.cssText = [
      'position: fixed',
      'inset: 0',
      'z-index: 9999',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'background: rgba(10, 10, 26, 0.92)',
    ].join(';');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeChangelog();
    });

    var panel = document.createElement('div');
    panel.style.cssText = [
      'position: relative',
      'background: #12122a',
      'border: 3px solid #4a3aff',
      'box-shadow: 6px 6px 0px #000',
      'padding: 28px 28px 24px',
      'max-width: 440px',
      'width: calc(100% - 40px)',
      'max-height: 80vh',
      'overflow-y: auto',
    ].join(';');

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.style.cssText = [
      'position: absolute',
      'top: 10px',
      'right: 12px',
      'background: none',
      'border: none',
      'color: #6a6a9a',
      'font-size: 12px',
      'font-family: ' + FONT,
      'cursor: pointer',
      'padding: 4px',
    ].join(';');
    closeBtn.addEventListener('mouseenter', function () {
      closeBtn.style.color = '#ff2d6f';
    });
    closeBtn.addEventListener('mouseleave', function () {
      closeBtn.style.color = '#6a6a9a';
    });
    closeBtn.addEventListener('click', closeChangelog);

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 20px;';

    var title = document.createElement('h2');
    title.textContent = 'WHAT\'S NEW';
    title.style.cssText = [
      'margin: 0 0 4px',
      'font-size: 12px',
      'font-weight: 400',
      'color: #00fff0',
      'font-family: ' + FONT,
      'text-transform: uppercase',
      'text-shadow: 2px 2px 0px rgba(0,0,0,0.6)',
    ].join(';');

    header.appendChild(title);

    // Entries
    CHANGELOG.forEach(function (entry) {
      var versionTag = document.createElement('span');
      versionTag.textContent = 'v' + entry.version;
      versionTag.style.cssText = [
        'display: inline-block',
        'margin-bottom: 14px',
        'font-size: 8px',
        'font-family: ' + FONT,
        'color: #39ff14',
        'background: rgba(57, 255, 20, 0.1)',
        'border: 2px solid #39ff14',
        'padding: 3px 8px',
      ].join(';');

      var dateLabel = document.createElement('span');
      dateLabel.textContent = ' ' + entry.date;
      dateLabel.style.cssText = [
        'font-size: 7px',
        'color: #6a6a9a',
        'font-family: ' + FONT,
        'margin-left: 8px',
      ].join(';');

      var metaRow = document.createElement('div');
      metaRow.style.cssText = 'display: flex; align-items: center; margin-bottom: 14px;';
      metaRow.appendChild(versionTag);
      metaRow.appendChild(dateLabel);

      var list = document.createElement('ul');
      list.style.cssText = [
        'list-style: none',
        'margin: 0',
        'padding: 0',
        'display: flex',
        'flex-direction: column',
        'gap: 6px',
      ].join(';');

      entry.items.forEach(function (item) {
        var li = document.createElement('li');
        li.style.cssText = [
          'display: flex',
          'align-items: flex-start',
          'gap: 10px',
          'color: #e8e8ff',
          'font-size: 7px',
          'font-family: ' + FONT,
          'line-height: 1.8',
          'background: rgba(74, 58, 255, 0.08)',
          'border: 2px solid rgba(74, 58, 255, 0.2)',
          'padding: 8px 12px',
        ].join(';');

        var emojiSpan = document.createElement('span');
        emojiSpan.textContent = item.emoji;
        emojiSpan.setAttribute('aria-hidden', 'true');
        emojiSpan.style.cssText = 'flex-shrink: 0; font-size: 14px; line-height: 1.4;';

        var textSpan = document.createElement('span');
        textSpan.textContent = item.text;

        li.appendChild(emojiSpan);
        li.appendChild(textSpan);
        list.appendChild(li);
      });

      var section = document.createElement('div');
      section.appendChild(metaRow);
      section.appendChild(list);

      panel.appendChild(closeBtn);
      panel.appendChild(header);
      panel.appendChild(section);
    });

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Keyboard close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeChangelog();
    });

    return { overlay: overlay, panel: panel };
  }

  function openChangelog() {
    if (!_modal) {
      _modal = buildModal();
    }
    _modal.overlay.style.display = 'flex';
  }

  function closeChangelog() {
    if (!_modal) return;
    _modal.overlay.style.display = 'none';
  }

  global.openChangelog = openChangelog;
  global.closeChangelog = closeChangelog;

}(window));
