import {Injectable} from '@angular/core';

@Injectable({providedIn: 'root'})
export class WheelService {
  private boundary = {left: 0, right: 0};

  setBoundary(left: number, right: number): void {
    this.boundary = {left, right};
  }

  calculateCoordinates(e: WheelEvent, baseCoordinates: number): number {
    let delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

    delta = this.recalculateDelta(e.deltaMode, delta);

    const updatedCoordinates = baseCoordinates + delta;
    const adjustedCoordinates = this.adjustCoordinates(updatedCoordinates);

    return adjustedCoordinates;
  }

  private recalculateDelta(deltaMode: number, delta: number): number {
    const pageStep = window.innerHeight;
    // TODO(cattus-cur):가속도 재설정하기
    const threshold = 100;

    let result = 0;

    if (deltaMode === 0) {
      result = delta;
    } else if (deltaMode === 1) {
      result = delta * 16;
    } else if (deltaMode === 2) {
      result = delta * pageStep;
    }

    if (Math.abs(result) > threshold) {
      result = result > 0 ? threshold : -threshold;
    }

    return result;
  }

  private adjustCoordinates(_offset: number): number {
    let offsetX = _offset;

    if (offsetX < this.boundary.left) {
      offsetX = this.boundary.left;
    } else if (offsetX > this.boundary.right) {
      offsetX = this.boundary.right;
    }

    return offsetX;
  }
}
