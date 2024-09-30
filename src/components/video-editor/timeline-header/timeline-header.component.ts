import {AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild} from '@angular/core';
import {isNil} from 'lodash-es';
import {Duration} from 'luxon';
import {CanvasService} from '../../../app/services/canvas.service';

@Component({
  selector: 'lib-timeline-header',
  templateUrl: './timeline-header.component.html',
  standalone: true,
})
export class TimelineHeaderComponent implements AfterViewInit, OnChanges {
  @ViewChild('timelineHeader')
  protected timelineHeader?: ElementRef<HTMLCanvasElement>;

  @Input() baseCoordinatesX = 0;
  @Input() pixelPerTime = 1;

  get offsetWidth(): number {
    return this.timelineHeader?.nativeElement.offsetWidth ?? 0;
  }

  private readonly MAJOR_TICK_UNIT = 60 * 3;
  private readonly canvasGap = 0.5;

  constructor(private canvasService: CanvasService) {}

  ngOnChanges(changes: SimpleChanges): void {
    const baseCoordinatesX = changes['baseCoordinatesX'];

    if (!isNil(baseCoordinatesX)) {
      this.drawTimelineHeader();
    }
  }

  ngAfterViewInit(): void {
    this.initCanvas();
    this.drawTimelineHeader();
  }

  private drawTimelineHeader(): void {
    const timelineHeader = this.timelineHeader?.nativeElement;
    const timelineHeaderCtx = timelineHeader?.getContext('2d');

    if (isNil(timelineHeader) || isNil(timelineHeaderCtx)) {
      return;
    }

    timelineHeaderCtx.clearRect(0, 0, timelineHeader.width, timelineHeader.height);

    const startTime = this.baseCoordinatesX * this.pixelPerTime;
    const majorTickStart = this.MAJOR_TICK_UNIT - (startTime % this.MAJOR_TICK_UNIT);

    const tickLength = 20;
    const tickTextPadding = {x: 3, y: 12};

    this.setBorderStyle(timelineHeaderCtx);
    timelineHeaderCtx.beginPath();
    timelineHeaderCtx.moveTo(this.canvasGap, this.canvasGap);
    timelineHeaderCtx.lineTo(timelineHeader.width - this.canvasGap, this.canvasGap);
    timelineHeaderCtx.stroke();

    let tick = majorTickStart;

    while (tick < timelineHeader.width) {
      timelineHeaderCtx.beginPath();

      timelineHeaderCtx.moveTo(tick + this.canvasGap, this.canvasGap);
      timelineHeaderCtx.lineTo(tick + this.canvasGap, tickLength - this.canvasGap);

      this.setFillStyle(timelineHeaderCtx);
      timelineHeaderCtx.fillText(this.getTickText(startTime + tick), tick + tickTextPadding.x, tickTextPadding.y);

      tick += this.MAJOR_TICK_UNIT;
      timelineHeaderCtx.stroke();
    }
  }

  private initCanvas(): void {
    if (isNil(this.timelineHeader)) {
      return;
    }

    this.canvasService.syncCanvasSize(this.timelineHeader.nativeElement);
    this.canvasService.syncCanvasResolution(this.timelineHeader.nativeElement);
  }

  private getTickText(seconds: number): string {
    return Duration.fromObject({seconds}).toFormat('hh:mm:ss');
  }

  private setBorderStyle(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#BCBCBC';
  }

  private setFillStyle(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#BCBCBC';
  }
}
