import {Component, EventEmitter, Input, Output} from '@angular/core';
import {UntilDestroy} from '@ngneat/until-destroy';
import {SliderComponent} from '../slider/slider.component';

@UntilDestroy()
@Component({
  selector: 'lib-slider-controller',
  templateUrl: './slider-controller.component.html',
  standalone: true,
  imports: [SliderComponent],
})
export class SliderControllerComponent {
  @Input() baseCoordinatesX = 0;
  @Input() pixelPerTime = 1;
  @Input() duration = 0;

  @Output() private startHandleMove = new EventEmitter<{time: number}>();
  @Output() private endHandleMove = new EventEmitter<void>();
  @Output() private requestPlayHeadMove = new EventEmitter<{time: number}>();

  // TODO(cattus-cur): 3. 드래그해서 스크롤 유발하기

  constructor() {}

  protected onStartHandleMove({time}: {time: number}): void {
    this.startHandleMove.emit({time});
  }

  protected onEndHandleMove(): void {
    this.endHandleMove.emit();
  }

  protected onRequestPlayHeadMove({time}: {time: number}): void {
    this.requestPlayHeadMove.emit({time});
  }
}
