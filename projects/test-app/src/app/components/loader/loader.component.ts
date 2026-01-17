import { Component, input, InputSignal } from '@angular/core';
import { IBaseLoaderComponent } from '@areaprog/ng-store';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent implements IBaseLoaderComponent {
  public readonly text: InputSignal<string> = input<string>('');
  public readonly size: InputSignal<string> = input<string>('40px');
}
