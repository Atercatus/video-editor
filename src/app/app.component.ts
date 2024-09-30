import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoEditorComponent } from '../components/video-editor/pw-video-editor/pw-video-editor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, VideoEditorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'video-editor';
}
