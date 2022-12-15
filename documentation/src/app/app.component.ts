import { AfterViewInit, Component } from '@angular/core';
import { highlightAll } from 'prismjs';

import 'prismjs/components/prism-typescript';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true
})
export class AppComponent implements AfterViewInit {

  /************************************************* LIFE CYCLE *************************************************/

  public ngAfterViewInit(): void {
    highlightAll();
  }
}
