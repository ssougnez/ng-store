import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IBaseLoaderComponent } from '@ssougnez/ng-store';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class LoaderComponent implements IBaseLoaderComponent {

  @Input()
  public size: string = '1rem';

}
