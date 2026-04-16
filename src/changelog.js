(function (global) {
  'use strict';

  var CHANGELOG = [
    {
      version: '1.0.0',
      date: '2026-04-15',
      items: [
        { emoji: '🐍', text: 'Snake — cobra clássica com controles por teclado' },
        { emoji: '🧱', text: 'Breakout — destrua blocos com bola e raquete' },
        { emoji: '☄️', text: 'Asteroids — pilote sua nave e destrua asteroides' },
        { emoji: '🎨', text: 'Design system completo com tema dark' },
        { emoji: '⚙️', text: 'Motor base (GameBase) com game loop e delta time' },
      ]
    }
  ];

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
      'background: rgba(13, 13, 26, 0.82)',
      'backdrop-filter: blur(6px)',
      '-webkit-backdrop-filter: blur(6px)',
      'opacity: 0',
      'transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    ].join(';');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeChangelog();
    });

    var panel = document.createElement('div');
    panel.style.cssText = [
      'position: relative',
      'background: #14142b',
      'border: 1px solid rgba(108, 99, 255, 0.18)',
      'border-radius: 22px',
      'box-shadow: 0 4px 32px rgba(0,0,0,0.45), 0 0 24px rgba(108,99,255,0.35)',
      'padding: 36px 40px 32px',
      'max-width: 480px',
      'width: calc(100% - 48px)',
      'max-height: 80vh',
      'overflow-y: auto',
      'transform: translateY(16px)',
      'transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    ].join(';');

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.style.cssText = [
      'position: absolute',
      'top: 16px',
      'right: 20px',
      'background: none',
      'border: none',
      'color: #7a7a9d',
      'font-size: 28px',
      'line-height: 1',
      'cursor: pointer',
      'padding: 0 4px',
      'transition: color 0.2s',
    ].join(';');
    closeBtn.addEventListener('mouseenter', function () {
      closeBtn.style.color = '#e0e0f0';
    });
    closeBtn.addEventListener('mouseleave', function () {
      closeBtn.style.color = '#7a7a9d';
    });
    closeBtn.addEventListener('click', closeChangelog);

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 24px;';

    var title = document.createElement('h2');
    title.textContent = 'O que há de novo';
    title.style.cssText = [
      'margin: 0 0 4px',
      'font-size: 22px',
      'font-weight: 700',
      'color: #e0e0f0',
      "font-family: 'Segoe UI', system-ui, -apple-system, sans-serif",
      'letter-spacing: -0.3px',
    ].join(';');

    header.appendChild(title);

    // Entries
    CHANGELOG.forEach(function (entry) {
      var versionTag = document.createElement('span');
      versionTag.textContent = 'v' + entry.version;
      versionTag.style.cssText = [
        'display: inline-block',
        'margin-bottom: 16px',
        'font-size: 12px',
        "font-family: 'Cascadia Code', 'Fira Code', monospace",
        'color: #6c63ff',
        'background: rgba(108, 99, 255, 0.15)',
        'border: 1px solid rgba(108, 99, 255, 0.18)',
        'border-radius: 999px',
        'padding: 2px 10px',
      ].join(';');

      var dateLabel = document.createElement('span');
      dateLabel.textContent = ' · ' + entry.date;
      dateLabel.style.cssText = [
        'font-size: 12px',
        'color: #7a7a9d',
        "font-family: 'Cascadia Code', 'Fira Code', monospace",
        'margin-left: 6px',
      ].join(';');

      var metaRow = document.createElement('div');
      metaRow.style.cssText = 'display: flex; align-items: center; margin-bottom: 16px;';
      metaRow.appendChild(versionTag);
      metaRow.appendChild(dateLabel);

      var list = document.createElement('ul');
      list.style.cssText = [
        'list-style: none',
        'margin: 0',
        'padding: 0',
        'display: flex',
        'flex-direction: column',
        'gap: 10px',
      ].join(';');

      entry.items.forEach(function (item) {
        var li = document.createElement('li');
        li.style.cssText = [
          'display: flex',
          'align-items: flex-start',
          'gap: 10px',
          'color: #e0e0f0',
          'font-size: 14px',
          "font-family: 'Segoe UI', system-ui, -apple-system, sans-serif",
          'line-height: 1.5',
          'background: rgba(108, 99, 255, 0.06)',
          'border: 1px solid rgba(108, 99, 255, 0.10)',
          'border-radius: 8px',
          'padding: 10px 14px',
        ].join(';');

        var emojiSpan = document.createElement('span');
        emojiSpan.textContent = item.emoji;
        emojiSpan.setAttribute('aria-hidden', 'true');
        emojiSpan.style.cssText = 'flex-shrink: 0; font-size: 16px; line-height: 1.4;';

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
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') closeChangelog();
    });

    return { overlay: overlay, panel: panel };
  }

  function openChangelog() {
    if (!_modal) {
      _modal = buildModal();
    }

    _modal.overlay.style.display = 'flex';
    // Trigger transition on next frame
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        _modal.overlay.style.opacity = '1';
        _modal.panel.style.transform = 'translateY(0)';
      });
    });
  }

  function closeChangelog() {
    if (!_modal) return;
    _modal.overlay.style.opacity = '0';
    _modal.panel.style.transform = 'translateY(16px)';
    setTimeout(function () {
      if (_modal) _modal.overlay.style.display = 'none';
    }, 200);
  }

  global.openChangelog = openChangelog;
  global.closeChangelog = closeChangelog;

}(window));
