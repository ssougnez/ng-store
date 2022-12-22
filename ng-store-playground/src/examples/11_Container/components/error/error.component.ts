import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IBaseErrorComponent } from '@ssougnez/ng-store';

@Component({
  selector: 'app-loader',
  templateUrl: './error.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class ErrorComponent implements IBaseErrorComponent {

  @Input()
  public error: any;

}
