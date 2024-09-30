import {Component, ViewChild} from '@angular/core';
import {UntilDestroy} from '@ngneat/until-destroy';
import {PreviewVideoComponent} from '../preview-video/preview-video.component';
import {TimelineContainerComponent} from '../timeline-container/timeline-container.component';
import {TimelineHeaderComponent} from '../timeline-header/timeline-header.component';

@UntilDestroy()
@Component({
  selector: 'pw-video-editor',
  templateUrl: './pw-video-editor.component.html',
  standalone: true,
  imports: [TimelineHeaderComponent, TimelineContainerComponent, PreviewVideoComponent],
})
export class VideoEditorComponent {
  @ViewChild(PreviewVideoComponent)
  private previewVideo?: PreviewVideoComponent;

  protected currentVideoTime = 0;
  // TODO(cattus-cur): 서버에서 응답오는걸로 대체하기
  protected duration = 82 * 60 + 56;

  protected onSyncVideoTime(time: number): void {
    this.previewVideo?.setVideoTime(time);
  }

  protected onUpdateVideoTime(time: number): void {
    this.currentVideoTime = time;
  }
}
