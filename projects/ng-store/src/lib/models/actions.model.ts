import { DestroyRef, inject, Signal, signal, WritableSignal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { finalize, Observable } from "rxjs";
import { StoreConfiguration } from "./store-configuration.model";
import { NG_STORE_CONFIG } from "../tokens";

/**
 * Configuration options for creating a QueryAction.
 *
 * @template TQuery - The type of the query parameters
 * @template TData - The type of raw data returned from the data source
 * @template TConvertedData - The type after conversion (defaults to TData)
 */
export type QueryActionData<TQuery, TData, TConvertedData = TData> = Readonly<{
  /** Function that returns an observable of query parameters */
  data: (data: TQuery) => Observable<TData>;
  /** Function that fetches data based on query parameters */
  query: () => Observable<TQuery>;
  /** Optional function to transform the raw data into the desired format */
  converter?: (data: TData) => TConvertedData;
  /** Optional callback invoked when data changes */
  changed?: (data: TConvertedData, firstTime: boolean) => void;
}>;

/**
 * Represents a reactive query action that fetches data based on query parameters.
 * Used with the `ngs-container` component for declarative data loading.
 *
 * @template TQuery - The type of the query parameters
 * @template TData - The type of raw data returned from the data source
 * @template TConvertedData - The type after conversion (defaults to TData)
 *
 * @example
 * ```typescript
 * export class BookListComponent {
 *   readonly loadBooks = new QueryAction({
 *     query: () => this.route.params.pipe(map(p => p['authorId'])),
 *     data: (authorId) => this.store.loadEntities(
 *       `/api/authors/${authorId}/books`,
 *       s => s.books,
 *       s => this.store.findNullableValueByKey(s => s.authors, authorId),
 *       'booksLoaded'
 *     )
 *   });
 * }
 *
 * // In template:
 * <ngs-container [action]="loadBooks">
 *   <ng-template>
 *     <!-- Content shown when loaded -->
 *   </ng-template>
 * </ngs-container>
 * ```
 */
export class QueryAction<TQuery, TData, TConvertedData = TData> {

  /**
   * @internal - Used by library components to update the processing state.
   * Do not modify directly.
   */
  public readonly _processing: WritableSignal<boolean> = signal(false);

  /**
   * @internal - Used by library components to update the last converted result.
   * Do not modify directly.
   */
  public readonly _value: WritableSignal<TConvertedData | null> = signal(null);

  /** Function that returns an observable of query parameters */
  public readonly query: () => Observable<TQuery>;

  /** Function that fetches data based on query parameters */
  public readonly data: (data: TQuery) => Observable<TData>;

  /** Function to transform raw data into the desired format */
  public readonly converter: (data: TData) => TConvertedData;

  /** Callback invoked when data changes, or null if not provided */
  public readonly changed: ((data: TConvertedData, firstTime: boolean) => void) | null;

  /** Signal indicating whether the query is currently processing */
  public readonly processing: Signal<boolean> = this._processing.asReadonly();

  /**
   * Last converted result emitted by the action. Returns null until a result has been
   * emitted, and resets to null whenever the action restarts (e.g. when the container
   * re-executes it). When the `changed` callback is invoked, this signal already holds
   * the value passed to the callback.
   *
   * Note: if several containers consume the same QueryAction instance, each of them
   * writes this signal and the last write wins, exactly like `processing`.
   */
  public readonly value: Signal<TConvertedData | null> = this._value.asReadonly();

  /**
   * Creates a new QueryAction.
   *
   * @param settings - Configuration options for the query action
   */
  constructor(settings: QueryActionData<TQuery, TData, TConvertedData>) {
    this.query = settings.query;
    this.data = settings.data;
    this.converter = settings.converter ?? ((d: TData) => d as unknown as TConvertedData);
    this.changed = settings.changed ?? null;
  }
}

/**
 * Configuration options for creating an ExecuteAction.
 *
 * @template TQuery - The type of input data for the action
 * @template TResult - The type of result returned by the action
 */
type ExecuteActionData<TQuery, TResult> = Readonly<{
  /** Function that performs the action and returns an observable of the result */
  query: (data: TQuery) => Observable<TResult>;
  /** Optional callback invoked on successful completion */
  success?: (data: TResult) => void;
  /** Optional callback invoked on error */
  error?: (data: Error) => void;
}>;

/**
 * Represents an executable action that can be triggered with input data.
 * Automatically manages processing state and handles cleanup on component destruction.
 *
 * @template TQueryData - The type of input data (defaults to void for no-argument actions)
 * @template TResult - The type of result returned by the action
 *
 * @example
 * ```typescript
 * export class BookFormComponent {
 *   readonly saveBook = new ExecuteAction<Book, Book>({
 *     query: (book) => this.store.postEntity('/api/books', s => s.books, book),
 *     success: (savedBook) => {
 *       this.router.navigate(['/books', savedBook.id]);
 *     },
 *     error: (err) => {
 *       this.notificationService.showError('Failed to save book');
 *     }
 *   });
 *
 *   onSubmit(book: Book) {
 *     this.saveBook.execute(book);
 *   }
 * }
 *
 * // In template:
 * <button [disabled]="saveBook.processing()">
 *   {{ saveBook.processing() ? 'Saving...' : 'Save' }}
 * </button>
 * ```
 */
export class ExecuteAction<TQueryData = void, TResult = unknown> {
  private readonly _config = inject<StoreConfiguration>(NG_STORE_CONFIG);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _error: ((data: Error) => void) | null;
  private readonly _processing: WritableSignal<boolean> = signal(false);
  private readonly _processingData: WritableSignal<TQueryData | undefined> = signal(undefined);
  private readonly _query: (data: TQueryData) => Observable<TResult>;
  private readonly _success: ((data: TResult) => void) | null;

  /** Signal indicating whether the action is currently executing */
  public readonly processing: Signal<boolean> = this._processing.asReadonly();
  public readonly processingData: Signal<TQueryData | undefined> = this._processingData.asReadonly();

  /**
   * Creates a new ExecuteAction.
   *
   * @param settings - Configuration options for the execute action
   */
  constructor(settings: ExecuteActionData<TQueryData, TResult>) {
    this._query = settings.query;
    this._success = settings.success ?? null;
    this._error = settings.error ?? this._config.defaultExecuteActionErrorHandler ?? null;
  }

  /**
   * Executes the action with the provided data.
   * Does nothing if the action is already processing.
   *
   * @param data - Input data for the action
   *
   * @remarks
   * - The action will not execute if `processing()` is true
   * - The subscription is automatically cleaned up when the component is destroyed
   * - `processing` signal is set to true during execution and false when complete
   */
  public execute(data: TQueryData): void {
    if (this._processing()) {
      return;
    }

    this._processing.set(true);
    this._processingData.set(data);

    this._query(data)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this._processing.set(false);
          this._processingData.set(undefined);
        })
      )
      .subscribe({
        next: data => this._success && this._success(data),
        error: err => this._error && this._error(err instanceof Error ? err : new Error(err))
      });
  }
}
