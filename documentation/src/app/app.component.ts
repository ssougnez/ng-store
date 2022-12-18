import { AfterViewInit, Component } from '@angular/core';
import { highlightAll } from 'prismjs';

import 'prismjs/components/prism-typescript';
import { TopCtaComponent } from './components/top-cta.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    TopCtaComponent
  ]
})
export class AppComponent implements AfterViewInit {

  /************************************************* LIFE CYCLE *************************************************/

  public ngAfterViewInit(): void {
    highlightAll();
  }
}
