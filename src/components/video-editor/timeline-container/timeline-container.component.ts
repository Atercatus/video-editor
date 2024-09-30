import {AsyncPipe, NgIf, NgStyle} from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {isNil} from 'lodash-es';
import {animationFrameScheduler, BehaviorSubject, fromEvent, Subscription, timer} from 'rxjs';
import {WheelService} from '../../../app/services/wheel.service';
import {PlayHeadComponent} from '../play-head/play-head.component';
import {SliderControllerComponent} from '../slider-controller/slider-controller.component';
import {ThumbnailRailComponent} from '../thumbnail-rail/thumbnail-rail.component';
import {TimelineHeaderComponent} from '../timeline-header/timeline-header.component';

@UntilDestroy()
@Component({
  selector: 'lib-timeline-container',
  templateUrl: './timeline-container.component.html',
  standalone: true,
  imports: [
    ThumbnailRailComponent,
    TimelineHeaderComponent,
    NgIf,
    AsyncPipe,
    NgStyle,
    PlayHeadComponent,
    SliderControllerComponent,
  ],
})
export class TimelineContainerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() pixelPerTime = 1;
  @Input() currentVideoTime = 0;
  @Input() duration = 0;

  @ViewChild('timelineContainer')
  private timelineContainer?: ElementRef<HTMLDivElement>;
  @ViewChild(TimelineHeaderComponent)
  private timelineHeader?: TimelineHeaderComponent;

  @Output() private syncVideoTime = new EventEmitter<number>();

  @HostListener('window:resize', ['$event']) protected onResizeWindow(): void {
    this.recalculateTimelineContainerLeft();
  }

  protected get isCursorVisible(): boolean {
    return this.isTimelineOver$.value && !this.isPlayHeadMouseDown$.value && !this.isPlayHeadMouseOver$.value;
  }

  protected currentTime$ = new BehaviorSubject<number>(0);
  protected cursorPosition$ = new BehaviorSubject<number>(0);

  protected baseCoordinates = {x: 0};

  private playHeadPosition = 0;
  private isPlayHeadMouseOver$ = new BehaviorSubject<boolean>(false);
  private isPlayHeadMouseDown$ = new BehaviorSubject<boolean>(false);
  private isTimelineOver$ = new BehaviorSubject<boolean>(false);

  private cursorScrollSubscription?: Subscription;
  private timelineMouseMoveSubscrption?: Subscription;
  private timelineClickSubscrption?: Subscription;

  private timelineContainerLeft = 0;

  constructor(private wheelService: WheelService) {}

  ngOnChanges(changes: SimpleChanges): void {
    const currentVideoTime = changes['currentVideoTime'];

    if (!isNil(currentVideoTime)) {
      this.currentTime$.next(Math.floor(this.currentVideoTime));
    }
  }

  ngAfterViewInit(): void {
    // TODO(cattus-cur): 서버에서 메타데이터 불러오는 것 시뮬레이션
    setTimeout(() => {
      this.initTimeline();

      this.recalculateTimelineContainerLeft();
    }, 1500);
  }

  ngOnDestroy(): void {
    this.timelineClickSubscrption?.unsubscribe();
    this.timelineMouseMoveSubscrption?.unsubscribe();
    this.cursorScrollSubscription?.unsubscribe();
  }

  protected onWheel(e: WheelEvent): void {
    e.preventDefault();

    const newBaseCoordinatesX = this.wheelService.calculateCoordinates(e, this.baseCoordinates.x);
    const diff = newBaseCoordinatesX - this.baseCoordinates.x;

    this.baseCoordinates.x = newBaseCoordinatesX;

    if (this.isPlayHeadMouseDown$.value) {
      this.updateCurrentTime(this.currentTime$.value + diff);
    }

    // TODO(cattus-cur): 핸들도 같이 드래그 되려면 여기서 핸들의 위치를 변경시켜야함...
  }

  protected onRequestPlayHeadMove({time}: {time: number}): void {
    this.onUpdatePosition(Math.floor(time / this.pixelPerTime - this.baseCoordinates.x));
  }

  protected onStartHandleMove({time}: {time: number}): void {
    this.onPlayHeadMouseDown();
    this.onUpdatePosition(Math.floor(time / this.pixelPerTime - this.baseCoordinates.x));
  }

  protected onUpdatePosition(position: number): void {
    this.playHeadPosition = position;

    this.updateCurrentTime((position + this.baseCoordinates.x) * this.pixelPerTime);
  }

  protected onPlayHeadMouseOver(): void {
    this.isPlayHeadMouseOver$.next(true);
  }

  protected onPlayHeadMouseOut(): void {
    this.isPlayHeadMouseOver$.next(false);
  }

  protected onPlayHeadMouseDown(): void {
    this.timelineClickSubscrption?.unsubscribe();
    this.timelineMouseMoveSubscrption?.unsubscribe();

    this.isPlayHeadMouseDown$.next(true);

    if (!isNil(this.cursorScrollSubscription)) {
      return;
    }

    this.cursorScrollSubscription = timer(0, 0, animationFrameScheduler)
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        const THRESHOLD = 50;
        const MAX_STEP = 25;
        const isLeftOver = this.playHeadPosition < THRESHOLD;
        const isRightOver = this.playHeadPosition > (this.timelineHeader?.offsetWidth ?? 0) - THRESHOLD;

        if (!isLeftOver && !isRightOver) {
          return;
        }

        const deltaX: number = isLeftOver
          ? Math.max(this.playHeadPosition - THRESHOLD, -MAX_STEP)
          : isRightOver
            ? Math.min(this.playHeadPosition - (this.timelineHeader?.offsetWidth ?? 0) + THRESHOLD, MAX_STEP)
            : 0;

        if (deltaX === 0) {
          return;
        }

        this.fireWheelEvent(deltaX);
      });
  }

  protected onPlayHeadMouseUp(): void {
    if (isNil(this.timelineContainer)) {
      return;
    }

    this.subscribeTimelineClick();
    this.subscribeTimelineMouseMove();

    this.isPlayHeadMouseDown$.next(false);

    this.cursorScrollSubscription?.unsubscribe();
    this.cursorScrollSubscription = undefined;
  }

  protected onTimelineMouseEnter(): void {
    this.isTimelineOver$.next(true);
  }

  protected onTimelineMouseLeave(): void {
    this.isTimelineOver$.next(false);
  }

  private initTimeline(): void {
    if (isNil(this.timelineContainer) || isNil(this.timelineHeader)) {
      return;
    }

    this.wheelService.setBoundary(0, this.duration - this.timelineHeader.offsetWidth);

    this.timelineContainer.nativeElement.addEventListener(
      'wheel',
      e => {
        this.onWheel(e);
      },
      {passive: false}
    );

    this.initCursorEvents();
  }

  private initCursorEvents(): void {
    if (isNil(this.timelineContainer)) {
      return;
    }

    this.subscribeTimelineMouseMove();
    this.subscribeTimelineClick();
  }

  private subscribeTimelineClick(): void {
    if (isNil(this.timelineContainer)) {
      return;
    }

    this.timelineClickSubscrption = fromEvent<MouseEvent>(this.timelineContainer.nativeElement, 'mousedown')
      .pipe(untilDestroyed(this))
      .subscribe(e => {
        const pos = this.adjustCursorPosition(e.pageX - this.timelineContainerLeft, 0);
        const time = this.baseCoordinates.x + pos;

        this.updateCurrentTime(time);
      });
  }

  private subscribeTimelineMouseMove(): void {
    if (isNil(this.timelineContainer)) {
      return;
    }

    this.timelineMouseMoveSubscrption = fromEvent<MouseEvent>(this.timelineContainer.nativeElement, 'mousemove')
      .pipe(untilDestroyed(this))
      .subscribe(e => {
        const pos = this.adjustCursorPosition(e.pageX - this.timelineContainerLeft, 0);

        this.cursorPosition$.next(pos);
      });
  }

  private adjustCursorPosition(initialPos: number, gap: number): number {
    let pos = initialPos;

    pos = Math.max(pos, gap);
    pos = Math.min(pos, (this.timelineHeader?.offsetWidth ?? 0) + gap);

    return pos;
  }

  private recalculateTimelineContainerLeft(): void {
    this.timelineContainerLeft = this.timelineContainer?.nativeElement.getBoundingClientRect().left ?? 0;
  }

  private updateCurrentTime(time: number): void {
    this.syncVideoTime.emit(time);
    this.currentTime$.next(time); // cattus.nets(2024.09.20): 비디오 시간이 변경되고 input 으로 현재 시간이 변경되기까지 시간이 너무 길기 때문에 먼저 수정한다.
  }

  private fireWheelEvent(deltaX: number): void {
    const wheelEvent = new WheelEvent('wheel', {
      deltaX,
      bubbles: true, // 이벤트가 버블링 되도록 설정
      cancelable: true, // 이벤트를 취소할 수 있도록 설정
    });

    this.timelineContainer?.nativeElement.dispatchEvent(wheelEvent);
  }
}
