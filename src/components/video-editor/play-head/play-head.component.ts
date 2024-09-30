import {NgIf, NgStyle} from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {UntilDestroy} from '@ngneat/until-destroy';
import {isNil} from 'lodash-es';

@UntilDestroy()
@Component({
  selector: 'lib-play-head',
  templateUrl: './play-head.component.html',
  standalone: true,
  imports: [NgIf, NgStyle],
  encapsulation: ViewEncapsulation.None,
})
export class PlayHeadComponent implements OnChanges {
  @ViewChild('playHead') playHead?: ElementRef<HTMLDivElement>;

  @Input() maxPosition = 0;

  @Input() currentTime = 0;
  @Input() baseCoordinatesX = 0;

  @Output() private updatePosition = new EventEmitter<number>();
  @Output() private mouseOver = new EventEmitter<void>();
  @Output() private mouseOut = new EventEmitter<void>();
  @Output() private mouseDown = new EventEmitter<void>();
  @Output() private mouseUp = new EventEmitter<void>();

  protected readonly WIDTH = 7;
  protected readonly floor = Math.floor;

  private headPosition = 0;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    const currentTime = changes['currentTime']?.currentValue;
    const baseCoordinatesX = changes['baseCoordinatesX']?.currentValue;

    if (isNil(currentTime) && isNil(baseCoordinatesX)) {
      return;
    }

    const headPosition = this.currentTime - this.baseCoordinatesX;

    if (this.headPosition !== headPosition) {
      this.headPosition = headPosition;
      this.updatePosition.emit(this.headPosition);
    }
  }

  protected getHeadPosition(): number {
    return this.headPosition - Math.floor(this.WIDTH / 2);
  }

  protected onMouseDown(event: MouseEvent): void {
    if (isNil(this.playHead)) {
      return;
    }

    const onMousemove = this.getOnMouseMove(event);
    const onMouseUp = this.getOnMouseUp(onMousemove);

    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseUp);

    this.mouseDown.emit();
  }

  protected onMouseOver(): void {
    this.mouseOver.emit();
  }

  protected onMouseOut(): void {
    this.mouseOut.emit();
  }

  private getOnMouseMove(mouseDownEvent: MouseEvent): (e: MouseEvent) => void {
    const previousX = mouseDownEvent.pageX;
    const previousPos = this.headPosition;

    const onMousemove = (e: MouseEvent): void => {
      const headPosition = previousPos + e.pageX - previousX;

      this.headPosition =
        headPosition > 0
          ? Math.min(this.maxPosition, headPosition)
          : Math.max(0, Math.min(this.maxPosition, headPosition));

      this.updatePosition.emit(this.headPosition);
    };

    return onMousemove;
  }

  private getOnMouseUp(onMousemove: (e: MouseEvent) => void): () => void {
    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMousemove);
      document.removeEventListener('mouseup', onMouseUp);

      this.mouseUp.emit();
    };

    return onMouseUp;
  }
}
