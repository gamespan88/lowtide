// input.js — keyboard and mouse state for LOWTIDE: held keys, one-shot presses and
// canvas clicks (a click is a coin throw, aimed in world pixels).

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.click = null; // {x, y} in canvas pixels, consumed by the world
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.click = null; });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.click = {
        x: (e.clientX - r.left) * (canvas.width / r.width),
        y: (e.clientY - r.top) * (canvas.height / r.height),
      };
    });
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  takePress(...names) {
    for (const n of names) {
      if (this.pressed.has(n)) { this.pressed.delete(n); return true; }
    }
    return false;
  }

  takeClick() {
    const c = this.click;
    this.click = null;
    return c;
  }

  endFrame() {
    this.pressed.clear();
  }
}
