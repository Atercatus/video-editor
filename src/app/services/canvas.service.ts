import {Injectable} from '@angular/core';
import {get} from 'lodash-es';

@Injectable({
  providedIn: 'root',
})
export class CanvasService {
  syncCanvasSize(canvas: HTMLElement): void {
    if (!this.isCanvasElement(canvas)) {
      return;
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  syncCanvasResolution(canvas: HTMLElement): void {
    if (!this.isCanvasElement(canvas)) {
      return;
    }

    const dpr = window.devicePixelRatio;

    canvas.width *= dpr;
    canvas.height *= dpr;

    canvas.getContext('2d')?.scale(dpr, dpr);
  }

  private isCanvasElement(element: HTMLElement): element is HTMLCanvasElement {
    return typeof get(element, 'getContext') === 'function';
  }
}
