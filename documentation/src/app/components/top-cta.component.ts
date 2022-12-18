import { AsyncPipe, NgIf } from '@angular/common';
import { AfterViewInit, Component } from '@angular/core';
import { distinctUntilChanged, fromEvent, map, Observable, tap } from 'rxjs';

@Component({
  selector: 'app-top-cta',
  templateUrl: './top-cta.component.html',
  styleUrls: ['./top-cta.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf
  ]
})
export class TopCtaComponent implements AfterViewInit {

  /************************************************* OBSERVABLES *************************************************/

  public visible$!: Observable<boolean>;

  /************************************************* LIFE CYCLE *************************************************/

  /** */
  public ngAfterViewInit(): void {
    this.visible$ = fromEvent(window, 'scroll')
      .pipe(
        map(() => window.scrollY > 50),
        distinctUntilChanged()
      );
  }

  /************************************************* LIFE CYCLE *************************************************/

  /** */
  public top(): void {
    window.scrollTo(0, 0);
  }

}
