import {AsyncPipe, NgIf, NgStyle} from '@angular/common';
import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {UntilDestroy} from '@ngneat/until-destroy';
import {isNil} from 'lodash-es';

@UntilDestroy()
@Component({
  selector: 'lib-slider',
  templateUrl: './slider.component.html',
  standalone: true,
  imports: [NgStyle, NgIf, AsyncPipe],
})
export class SliderComponent implements OnChanges {
  @Input() private baseCoordinatesX = 0;
  @Input() private pixelPerTime = 1;
  @Input() private duration = 0;

  @Output() private startHandleMove = new EventEmitter<{time: number}>();
  @Output() private endHandleMove = new EventEmitter<void>();
  @Output() private requestPlayHeadMove = new EventEmitter<{time: number}>();

  // TODO(cattus-cur): mouseover, mouseout output 추가하기 & 커서 활성화 비활성화 추가하기

  // TODO(cattus-cur): 핸들 움직이면 playHead position 변경하기

  // TODO(cattus-cur): 핸들 움직이면서 스크롤도 되어야함

  // TODO(cattus-cur): 상위에 값 전달 해줘야함

  startTime = 0;
  endTime = 0;

  private readonly HANDLE_WIDTH = 10;
  private readonly MAX_BODY_WIDTH = 1300;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    const duration = changes['duration']?.currentValue;

    if (isNil(duration)) {
      return;
    }

    this.endTime = this.duration;
  }

  protected getHeadPosition(): number {
    return Math.max(this.startTime - this.baseCoordinatesX * this.pixelPerTime - this.HANDLE_WIDTH, -this.HANDLE_WIDTH);
  }

  protected getTailPosition(): number {
    return Math.min(this.endTime - this.baseCoordinatesX * this.pixelPerTime, this.MAX_BODY_WIDTH);
  }

  protected getBodyStyle(): Object {
    const DEFAULT_WIDTH = this.MAX_BODY_WIDTH;
    const left = Math.max(this.startTime - this.baseCoordinatesX * this.pixelPerTime, 0);
    const right = (this.baseCoordinatesX + this.MAX_BODY_WIDTH) * this.pixelPerTime - this.endTime;
    const width = DEFAULT_WIDTH - left - (right <= 0 ? 0 : right);

    return {
      left: `${left}px`,
      width: `${width >= 0 ? width : 0}px`,
    };
  }

  protected onMouseDown(event: MouseEvent, propertyKey: keyof this): void {
    const onMouseMove = this.getOnMouseMove(event, propertyKey);
    const onMouseUp = this.getOnMouseUp(onMouseMove);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    this.startHandleMove.emit({time: this[propertyKey] as number});
  }

  protected isDisplayHead(): boolean {
    return this.baseCoordinatesX * this.pixelPerTime <= this.startTime;
  }

  protected isDisplayHandle(time: number): boolean {
    return (
      time >= this.baseCoordinatesX * this.pixelPerTime &&
      this.baseCoordinatesX + this.MAX_BODY_WIDTH * this.pixelPerTime >= time
    );
  }

  private getOnMouseMove(mouseDownEvent: MouseEvent, propertyKey: keyof this): (e: MouseEvent) => void {
    const previousX = mouseDownEvent.pageX;
    const previousPos = this[propertyKey] as number;

    return (e: MouseEvent) => {
      let time = previousPos + e.pageX - previousX;

      if (propertyKey === 'startTime') {
        time = Math.max(time, 0);
      } else if (propertyKey === 'endTime') {
        time = Math.min(time, this.duration);
      }

      if (propertyKey === 'startTime' && time > this.endTime) {
        time = this.endTime - 1;
      } else if (propertyKey === 'endTime' && time < this.startTime) {
        time = this.startTime + 1;
      }

      this[propertyKey] = time as any;

      this.requestPlayHeadMove.emit({time});
    };
  }

  private getOnMouseUp(onMouseMove: (e: MouseEvent) => void): () => void {
    const onMoseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMoseUp);

      this.endHandleMove.emit();
    };

    return onMoseUp;
  }
}
