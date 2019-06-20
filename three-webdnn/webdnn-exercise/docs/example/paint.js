'use strict';

/////////////////////////////////////////////////////////////////////////
//
// paint.js
//
// 画面に文字を描くためのプログラムです。編集する必要はありません
// Simple paiting feature for canvas. You DO NOT need to edit this file.
//
/////////////////////////////////////////////////////////////////////////


class SimpleCanvasPainter {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.lastPoint = {
      x: 0,
      y: 0
    };
    this.nextPoint = {
      x: 0,
      y: 0
    };
    this.flagContinueStroke = false;
    this.flagStrokeRequested = false;
    this.flagCalculationRequested = false;

    this.canvas.style.touchAction = 'none';
    this.context.fillStyle = 'black';
    this.context.strokeStyle = 'white';
    this.context.lineCap = 'round';
    this.context.lineWidth = '20';

    canvas.addEventListener('mousedown', (ev) => this.onMouseDown(ev));
    canvas.addEventListener('mousemove', (ev) => this.onMouseMove(ev));
    canvas.addEventListener('mouseup', (ev) => this.onMouseUp(ev));
    canvas.addEventListener('touchstart', (ev) => this.onTouchStart(ev));
    canvas.addEventListener('touchmove', (ev) => this.onTouchMove(ev));
    canvas.addEventListener('touchend', (ev) => this.onTouchEnd(ev));
    this.clear();
  }

  clear() {
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  startStroke(x, y) {
    if (this.flagContinueStroke) return;
    this.flagContinueStroke = true;
    this.lastPoint.x = this.nextPoint.x = x;
    this.lastPoint.y = this.nextPoint.y = y;
  }

  requestStrokeTo(x, y) {
    if (!this.flagContinueStroke) return;
    this.nextPoint.x = x;
    this.nextPoint.y = y;

    if (this.flagStrokeRequested) return;
    this.flagStrokeRequested = true;

    requestAnimationFrame(() => {
      this.context.beginPath();
      this.context.moveTo(this.lastPoint.x, this.lastPoint.y);
      this.context.lineTo(this.nextPoint.x, this.nextPoint.y);
      this.context.stroke();
      this.lastPoint = this.nextPoint;
      this.nextPoint = {
        x: 0,
        y: 0
      };
      this.flagStrokeRequested = false;
      this.requestCalculation();
    });
  }

  finishStroke() {
    if (!this.flagContinueStroke) return;
    this.flagContinueStroke = false;
  }

  async requestCalculation() {
    if (this.flagCalculationRequested) return;
    this.flagCalculationRequested = true;

    while (!webdnn_runner) await new Promise(r => requestAnimationFrame(r));

    calculate()
      .then(() => {
        this.flagCalculationRequested = false;
      })
      .catch((reason) => {
        console.error('Failed DNN calculation!', reason);
      });
  }


  /**
   * Event Handlers
   */

  onMouseDown(ev) {
    this.startStroke(ev.offsetX, ev.offsetY);
  }

  onMouseMove(ev) {
    if (!this.flagContinueStroke) return;
    this.requestStrokeTo(ev.offsetX, ev.offsetY);
  }

  onMouseUp(ev) {
    this.finishStroke();
  }

  onTouchStart(ev) {
    let bcr = this.canvas.getBoundingClientRect();
    this.startStroke(ev.touches[0].clientX - bcr.left, ev.touches[0].clientY - bcr.top);
  }

  onTouchMove(ev) {
    if (!this.flagContinueStroke) return;
    let bcr = this.canvas.getBoundingClientRect();
    this.requestStrokeTo(ev.touches[0].clientX - bcr.left, ev.touches[0].clientY - bcr.top);
  }

  onTouchEnd(ev) {
    this.finishStroke();
  }
}

window.addEventListener('load', () => {
  let painter = new SimpleCanvasPainter(document.getElementById('draw'));
  document.getElementById('reset').addEventListener('click', (e) => painter.clear());
});