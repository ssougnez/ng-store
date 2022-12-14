import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, EventEmitter, inject, Inject, Input, OnDestroy, Output, TemplateRef } from '@angular/core';
import { delay, distinctUntilChanged, filter, map, Observable, shareReplay, Subscription, switchMap, tap } from 'rxjs';
import { StoreConfiguration } from '../../models';
import { mapToError } from '../../operators';
import { NG_STORE_CONFIG } from '../../tokens';

export type LoaderType = 'component' | 'template' | 'text' | 'none';

@Component({
  selector: 'ngs-container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgStoreContainerComponent<T> implements OnDestroy {

  /****************************************************************** BINDINGS ******************************************************************/

  @Input()
  public get query$(): Observable<string | null> { return this._query$; }
  public set query$(value: Observable<any>) {
    this._query$ = value && value.pipe(mapToError(), shareReplay(1));
    this.loaded$ = this._query$.pipe(map(x => x === null), distinctUntilChanged());
  }

  @Input()
  public loaded$!: Observable<boolean>

  @Input()
  public get data$(): Observable<T> { return this._data$; }
  public set data$(value: Observable<T>) { this._data$ = value && value.pipe(shareReplay(1)); }

  @Input()
  public loaderType: LoaderType = 'component';

  @Input()
  public loaderSize: string = this.config.initialLoaderSize || '1rem';

  @Input()
  public loaderText: string = (this.config.defaultLoaderText && this.config.defaultLoaderText()) || 'Loading...';

  @Input()
  public loaderTemplate: TemplateRef<any> | null = null;

  @Input()
  public errorTemplate: TemplateRef<any> | null = null;

  @ContentChild(TemplateRef)
  public template!: TemplateRef<any>;

  @Output()
  public changed: EventEmitter<T> = new EventEmitter<T>();

  /****************************************************************** VARIABLES ******************************************************************/

  private _query$!: Observable<string | null>;
  private _data$!: Observable<T>;
  private _subscription: Subscription | null = null;

  /****************************************************************** LIFE CYCLE ******************************************************************/

  constructor(
    @Inject(NG_STORE_CONFIG) public config: StoreConfiguration,
    private _cdr: ChangeDetectorRef
  ) { }

  public ngOnChanges(): void {
    this._subscription?.unsubscribe();

    if (this.data$ && this.loaded$) {
      this._subscription = this.loaded$.pipe(
        filter(x => x === true),
        distinctUntilChanged(),
        switchMap(() => this.data$),
        distinctUntilChanged(),
        tap(data => this.changed.emit(data)),
        delay(0)
      ).subscribe(() => this._cdr.markForCheck());
    }
  }

  public ngOnDestroy(): void {
    this._subscription?.unsubscribe();
  }

}
