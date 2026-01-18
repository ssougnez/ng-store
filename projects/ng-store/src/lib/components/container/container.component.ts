import { JsonPipe, NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, DestroyRef, Directive, InputSignal, Signal, TemplateRef, WritableSignal, contentChild, effect, inject, input, signal } from "@angular/core";
import { EMPTY, Subscription, distinctUntilChanged, map, switchMap } from "rxjs";
import { QueryAction, StoreConfiguration } from "../../models";
import { NG_STORE_CONFIG } from "../../tokens";
import { NgStoreErrorHostComponent } from "../error-host/error-host.component";
import { NgStoreLoaderHostComponent } from "../loader-host/loader-host.component";

export type LoaderTypeNext = 'component' | 'template' | 'text' | 'none';

type ContainerContextNext<T> = {
  ngsTemplate: T;
}

@Directive({
  standalone: true,
  selector: '[ngsTemplate]'
})
export class NgStoreTemplateDirective<TQuery = unknown, TData = unknown, TConvertedData = TData> {

  /****************************************************************** BINDINGS ******************************************************************/

  public ngsTemplate: InputSignal<QueryAction<TQuery, TData, TConvertedData> | undefined> = input<QueryAction<TQuery, TData, TConvertedData>>();

  /****************************************************************** STATIC ******************************************************************/

  static ngTemplateContextGuard<TQuery, TData, TContext>(directive: NgStoreTemplateDirective<TQuery, TData, TContext>, context: unknown): context is ContainerContextNext<TContext> {
    return true;
  }
}

@Component({
  selector: 'ngs-container',
  templateUrl: './container.component.html',
  styleUrl: './container.component.scss',
  imports: [
    JsonPipe,
    NgStoreErrorHostComponent,
    NgStoreLoaderHostComponent,
    NgTemplateOutlet
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgSignalStoreContainerComponent<TQuery, TData, TConvertedData = TData> {

  /****************************************************************** SERVICES ******************************************************************/

  protected readonly config: StoreConfiguration = inject(NG_STORE_CONFIG);

  private readonly _destroyRef: DestroyRef = inject(DestroyRef);

  /****************************************************************** BINDINGS ******************************************************************/

  public readonly template: Signal<TemplateRef<ContainerContextNext<TConvertedData>>> = contentChild.required(TemplateRef<ContainerContextNext<TConvertedData>>);

  public readonly action: InputSignal<QueryAction<TQuery, TData, TConvertedData>> = input.required<QueryAction<TQuery, TData, TConvertedData>>();
  public readonly errorTemplate: InputSignal<TemplateRef<unknown> | null> = input<TemplateRef<unknown> | null>(null);
  public readonly loaderSize: InputSignal<string> = input<string>(this.config.initialLoaderSize ?? '1rem');
  public readonly loaderTemplate: InputSignal<TemplateRef<unknown> | null> = input<TemplateRef<unknown> | null>(null);
  public readonly loaderText: InputSignal<string> = input<string>((this.config.defaultLoaderText && this.config.defaultLoaderText()) || 'Loading...');
  public readonly loaderType: InputSignal<LoaderTypeNext> = input<LoaderTypeNext>('component');

  /****************************************************************** SIGNALS ******************************************************************/

  protected readonly data: WritableSignal<TConvertedData | null> = signal(null);
  protected readonly error: WritableSignal<Error | null> = signal(null);
  protected readonly loading: WritableSignal<boolean> = signal(false);

  /****************************************************************** VARIABLES ******************************************************************/

  private _querySubscription: Subscription | null = null;

  /****************************************************************** LIFE CYCLE ******************************************************************/

  constructor() {
    effect(() => {
      const action = this.action();

      this._trackDependencies(action);
      this._handleAction(action);
    });

    this._destroyRef.onDestroy(() => this._clean());
  }

  /** */
  private _trackDependencies(action: QueryAction<TQuery, TData, TConvertedData>): void {
    try {
      action.data(undefined as unknown as TQuery);
    } catch { }
  }

  /** */
  private _handleAction(action: QueryAction<TQuery, TData, TConvertedData>) {
    this._clean();

    this.data.set(null);
    this.error.set(null);
    this.loading.set(false);

    action._processing.set(false);

    const query = action.query();

    if (query) {
      this.loading.set(true);

      action._processing.set(true);

      this._querySubscription = query.pipe(
        switchMap(queryResult => {
          this.loading.set(false);

          action._processing.set(false);

          const data = action.data(queryResult);

          if (!data) {
            return EMPTY;
          }

          let firstTime = true;

          return data.pipe(
            distinctUntilChanged(),
            map(rawData => {
              const isFirstTime = firstTime;

              firstTime = false;

              return { rawData, isFirstTime };
            })
          );
        })
      ).subscribe({
        next: ({ rawData, isFirstTime }) => {
          try {
            const converted = action.converter(rawData);

            this.data.set(converted);

            if (action.changed !== null) {
              action.changed(converted, isFirstTime);
            }
          } catch (err) {
            this.loading.set(false);

            action._processing.set(false);

            this.error.set(err instanceof Error ? err : new Error(String(err)));
          }
        },
        error: (err: Error) => {
          this.loading.set(false);

          action._processing.set(false);

          this.error.set(err);
        }
      });
    }
  }

  /****************************************************************** PRIVATE ******************************************************************/

  /** */
  private _clean(): void {
    this._querySubscription?.unsubscribe();
  }
}
