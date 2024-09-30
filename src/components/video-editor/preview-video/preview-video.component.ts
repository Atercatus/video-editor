import {Component, ElementRef, EventEmitter, Output, ViewChild} from '@angular/core';
import {UntilDestroy} from '@ngneat/until-destroy';
import {isNil} from 'lodash-es';

@UntilDestroy()
@Component({
  selector: 'lib-preview-video',
  templateUrl: './preview-video.component.html',
  standalone: true,
  imports: [],
})
export class PreviewVideoComponent {
  @ViewChild('previewVideo') previewVideo?: ElementRef<HTMLVideoElement>;

  @Output() private updateVideoTime = new EventEmitter<number>();

  protected readonly VIDEO_URL =
    'https://api-metakage-4misc.kakao.com/dn/kamp/vod/rvkdrixpcs4af883u76e16fkv/mp4/seeking.mp4';

  constructor() {}

  setVideoTime(time: number): void {
    if (isNil(this.previewVideo)) {
      return;
    }

    this.previewVideo.nativeElement.currentTime = Math.floor(time);
  }

  protected onTimeUpdate(): void {
    this.updateVideoTime.emit(this.previewVideo?.nativeElement.currentTime);
  }
}
