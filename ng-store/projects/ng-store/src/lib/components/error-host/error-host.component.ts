import { ChangeDetectionStrategy, Component, Inject, Input, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { StoreConfiguration } from '../../models';
import { NG_STORE_CONFIG } from '../../tokens';

@Component({
  selector: 'ngs-error-host',
  template: '<ng-container #host></ng-container><div *ngIf="!!config?.errorComponent" [innerHTML]="error"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgStoreErrorHostComponent implements OnInit {

  /****************************************************************** BINDINGS ******************************************************************/

  @Input()
  public error!: string;

  @ViewChild('host', { read: ViewContainerRef, static: true })
  public host!: ViewContainerRef;

  /****************************************************************** LIFE CYCLE ******************************************************************/

  constructor(@Inject(NG_STORE_CONFIG) public config: StoreConfiguration) { }

  public ngOnInit(): void {
    this.host.clear();

    if (this.config.errorComponent) {
      const component = this.host.createComponent(this.config.errorComponent);

      component.instance.error = this.error;
    }
  }

}
