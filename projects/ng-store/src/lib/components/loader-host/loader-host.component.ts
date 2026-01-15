import { ChangeDetectionStrategy, Component, inject, Input, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { StoreConfiguration } from '../../models';
import { NG_STORE_CONFIG } from '../../tokens';

@Component({
  selector: 'ngs-loader-host',
  template: '<ng-container #host></ng-container>',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgStoreLoaderHostComponent implements OnInit {

  /****************************************************************** SERVICES ******************************************************************/

  private readonly _config: StoreConfiguration = inject(NG_STORE_CONFIG);

  /****************************************************************** BINDINGS ******************************************************************/

  @Input()
  public size!: string;

  @ViewChild('host', { read: ViewContainerRef, static: true })
  public host!: ViewContainerRef;

  /****************************************************************** LIFE CYCLE ******************************************************************/

  constructor() { }

  public ngOnInit(): void {
    const component = this.host.createComponent(this._config.loaderComponent);

    component.setInput('size', this.size);
  }

}
