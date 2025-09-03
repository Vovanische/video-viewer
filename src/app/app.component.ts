import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Video360Component } from './video-360/video-360.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Video360Component],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'video-viewer';
}
