import { DestroyRef, inject, Signal, signal, WritableSignal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { finalize, Observable } from "rxjs";
import { StoreConfiguration } from "./store-configuration.model";
import { NG_STORE_CONFIG } from "../tokens";

export type QueryActionData<TQuery, TData, TConvertedData = TData> = Readonly<{
  data: (data: TQuery) => Observable<TData>;
  query: () => Observable<TQuery>;
  converter?: (data: TData) => TConvertedData;
  changed?: (data: TConvertedData, firstTime: boolean) => void;
}>;

export class QueryAction<TQuery, TData, TConvertedData = TData> {

  /** @internal - Used by library components to update the processing state */
  public readonly _processing: WritableSignal<boolean> = signal(false);

  public readonly query: () => Observable<TQuery>;
  public readonly data: (data: TQuery) => Observable<TData>;
  public readonly converter: (data: TData) => TConvertedData;
  public readonly changed: ((data: TConvertedData, firstTime: boolean) => void) | null;
  public readonly processing: Signal<boolean> = this._processing.asReadonly();

  constructor(settings: QueryActionData<TQuery, TData, TConvertedData>) {
    this.query = settings.query;
    this.data = settings.data;
    this.converter = settings.converter ?? ((d: TData) => d as unknown as TConvertedData);
    this.changed = settings.changed ?? null;
  }
}

type ExecuteActionData<TQuery, TResult> = Readonly<{
  query: (data: TQuery) => Observable<TResult>;
  success?: (data: TResult) => void;
  error?: (data: Error) => void;
}>;

export class ExecuteAction<TQueryData = void, TResult = unknown> {
  private readonly _config = inject<StoreConfiguration>(NG_STORE_CONFIG);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _error: ((data: Error) => void) | null;
  private readonly _processing: WritableSignal<boolean> = signal(false);
  private readonly _query: (data: TQueryData) => Observable<TResult>;
  private readonly _success: ((data: TResult) => void) | null;

  public readonly processing: Signal<boolean> = this._processing.asReadonly();

  constructor(settings: ExecuteActionData<TQueryData, TResult>) {
    this._query = settings.query;
    this._success = settings.success ?? null;
    this._error = settings.error ?? this._config.defaultExecuteActionErrorHandler ?? null;
  }

  public execute(data: TQueryData): void {
    if (this._processing()) {
      return;
    }

    this._processing.set(true);

    this._query(data)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => this._processing.set(false))
      )
      .subscribe({
        next: data => this._success && this._success(data),
        error: err => this._error && this._error(err instanceof Error ? err : new Error(err))
      });
  }
}
