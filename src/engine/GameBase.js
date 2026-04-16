/**
 * GameBase — Classe base para todos os mini jogos.
 * JS puro, sem módulos. Exposta como global window.GameBase.
 *
 * Cada jogo deve herdar desta classe e implementar:
 *   init()       → setup inicial (criar entidades, resetar estado)
 *   update(dt)   → lógica por frame (dt = delta time em segundos)
 *   render()     → desenho no canvas
 */
(function (global) {
  'use strict';

  function GameBase(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.running = false;
    this.paused  = false;

    this._lastTime  = 0;
    this._rafHandle = null;

    this._resize();
    var self = this;
    window.addEventListener('resize', function () { self._resize(); });
  }

  /* ---- Ciclo de vida ---- */

  GameBase.prototype.start = function () {
    this.running = true;
    this.paused  = false;
    this.init();
    this._lastTime  = performance.now();
    var self = this;
    this._rafHandle = requestAnimationFrame(function (t) { self._loop(t); });
  };

  GameBase.prototype.togglePause = function () {
    if (!this.running) return;
    this.paused = !this.paused;
    if (!this.paused) {
      this._lastTime = performance.now();
      var self = this;
      this._rafHandle = requestAnimationFrame(function (t) { self._loop(t); });
    }
    this.onPauseChange(this.paused);
  };

  GameBase.prototype.stop = function () {
    this.running = false;
    if (this._rafHandle) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
  };

  /* ---- Hooks para subclasses ---- */

  GameBase.prototype.init          = function () {};
  GameBase.prototype.update        = function (_dt) {};
  GameBase.prototype.render        = function () {};
  GameBase.prototype.onPauseChange = function (_paused) {};

  /* ---- Utilitários de canvas ---- */

  GameBase.prototype.clear = function (color) {
    this.ctx.fillStyle = color || '#0d0d1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  };

  Object.defineProperty(GameBase.prototype, 'width',  { get: function () { return this.canvas.width;  } });
  Object.defineProperty(GameBase.prototype, 'height', { get: function () { return this.canvas.height; } });

  /* ---- Herança simples ---- */

  /**
   * Utilitário de herança.
   * Uso: GameBase.extend(MinhaClasse)
   * MinhaClasse pode sobrescrever init / update / render.
   */
  GameBase.extend = function (Child) {
    Child.prototype = Object.create(GameBase.prototype);
    Child.prototype.constructor = Child;
  };

  /* ---- Internos ---- */

  GameBase.prototype._loop = function (timestamp) {
    if (!this.running || this.paused) return;
    var dt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;
    this.update(dt);
    this.render();
    var self = this;
    this._rafHandle = requestAnimationFrame(function (t) { self._loop(t); });
  };

  GameBase.prototype._resize = function () {
    var wrapper = this.canvas.parentElement;
    if (!wrapper) return;
    if (wrapper.clientWidth)  this.canvas.width  = wrapper.clientWidth;
    if (wrapper.clientHeight) this.canvas.height = wrapper.clientHeight;
  };

  /* ---- Expõe globalmente ---- */
  global.GameBase = GameBase;

}(window));
