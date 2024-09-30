import {AsyncPipe, NgIf} from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {isNil, union} from 'lodash-es';
import {BehaviorSubject, filter, fromEvent, Subject, take} from 'rxjs';
import {CanvasService} from '../../../app/services/canvas.service';

@UntilDestroy()
@Component({
  selector: 'lib-thumbnail-rail',
  templateUrl: './thumbnail-rail.component.html',
  standalone: true,
  imports: [NgIf, AsyncPipe],
})
export class ThumbnailRailComponent implements AfterViewInit, OnChanges {
  @HostBinding('style.position') protected readonly position = 'relative';

  @ViewChild('thumbnailRail')
  private thumbnailRail?: ElementRef<HTMLCanvasElement>;
  @ViewChild('thumbnailVideo')
  private forThumbnail?: ElementRef<HTMLVideoElement>;

  @Input() baseCoordinatesX = 0;
  @Input() pixelPerTime = 1;

  private get thumbnailTimeGap(): number {
    return this.THUMBNAIL_WIDTH * this.pixelPerTime;
  }

  protected loadedInitialThumbnails$ = new BehaviorSubject<boolean>(false);

  protected readonly VIDEO_URL =
    'https://api-metakage-4misc.kakao.com/dn/kamp/vod/rvkdrixpcs4af883u76e16fkv/mp4/seeking.mp4';

  private afterThumbnailVideoLoaded$ = new Subject<void>();
  private afterThumbnailExtreacted$ = new Subject<{time: number}>();

  private thumbnails: {[key: number]: HTMLImageElement} = {};
  private thumbnailJobs: number[] = [];

  private readonly THUMBNAIL_WIDTH = 27;
  private readonly THUMBNAIL_HEIGHT = 48;

  constructor(private canvasService: CanvasService) {
    this.afterThumbnailVideoLoaded$.pipe(take(1), untilDestroyed(this)).subscribe(() => {
      if (isNil(this.thumbnailRail)) {
        return;
      }

      this.drawInitialThumbnails();
    });

    this.afterThumbnailExtreacted$.pipe(untilDestroyed(this)).subscribe(({time}) => {
      this.drawThumbnail(time);
    });

    this.loadedInitialThumbnails$
      .pipe(
        filter(val => val),
        take(1),
        untilDestroyed(this)
      )
      .subscribe(() => {
        this.loadRemainThumbnails();
      });
  }

  ngAfterViewInit(): void {
    this.initCanvas();
    this.initOnloadedVideo();
    this.loadThumbnailVideo(this.VIDEO_URL);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const baseCoordinatesX = changes['baseCoordinatesX'];

    if (isNil(baseCoordinatesX)) {
      return;
    }

    this.render(
      baseCoordinatesX.currentValue * this.pixelPerTime,
      (this.baseCoordinatesX + (this.thumbnailRail?.nativeElement.offsetWidth ?? 0)) * this.pixelPerTime
    );
  }

  private render(startTime: number, endTime: number): void {
    this.clearThumbnailRail();

    let currentTime = startTime;
    let firstShotTime = -1;

    while (currentTime <= endTime) {
      const thumbnailIdx = this.getThumbnailIdx(currentTime);
      const thumbnail = this.thumbnails[thumbnailIdx];

      if (!isNil(thumbnail)) {
        this.drawThumbnail(currentTime);
      } else {
        this.drawSekelton(currentTime);

        this.thumbnailJobs = union(this.thumbnailJobs, [thumbnailIdx]);
      }

      if (isNil(thumbnail) && firstShotTime === -1) {
        firstShotTime = currentTime;
      }

      currentTime += this.thumbnailTimeGap;
    }

    requestAnimationFrame(() => {
      if (!isNil(this.forThumbnail) && firstShotTime >= 0) {
        this.forThumbnail.nativeElement.currentTime = firstShotTime;
      }
    });
  }

  private clearThumbnailRail(): void {
    this.thumbnailRail?.nativeElement
      .getContext('2d')
      ?.clearRect(0, 0, this.thumbnailRail.nativeElement.width, this.thumbnailRail.nativeElement.height);
  }

  private drawSekelton(currentTime: number): void {
    const thumbnailRail = this.thumbnailRail?.nativeElement;
    const thumbnailRailCtx = thumbnailRail?.getContext('2d');

    if (isNil(thumbnailRailCtx) || isNil(thumbnailRail)) {
      return;
    }

    if (this.isOverViewport(currentTime)) {
      return;
    }

    const thumbnailIdx = this.getThumbnailIdx(currentTime);
    const x = thumbnailIdx * this.THUMBNAIL_WIDTH * this.pixelPerTime - this.baseCoordinatesX;

    thumbnailRailCtx.fillStyle = '#f0f0f0';
    thumbnailRailCtx.fillRect(x, 0, this.THUMBNAIL_WIDTH, this.THUMBNAIL_HEIGHT);
  }

  private drawThumbnail(currentTime: number): void {
    const thumbnailRail = this.thumbnailRail?.nativeElement;
    const thumbnailRailCtx = thumbnailRail?.getContext('2d');

    if (isNil(thumbnailRailCtx) || isNil(thumbnailRail)) {
      return;
    }

    if (this.isOverViewport(currentTime)) {
      return;
    }

    const thumbnailIdx = this.getThumbnailIdx(currentTime);
    const x = thumbnailIdx * this.THUMBNAIL_WIDTH * this.pixelPerTime - this.baseCoordinatesX;

    if (!isNil(this.thumbnails[thumbnailIdx])) {
      thumbnailRailCtx.drawImage(this.thumbnails[thumbnailIdx], x, 0, this.THUMBNAIL_WIDTH, this.THUMBNAIL_HEIGHT);
    }
  }

  private extractThumbnail(startTime: number): void {
    if (isNil(this.forThumbnail) || isNil(this.forThumbnail?.nativeElement)) {
      return;
    }

    fromEvent(this.forThumbnail.nativeElement, 'seeked')
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        const forThumbnail = this.forThumbnail?.nativeElement;
        const thumbnailIdx = this.getThumbnailIdx(forThumbnail?.currentTime ?? 0);

        if (isNil(forThumbnail)) {
          return;
        }

        const canvas = document.createElement('canvas');

        canvas.width = forThumbnail.videoWidth;
        canvas.height = forThumbnail.videoHeight;

        const ctx = canvas.getContext('2d');

        ctx?.drawImage(forThumbnail, 0, 0, canvas.width, canvas.height);

        const image = new Image();
        const currentTime = forThumbnail.currentTime;

        const currentBaseCoordinatesX = this.baseCoordinatesX;

        if (!this.isOverViewport(currentTime)) {
          image.addEventListener('load', () => {
            if (Math.abs(currentBaseCoordinatesX - this.baseCoordinatesX) < this.THUMBNAIL_WIDTH) {
              this.afterThumbnailExtreacted$.next({time: currentTime});
            }

            // TODO(cattus-cur): 다시 계싼하도록 수정이 필요하다.
            const isLastInitialThumbnailLoaded =
              currentTime ===
              this.getCurrentStartTime() + (this.thumbnailRail?.nativeElement.offsetWidth ?? 0) * this.pixelPerTime;

            if (isLastInitialThumbnailLoaded) {
              this.loadedInitialThumbnails$.next(true);
            }
          });
        }

        image.src = canvas.toDataURL('image/png');
        this.thumbnails[thumbnailIdx] = image;

        if (this.thumbnailJobs.length > 0) {
          requestAnimationFrame(() => {
            forThumbnail.currentTime = (this.thumbnailJobs.shift() ?? 0) * this.THUMBNAIL_WIDTH * this.pixelPerTime;
          });
        }
      });

    this.forThumbnail.nativeElement.currentTime = startTime;
  }

  private loadThumbnailVideo(videoUrl: string): void {
    fetch(videoUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        return response.blob();
      })
      .then(blob => {
        if (isNil(this.forThumbnail)) {
          return;
        }

        this.forThumbnail.nativeElement.src = URL.createObjectURL(blob);
      })
      // eslint-disable-next-line no-console
      .catch(error => console.error(error));
  }

  private initOnloadedVideo(): void {
    if (isNil(this.forThumbnail)) {
      return;
    }

    const forThumbnail = this.forThumbnail.nativeElement;

    forThumbnail.addEventListener('loadeddata', () => {
      const SCALE = 2;

      forThumbnail.width = forThumbnail.videoWidth * SCALE;
      forThumbnail.height = forThumbnail.videoHeight * SCALE;

      this.afterThumbnailVideoLoaded$.next();
    });
  }

  private initCanvas(): void {
    if (isNil(this.thumbnailRail)) {
      return;
    }

    this.canvasService.syncCanvasSize(this.thumbnailRail.nativeElement);
    this.canvasService.syncCanvasResolution(this.thumbnailRail.nativeElement);
  }

  private drawInitialThumbnails(): void {
    if (isNil(this.thumbnailRail)) {
      return;
    }

    let currentTime = this.getCurrentStartTime();

    while (
      currentTime <=
      this.getCurrentStartTime() + this.thumbnailRail.nativeElement.offsetWidth * this.pixelPerTime
    ) {
      this.thumbnailJobs.push(this.getThumbnailIdx(currentTime));

      currentTime += this.thumbnailTimeGap;
    }

    this.extractThumbnail(currentTime);
  }

  private loadRemainThumbnails(): void {
    const forThumbnail = this.forThumbnail?.nativeElement;

    if (isNil(forThumbnail) || isNil(this.thumbnailRail)) {
      return;
    }

    const startTime = this.getCurrentStartTime() + this.thumbnailRail.nativeElement.offsetWidth * this.pixelPerTime;
    let currentTime = startTime;

    while (currentTime <= forThumbnail.duration) {
      this.thumbnailJobs.push(this.getThumbnailIdx(currentTime));
      currentTime += this.thumbnailTimeGap;
    }

    forThumbnail.currentTime = startTime;
  }

  private getCurrentStartTime(): number {
    return this.baseCoordinatesX * this.pixelPerTime;
  }

  private getThumbnailIdx(time: number): number {
    return Math.floor(time / this.THUMBNAIL_WIDTH);
  }

  private isOverViewport(currentTime: number): boolean {
    return (
      currentTime < this.getCurrentStartTime() ||
      currentTime > this.getCurrentStartTime() + (this.thumbnailRail?.nativeElement.width ?? 0) * this.pixelPerTime
    );
  }
}
