import { ChangeDetectionStrategy, Component, Inject, Input, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { StoreConfiguration } from '../../models';
import { NG_STORE_CONFIG } from '../../tokens';

@Component({
  selector: 'ngs-loader-host',
  template: '<ng-container #host></ng-container>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgStoreLoaderHostComponent implements OnInit {

  /****************************************************************** BINDINGS ******************************************************************/

  @Input()
  public size!: string;

  @ViewChild('host', { read: ViewContainerRef, static: true })
  public host!: ViewContainerRef;

  /****************************************************************** LIFE CYCLE ******************************************************************/

  constructor(@Inject(NG_STORE_CONFIG) private _config: StoreConfiguration) { }

  public ngOnInit(): void {
    const component = this.host.createComponent(this._config.loaderComponent);

    component.instance.size = this.size;
  }

}
