import { inject, Injectable } from '@angular/core';
import { filterArray, mapArray } from '../operators';
import { produce } from 'immer';
import { BehaviorSubject, catchError, distinctUntilChanged, filter, finalize, map, Observable, of, share, take, tap, throwError } from 'rxjs';
import {
  BaseEntity,
  BooleanProperties,
  Entities,
  Entity,
  EntityOf,
  EntityStateOption,
  ExternalCall,
  IHttpClient,
  IndexOf,
  LoadableFlags,
  OnlyBoolean,
  StoreConfiguration,
  StoreEntity
} from '../models';
import { NG_STORE_CONFIG } from '../tokens';

/**
 * Creates a new Entity wrapper for a value.
 *
 * @template T - The type of value to wrap
 * @param value - The value to wrap in an Entity
 * @returns A new Entity containing the value with loaded state
 *
 * @example
 * ```typescript
 * const bookEntity = createEntity({ id: 1, title: 'Angular Guide' });
 * // { loaded: true, value: { id: 1, title: 'Angular Guide' } }
 * ```
 */
export const createEntity = <T>(value: T): Entity<T> => {
  return {
    loaded: !!value,
    value: value
  }
}

/**
 * Creates a new Entities collection with optional initial values and indices.
 *
 * @template T - The entity type (must extend BaseEntity)
 * @param values - Initial values to populate the collection (default: [])
 * @param indices - Property names to create indices on for O(1) lookups (default: [])
 * @returns A new Entities collection with internal indexing structures
 *
 * @example
 * ```typescript
 * // Create an empty collection with an index on 'authorId'
 * const books = createEntities<Book>([], ['authorId']);
 *
 * // Create a pre-populated collection
 * const books = createEntities<Book>([book1, book2], ['authorId', 'category']);
 * ```
 */
export const createEntities = <T extends BaseEntity<T['id']>>(values: T[] = [], indices: IndexOf<T>[] = []): Entities<T> => {
  const entities: Entities<T> = {
    _array: values.map(value => createEntity(value)),
    _indices: {},
    _entities: new Map<T['id'], number>(),
    _indiceNames: new Set<string>(indices),

    loaded: false
  }

  for (const index of indices) {
    entities._indices[index] = new Map<unknown, number[]>();
  }

  for (let i = 0, length = entities._array.length; i < length; ++i) {
    const entity = entities._array[i];

    entities._entities.set(entity.value.id, i);

    for (const index of indices) {
      const value = entity.value[index];
      const map = entities._indices[index];

      if (map.has(value)) {
        map.get(value)!.push(i);
      }
      else {
        map.set(value, [i]);
      }
    }
  }

  return entities;
}

/**
 * Creates a selector function that retrieves a value by its key from an Entities collection.
 *
 * @template TStore - The store type
 * @template T - The entity type (must extend BaseEntity)
 * @param root - Selector to locate the Entities collection in the store
 * @param key - The entity key to search for
 * @returns A selector function that returns the value or null if not found
 *
 * @example
 * ```typescript
 * const getBook = findStoreValueByKey(s => s.books, 123);
 * const book = getBook(store.value); // Book | null
 * ```
 */
export const findStoreValueByKey = <TStore, T extends BaseEntity<T['id']>>(
  root: (s: TStore) => Entities<T>,
  key: T['id']
): ((s: TStore) => T | null) => {
  return (s: TStore): T | null => {
    const entities = root(s);
    const position = entities._entities.get(key);

    return position === undefined ? null : (entities._array[position]?.value ?? null);
  }
}

/**
 * Checks if a value is undefined. Used internally for sparse array handling.
 *
 * The store uses sparse arrays (with undefined holes) when deleting entities.
 * This is an Immer optimization - using `delete array[i]` only marks specific
 * deleted items as changed, whereas array compaction would mark ALL entities
 * as changed due to position updates in _entities and _indices Maps.
 *
 * @internal
 */
function _isUndefined(value: any): boolean {
  return typeof value === 'undefined';
}

/**
 * Angular service providing reactive state management with Immer for immutable updates.
 *
 * NgStore manages collections of entities with built-in support for:
 * - O(1) entity lookups via internal indexing
 * - Loading states management
 * - HTTP operations (GET, POST, PUT, DELETE)
 * - Reactive selectors with RxJS
 * - Batch updates for atomic operations
 *
 * @template TStore - The type of the store state
 *
 * @example
 * ```typescript
 * // Define your store state
 * interface AppStore {
 *   books: Entities<Book>;
 *   authors: Entities<Author>;
 *   ui: Entity<UiState>;
 * }
 *
 * // Inject and use the store
 * export class BookService {
 *   private store = inject(NgStore<AppStore>);
 *
 *   readonly books$ = this.store.selectValues(s => s.books);
 *
 *   loadBooks() {
 *     return this.store.loadAllEntities('/api/books', s => s.books);
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class NgStore<TStore> {

  /****************************************************************** VARIABLES ******************************************************************/

  private _batchedState: TStore | null = null;
  private _config = inject(NG_STORE_CONFIG);
  private _executedQueries: Set<string> = new Set<string>();
  private _executedQueriesSubject: BehaviorSubject<Set<string>> = new BehaviorSubject<Set<string>>(this._executedQueries);
  private _executingQueries: Map<string, Observable<any>> = new Map<string, Observable<any>>();
  private _http = inject(this._config.httpClientType);
  private _isBatching: boolean = false;
  private _root: Observable<TStore>;
  private _store = new BehaviorSubject(this._config.initialValue as TStore);

  /** Observable emitting the set of executed query URLs. Useful for tracking which data has been loaded. */
  public readonly executedQueries$: Observable<Set<string>> = this._executedQueriesSubject.asObservable();

  /********************************************************************** ACCESSORS **********************************************************************/

  /** The configured HTTP client instance. */
  public get httpClient(): IHttpClient { return this._http; }

  /** Observable of the entire store state. Emits on every state change. */
  public get root(): Observable<TStore> { return this._root; }

  /** Current snapshot of the store state. During a batch, returns the batched state. */
  public get value(): TStore { return this._isBatching && this._batchedState !== null ? this._batchedState : this._store.value; }

  /****************************************************************** LIFE CYCLE ******************************************************************/

  constructor() {
    this._root = this._store.asObservable();
  }

  /********************************************************************** PUBLIC **********************************************************************/

  /**
   * Executes multiple store operations as a single atomic update.
   * Subscribers are notified only once at the end of the batch, improving performance
   * when making multiple changes.
   *
   * @param operations - Function containing the store operations to batch
   *
   * @remarks
   * - Nested batches are supported (inner batch executes normally within outer batch)
   * - If an exception occurs, changes are not committed (implicit rollback)
   * - No notification is sent if no changes were made
   *
   * @example
   * ```typescript
   * // Without batch: 3 notifications
   * store.upsertValue(s => s.books, book1);
   * store.upsertValue(s => s.books, book2);
   * store.removeEntitiesByKeys(s => s.authors, oldAuthorId);
   *
   * // With batch: 1 notification
   * store.batch(() => {
   *   store.upsertValue(s => s.books, book1);
   *   store.upsertValue(s => s.books, book2);
   *   store.removeEntitiesByKeys(s => s.authors, oldAuthorId);
   * });
   * ```
   */
  public batch(operations: () => void): void {
    if (this._isBatching) {
      operations();

      return;
    }

    this._isBatching = true;
    this._batchedState = this._store.value;

    try {
      operations();
    } finally {
      const finalState = this._batchedState;

      this._isBatching = false;
      this._batchedState = null;

      if (finalState !== null && finalState !== this._store.value) {
        this._store.next(finalState);
      }
    }
  }

  /**
   * Removes all entities from a collection.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection to clear
   *
   * @example
   * ```typescript
   * store.clear(s => s.books);
   * ```
   */
  public clear<T extends BaseEntity<T['id']>>(selector: (s: TStore) => Entities<T>) {
    this.removeValuesBy(selector, () => true);
  }

  /**
   * Finds the first value matching a predicate (synchronous).
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param predicate - Function to test each value
   * @param store - Optional store snapshot to search in (defaults to current state)
   * @returns The first matching value or null if not found
   *
   * @example
   * ```typescript
   * const book = store.findValueBy(s => s.books, b => b.title.includes('Angular'));
   * ```
   */
  public findValueBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: T) => boolean,
    store: TStore = this.value
  ): T | null {
    return selector(store)._array.find(e => _isUndefined(e) === false && predicate(e.value))?.value || null;
  }

  /**
   * Finds the first value by an indexed property (synchronous). O(1) lookup.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param index - Name of the indexed property
   * @param value - Value to search for in the index
   * @param store - Optional store snapshot to search in (defaults to current state)
   * @returns The first matching value or null if not found
   * @throws Error if the specified index does not exist
   *
   * @example
   * ```typescript
   * // Assuming 'authorId' is an indexed property
   * const book = store.findValueByIndex(s => s.books, 'authorId', 42);
   * ```
   */
  public findValueByIndex<S extends (s: TStore) => Entities<any>, K extends Extract<keyof EntityOf<S, TStore>, string>>(
    selector: S,
    index: K,
    value: EntityOf<S, TStore>[K],
    store: TStore = this.value
  ): EntityOf<S, TStore> | null {
    const root = selector(store);
    const indexMap = root._indices[index];

    if (!indexMap) {
      throw new Error(`Index "${index}" is not defined. Available indices: ${[...root._indiceNames].join(', ') || 'none'}`);
    }

    const array = indexMap.get(value);
    const position = array && array.length !== 0 ? array[0] : null;

    return position !== null ? root._array[position].value as EntityOf<S, TStore> : null;
  }

  /**
   * Finds a value by its key (synchronous). O(1) lookup using internal index.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param key - The entity key to search for
   * @param store - Optional store snapshot to search in (defaults to current state)
   * @returns The value or null if not found
   *
   * @example
   * ```typescript
   * const book = store.findValueByKey(s => s.books, 123);
   * ```
   */
  public findValueByKey<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id'],
    store: TStore = this.value
  ): T | null {
    return this._findEntityByKey(selector, key, store)?.value || null;
  }

  /**
   * Finds all values matching a predicate (synchronous).
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param predicate - Function to test each value
   * @param store - Optional store snapshot to search in (defaults to current state)
   * @returns Array of matching values (may be empty)
   *
   * @example
   * ```typescript
   * const expensiveBooks = store.findValuesBy(s => s.books, b => b.price > 50);
   * ```
   */
  public findValuesBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: T) => boolean,
    store: TStore = this.value
  ): T[] {
    const array = selector(store)._array;
    const result: T[] = [];

    for (const e of array) {
      if (_isUndefined(e) === false && predicate(e.value)) {
        result.push(e.value);
      }
    }

    return result;
  }

  /**
   * Finds all values by an indexed property (synchronous). O(1) lookup.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param index - Name of the indexed property
   * @param value - Value to search for in the index
   * @param store - Optional store snapshot to search in (defaults to current state)
   * @returns Array of matching values (may be empty)
   * @throws Error if the specified index does not exist
   *
   * @example
   * ```typescript
   * // Get all books by author ID (assuming 'authorId' is indexed)
   * const authorBooks = store.findValuesByIndex(s => s.books, 'authorId', 42);
   * ```
   */
  public findValuesByIndex<S extends (s: TStore) => Entities<any>, K extends Extract<keyof EntityOf<S, TStore>, string>>(
    selector: S,
    index: K,
    value: EntityOf<S, TStore>[K],
    store: TStore = this.value
  ): EntityOf<S, TStore>[] {
    const root = selector(store);
    const indexMap = root._indices[index];

    if (!indexMap) {
      throw new Error(`Index "${index}" is not defined. Available indices: ${[...root._indiceNames].join(', ') || 'none'}`);
    }

    const array = indexMap.get(value) ?? [];
    const result: EntityOf<S, TStore>[] = [];

    for (const position of array) {
      result.push(root._array[position].value);
    }

    return result;
  }

  /**
   * Gets all values from a collection (synchronous).
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param store - Optional store snapshot to read from (defaults to current state)
   * @returns Array of all values in the collection
   *
   * @example
   * ```typescript
   * const allBooks = store.getValues(s => s.books);
   * ```
   */
  public getValues<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    store: TStore = this.value
  ): T[] {
    const array = selector(store)._array;
    const result: T[] = [];

    for (const e of array) {
      if (_isUndefined(e) === false) {
        result.push(e.value);
      }
    }

    return result;
  }

  /**
   * Checks if an entity with the given key exists in the collection.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param key - The entity key to check
   * @returns True if the entity exists, false otherwise
   *
   * @example
   * ```typescript
   * if (store.hasEntity(s => s.books, bookId)) {
   *   // Book exists
   * }
   * ```
   */
  public hasEntity<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id']
  ): boolean {
    return selector(this.value)._entities.has(key);
  }

  /**
   * Returns an observable that emits `true` when the collection is loaded, then completes.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @returns Observable that emits true when loaded
   *
   * @deprecated This method will be removed in v3. Use `select(s => s.collection.loaded)` instead.
   */
  public isLoaded<T extends BaseEntity<T['id']>>(selector: (s: TStore) => Entities<T>): Observable<boolean> {
    return this.select(selector)
      .pipe(
        map(entity => entity.loaded),
        filter((loaded: boolean | null) => loaded === true),
        map(() => true),
        take(1)
      );
  }

  /**
   * Returns an observable that emits whether a specific query URL has been executed.
   *
   * @param query - The query URL to check
   * @returns Observable emitting true if the query has been executed
   *
   * @example
   * ```typescript
   * store.isQueryExecuted('/api/books').subscribe(executed => {
   *   if (executed) {
   *     console.log('Books have been loaded');
   *   }
   * });
   * ```
   */
  public isQueryExecuted(query: string): Observable<boolean> {
    return this.executedQueries$.pipe(map(queries => queries.has(query)), distinctUntilChanged());
  }

  /**
   * Removes all values matching a predicate from the collection.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param predicate - Function to determine which values to remove
   *
   * @example
   * ```typescript
   * // Remove all books with rating below 3
   * store.removeValuesBy(s => s.books, b => b.rating < 3);
   * ```
   */
  public removeValuesBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: T) => boolean
  ) {
    const ids = this.findValuesBy(selector, predicate).map(v => v.id);

    this.removeEntitiesByKeys(selector, ...ids);
  }

  /**
   * Removes entities from the collection by their keys.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param keys - Keys of entities to remove
   *
   * @remarks
   * This operation creates sparse array holes for Immer optimization.
   * Use `compact()` periodically if many deletions accumulate.
   *
   * @example
   * ```typescript
   * store.removeEntitiesByKeys(s => s.books, 1, 2, 3);
   * ```
   */
  public removeEntitiesByKeys<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    ...keys: T['id'][]
  ) {
    const root = selector(this.value);

    keys = keys.filter(k => root._entities.has(k));

    if (keys.length !== 0) {
      this.update((draft, state) => {
        const snapshotRoot = selector(state);
        const draftRoot = selector(draft);

        for (const key of keys) {
          const position = snapshotRoot._entities.get(key);

          if (position === undefined) {
            continue;
          }

          const entity = snapshotRoot._array[position];

          if (_isUndefined(entity)) {
            continue;
          }

          draftRoot._entities.delete(key);

          for (const index of snapshotRoot._indiceNames) {
            const value = (entity.value as Record<string, unknown>)[index];
            const mapArray = (draftRoot._indices[index].get(value) || []).filter(p => p !== position);

            draftRoot._indices[index].set(value, mapArray);
          }

          delete draftRoot._array[position];
        }
      });
    }
  }

  /**
   * Creates a reactive selector for a part of the store.
   *
   * @template T - The selected type
   * @param selector - Function to select a part of the store
   * @returns Observable emitting the selected value, with distinct emissions only
   *
   * @example
   * ```typescript
   * // Select a primitive value
   * const bookCount$ = store.select(s => s.books._array.length);
   *
   * // Select a nested object
   * const uiState$ = store.select(s => s.ui.value);
   * ```
   */
  public select<T>(selector: (s: TStore) => T): Observable<T> {
    return this.root
      .pipe(
        map(s => selector(s)),
        distinctUntilChanged()
      );
  }

  /**
   * Returns an observable of all values in a collection.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @returns Observable emitting array of values
   *
   * @example
   * ```typescript
   * store.selectValues(s => s.books).subscribe(books => {
   *   books.forEach(book => console.log(book.title));
   * });
   * ```
   */
  public selectValues<T extends BaseEntity<T['id']>>(selector: (s: TStore) => Entities<T>): Observable<T[]> {
    return this.select(selector)
      .pipe(
        map(root => root._array),
        distinctUntilChanged(),
        filterArray(e => _isUndefined(e) === false, false),
        mapArray(e => e.value)
      );
  }

  /**
   * Returns an observable of values matching a predicate.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param filter - Function to filter values
   * @returns Observable emitting array of matching values
   *
   * @example
   * ```typescript
   * store.selectValuesBy(s => s.books, b => b.published).subscribe(publishedBooks => {
   *   // ...
   * });
   * ```
   */
  public selectValuesBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    filter: (item: T) => boolean
  ): Observable<T[]> {
    return this.selectValues(selector).pipe(filterArray(filter));
  }

  /**
   * Returns an observable of values by an indexed property. O(1) lookup.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param index - Name of the indexed property
   * @param value - Value to search for in the index
   * @returns Observable emitting array of matching values
   * @throws Error if the specified index does not exist
   *
   * @example
   * ```typescript
   * // Get all books by category (assuming 'category' is indexed)
   * store.selectValuesByIndex(s => s.books, 'category', 'fiction').subscribe(books => {
   *   // ...
   * });
   * ```
   */
  public selectValuesByIndex<S extends (s: TStore) => Entities<any>, K extends Extract<keyof EntityOf<S, TStore>, string>>(
    selector: S,
    index: K,
    value: EntityOf<S, TStore>[K]
  ): Observable<EntityOf<S, TStore>[]> {
    return this.select(selector)
      .pipe(
        distinctUntilChanged((prev, curr) => prev._array === curr._array),
        map(root => {
          const indexMap = root._indices[index];

          if (!indexMap) {
            throw new Error(`Index "${index}" is not defined. Available indices: ${[...root._indiceNames].join(', ') || 'none'}`);
          }

          return (indexMap.get(value) || []).map(p => root._array[p].value as EntityOf<S, TStore>);
        })
      );
  }

  /**
   * Returns an observable of the first value by an indexed property. O(1) lookup.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param index - Name of the indexed property
   * @param value - Value to search for in the index
   * @returns Observable emitting the first matching value or null
   * @throws Error if the specified index does not exist
   */
  public selectValueByIndex<S extends (s: TStore) => Entities<any>, K extends Extract<keyof EntityOf<S, TStore>, string>>(
    selector: S,
    index: K,
    value: EntityOf<S, TStore>[K]
  ): Observable<EntityOf<S, TStore> | null> {
    return this.selectValuesByIndex(selector, index, value)
      .pipe(
        map(values => values[0] || null)
      );
  }

  /**
   * Returns an observable of a single Entity's value.
   *
   * @template T - The value type
   * @param selector - Selector to locate the Entity
   * @returns Observable emitting the value
   *
   * @example
   * ```typescript
   * store.selectValue(s => s.currentUser).subscribe(user => {
   *   console.log(user.name);
   * });
   * ```
   */
  public selectValue<T>(selector: (s: TStore) => Entity<T>): Observable<T> {
    return this.select(selector)
      .pipe(
        map(e => e.value),
        distinctUntilChanged()
      )
  }

  /**
   * Returns an observable of the first value matching a predicate.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param predicate - Function to find the value
   * @returns Observable emitting the first matching value or null
   *
   * @example
   * ```typescript
   * store.selectValueBy(s => s.books, b => b.featured).subscribe(featured => {
   *   // ...
   * });
   * ```
   */
  public selectValueBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: T) => boolean
  ): Observable<T | null> {
    return this.selectValuesBy(selector, predicate)
      .pipe(
        map(items => items[0] || null),
        distinctUntilChanged()
      );
  }

  /**
   * Returns an observable of a value by its key. O(1) lookup.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param key - The entity key to find
   * @returns Observable emitting the value or null if not found
   *
   * @example
   * ```typescript
   * store.selectValueByKey(s => s.books, 123).subscribe(book => {
   *   if (book) {
   *     console.log(book.title);
   *   }
   * });
   * ```
   */
  public selectValueByKey<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id']
  ): Observable<T | null> {
    return this.select(selector)
      .pipe(
        map(e => {
          const position = e._entities.get(key);

          return position === undefined ? null : (e._array[position]?.value || null);
        }),
        distinctUntilChanged()
      )
  }

  /**
   * Updates the store state using Immer's produce function.
   *
   * @param updater - Function that mutates the draft state
   *
   * @remarks
   * The updater receives two parameters:
   * - `draft`: Mutable draft of the state (mutate this directly)
   * - `original`: Read-only original state (for reference)
   *
   * @example
   * ```typescript
   * store.update((draft, original) => {
   *   draft.ui.value.loading = true;
   *   draft.ui.value.lastUpdated = new Date();
   * });
   * ```
   */
  public update(updater: (draft: TStore, original: TStore) => void) {
    const baseState = this.value;

    // DO NOT REMOVE THE BRACKETS FOR THE SECOND PARAMETER AS BECAUSE OF CURRYING IT WOULD MEAN SOMETHING ELSE
    const nextState = produce(baseState, draft => { updater(draft as TStore, baseState); });

    if (this._isBatching) {
      this._batchedState = nextState;
    } else {
      this._store.next(nextState);
    }
  }

  /**
   * Updates all entities matching a predicate.
   *
   * @template T - The entity type
   * @param root - Selector to locate the Entities collection
   * @param selector - Predicate to select entities to update
   * @param updater - Function to update each matching entity
   *
   * @example
   * ```typescript
   * // Mark all unloaded entities as loading
   * store.updateEntitiesBy(
   *   s => s.books,
   *   e => !e.loaded,
   *   e => { e.loaded = true; }
   * );
   * ```
   */
  public updateEntitiesBy<T extends BaseEntity<T['id']>>(
    root: (s: TStore) => Entities<T>,
    selector: (item: Entity<T>) => boolean,
    updater: (item: Entity<T>) => void
  ) {
    this.update((d, s) => {
      const entities = root(s);
      const ids: T['id'][] = [];

      for (const e of entities._array) {
        if (selector(e) === true) {
          ids.push(e.value.id);
        }
      }

      for (const id of ids) {
        this._updateEntityByKey(d, s, root, id, updater);
      }
    });
  }

  /**
   * Updates an entity by its key.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param key - Key of the entity to update
   * @param updater - Function to update the entity
   *
   * @remarks
   * The entity's `id` property cannot be changed. Attempting to do so will throw an error.
   *
   * @example
   * ```typescript
   * store.updateEntityByKey(s => s.books, 123, entity => {
   *   entity.loaded = true;
   *   entity.value.title = 'New Title';
   * });
   * ```
   */
  public updateEntityByKey<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id'],
    updater: (item: Entity<T>) => void
  ) {
    this.update((d, s) => this._updateEntityByKey(d, s, selector, key, entity => updater(entity)));
  }

  /**
   * Updates a value by its key.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param key - Key of the value to update
   * @param updater - Function to update the value
   *
   * @remarks
   * The value's `id` property cannot be changed. Attempting to do so will throw an error.
   *
   * @example
   * ```typescript
   * store.updateValueByKey(s => s.books, 123, book => {
   *   book.title = 'Updated Title';
   *   book.price = 29.99;
   * });
   * ```
   */
  public updateValueByKey<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id'],
    updater: (item: T) => void
  ) {
    this.update((d, s) => this._updateEntityByKey(d, s, selector, key, entity => updater(entity.value)));
  }

  /**
   * Updates all values matching a predicate.
   *
   * @template T - The entity type
   * @param root - Selector to locate the Entities collection
   * @param selector - Predicate to select values to update
   * @param updater - Function to update each matching value
   *
   * @example
   * ```typescript
   * // Apply 10% discount to all expensive books
   * store.updateValuesBy(
   *   s => s.books,
   *   b => b.price > 50,
   *   b => { b.price *= 0.9; }
   * );
   * ```
   */
  public updateValuesBy<T extends BaseEntity<T['id']>>(
    root: (s: TStore) => Entities<T>,
    selector: (item: T) => boolean,
    updater: (item: T) => void
  ) {
    this.updateEntitiesBy(root, e => selector(e.value), e => updater(e.value));
  }

  /**
   * Inserts or updates multiple values in the collection.
   * If a value already exists (by id), it is merged with the new value.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param values - Values to upsert
   * @param state - Optional entity state options
   *
   * @example
   * ```typescript
   * store.upsertValues(s => s.books, [book1, book2, book3]);
   *
   * // With partial loading state
   * store.upsertValues(s => s.books, partialBooks, { loaded: false });
   * ```
   */
  public upsertValues<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    values: T[],
    state?: EntityStateOption
  ) {
    this.update(d => this._upsertEntities(selector(d), values, state || {}));
  }

  /**
   * Inserts or updates a single value in the collection.
   * If the value already exists (by id), it is merged with the new value.
   *
   * @template T - The entity type
   * @param selector - Selector to locate the Entities collection
   * @param value - Value to upsert
   * @param state - Optional entity state options
   *
   * @example
   * ```typescript
   * store.upsertValue(s => s.books, newBook);
   *
   * // Mark as not fully loaded
   * store.upsertValue(s => s.books, partialBook, { loaded: false });
   * ```
   */
  public upsertValue<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    value: T,
    state?: EntityStateOption
  ) {
    this.update(d => this._upsertEntities(selector(d), [value], state || {}));
  }

  /**
   * Deletes an entity via HTTP DELETE and removes it from the store.
   *
   * @template T - The entity type
   * @template TReturn - The HTTP response type (defaults to T)
   * @param url - URL to call for deletion
   * @param root - Selector to locate the Entities collection
   * @param key - Key of the entity to delete
   * @returns Observable of the HTTP response
   *
   * @remarks
   * The entity is removed from the store only after successful HTTP response.
   * Set `automaticDelete: false` in config to disable automatic removal.
   *
   * @example
   * ```typescript
   * store.deleteEntityByKey('/api/books/123', s => s.books, 123).subscribe({
   *   next: () => console.log('Deleted'),
   *   error: err => console.error('Failed to delete', err)
   * });
   * ```
   */
  public deleteEntityByKey<T extends BaseEntity<T['id']>, TReturn = T>(
    url: string,
    root: (s: TStore) => Entities<T>,
    key: T['id']
  ): Observable<TReturn> {
    return this._innerFrom(() => {
      const entity = this._findEntityByKey(root, key);

      if (entity === null) {
        return throwError(() => 'The entity was not found in the store');
      }

      const autoDelete = this._config.automaticDelete !== false;

      return this._http
        .delete<TReturn>(url)
        .pipe(
          tap(() => autoDelete && this.removeEntitiesByKeys(root, key))
        );
    });
  }

  /**
   * Loads multiple entities based on dependent entity keys.
   * Useful for loading related data based on foreign keys.
   *
   * @template T - The entity type to load
   * @template TDependent - The dependent entity type
   * @template TData - The HTTP response data type
   * @param url - Base URL (ids will be appended as query params)
   * @param root - Selector for the collection to populate
   * @param dependentRoot - Selector for the dependent collection
   * @param dependentKeys - Keys of dependent entities to load data for
   * @param stateProperty - Boolean property on dependent entity tracking load state
   * @param entitiesLoaded - Whether loaded entities are considered fully loaded (default: true)
   * @param force - Bypass the loaded check (default: false)
   * @returns Observable of loaded entities
   */
  public loadBatchEntities<T extends BaseEntity<T['id']>, TDependent extends BaseEntity<TDependent['id']>, TData extends BaseEntity<TData['id']> = T>(
    url: string,
    root: (s: TStore) => Entities<T>,
    dependentRoot: (s: TStore) => Entities<TDependent>,
    dependentKeys: TDependent['id'][],
    stateProperty: BooleanProperties<TDependent>,
    entitiesLoaded: boolean = true,
    force: boolean = false
  ): Observable<T[]> {
    return this._innerFrom(() => {
      const entities = dependentKeys
        .map(k => ({ key: k, state: ((this.findValueByKey(dependentRoot, k) || {}) as OnlyBoolean<TDependent>)[stateProperty] }))
        .filter(i => _isUndefined(i.state) || i.state === false || force === true);

      if (entities.length !== 0) {
        this.update(d => {
          entities.forEach(e => {
            const value = this.findValueByKey(dependentRoot, e.key, d) as (OnlyBoolean<TDependent> | null);

            if (value !== null) {
              value[stateProperty] = null;
            }
          });
        });

        url = url.endsWith('/') === false ? `${url}/?ids=${entities.map(e => e.key).join('&ids=')}` : `${url}/?ids=${entities.map(e => e.key).join('&ids=')}`;

        const query = this._getLoadQuery<TData[]>(url);

        return query
          .pipe(
            map(data => data as unknown as T[]),
            tap(data => this.upsertValues(root, data, { loaded: entitiesLoaded })),
            tap(() => this.update(d => {
              entities.forEach(e => {
                const value = this.findValueByKey(dependentRoot, e.key, d) as (OnlyBoolean<TDependent> | null);

                if (value !== null) {
                  value[stateProperty] = true;
                }
              });
            })),
            catchError(err => {
              this.update(d => {
                entities.forEach(e => {
                  const value = this.findValueByKey(dependentRoot, e.key, d) as (OnlyBoolean<TDependent> | null);

                  if (value !== null) {
                    value[stateProperty] = e.state;
                  }
                });
              });

              return throwError(() => new Error(err));
            }),
            finalize(() => this._removeLoadQuery(url))
          )
      }

      return of([]);
    });
  }

  /**
   * Loads all entities from an HTTP endpoint into the collection.
   *
   * @template T - The entity type
   * @template TData - The HTTP response data type
   * @param url - URL to fetch from, or an ExternalCall configuration
   * @param root - Selector to locate the Entities collection
   * @param entitiesLoaded - Whether loaded entities are considered fully loaded (default: true)
   * @param force - Bypass the loaded check (default: false)
   * @returns Observable of loaded entities
   *
   * @remarks
   * - Sets `collection.loaded = null` while loading, then `true` on success
   * - On error, restores previous loaded state
   * - Skips HTTP call if already loaded (unless `force: true`)
   *
   * @example
   * ```typescript
   * store.loadAllEntities('/api/books', s => s.books).subscribe(books => {
   *   console.log(`Loaded ${books.length} books`);
   * });
   * ```
   */
  public loadAllEntities<T extends BaseEntity<T['id']>, TData extends BaseEntity<TData['id']> = T>(
    url: string | ExternalCall<(T | TData)[]>,
    root: (s: TStore) => Entities<T>,
    entitiesLoaded: boolean = true,
    force: boolean = false
  ): Observable<T[]> {
    return this._innerFrom(() => {
      const state = root(this.value).loaded;

      if (state !== true || force === true) {
        this.update(d => root(d).loaded = null);

        return this._getLoadQuery<(T | TData) | (T | TData)[]>(url)
          .pipe(
            map(data => Array.isArray(data) ? data : [data]),
            map((data: (T | TData)[]) => data as T[]),
            tap(data => this.upsertValues(root, data, { loaded: entitiesLoaded })),
            tap(() => this.update(d => { root(d).loaded = true; })),
            catchError(err => {
              this.update(d => { root(d).loaded = state; });

              return throwError(() => new Error(err));
            }),
            finalize(() => {
              this._removeLoadQuery(url);
            })
          );
      }

      return of(this.getValues(root));
    });
  }

  /**
   * Loads entities once based on URL tracking (not collection state).
   * Unlike loadAllEntities, this tracks by URL rather than collection.loaded.
   *
   * @template T - The entity type
   * @template TData - The HTTP response data type
   * @param url - URL to fetch from
   * @param root - Selector to locate the Entities collection
   * @param entitiesLoaded - Whether loaded entities are considered fully loaded (default: true)
   * @param force - Bypass the URL check (default: false)
   * @returns Observable of loaded entities
   *
   * @remarks
   * Use this when you want to load data once per URL, regardless of collection state.
   * The URL is tracked in `executedQueries$`.
   *
   * @example
   * ```typescript
   * // Load featured books once
   * store.loadEntitiesOnce('/api/books/featured', s => s.books).subscribe();
   *
   * // Check if loaded
   * store.isQueryExecuted('/api/books/featured').subscribe(loaded => { ... });
   * ```
   */
  public loadEntitiesOnce<T extends BaseEntity<T['id']>, TData extends BaseEntity<TData['id']> = T>(
    url: string,
    root: (s: TStore) => Entities<T>,
    entitiesLoaded: boolean = true,
    force: boolean = false
  ): Observable<T[]> {
    return this._innerFrom(() => {
      if (this._executedQueries.has(url) === false || force === true) {
        return this._getLoadQuery<(T | TData) | (T | TData)[]>(url)
          .pipe(
            map(data => Array.isArray(data) ? data : [data]),
            map((data: (T | TData)[]) => data as T[]),
            tap(data => this.upsertValues(root, data, { loaded: entitiesLoaded })),
            tap(() => {
              this._executedQueries.add(url);
              this._executedQueriesSubject.next(this._executedQueries);
            }),
            finalize(() => this._removeLoadQuery(url))
          )
      }

      return of([]);
    });
  }

  /**
   * Loads entities with state tracking on a dependent object.
   *
   * @template T - The entity type to load
   * @template TDependent - The dependent object type containing the state property
   * @template TData - The HTTP response data type
   * @param url - URL to fetch from, or an ExternalCall configuration
   * @param root - Selector for the collection to populate
   * @param dependentRoot - Selector for the object containing the state property
   * @param stateProperty - Boolean property name tracking the load state
   * @param entitiesLoaded - Whether loaded entities are considered fully loaded (default: true)
   * @param force - Bypass the loaded check (default: false)
   * @returns Observable of loaded entities
   *
   * @example
   * ```typescript
   * // Load author's books with state tracked on the author
   * store.loadEntities(
   *   `/api/authors/${authorId}/books`,
   *   s => s.books,
   *   s => s.authors._array.find(a => a.value.id === authorId)?.value,
   *   'booksLoaded'
   * ).subscribe();
   * ```
   */
  public loadEntities<T extends BaseEntity<T['id']>, TDependent extends { [K in keyof OnlyBoolean<TDependent>]?: boolean }, TData extends BaseEntity<TData['id']> = T>(
    url: string | ExternalCall<(T | TData)[]>,
    root: (s: TStore) => Entities<T>,
    dependentRoot: (s: TStore) => TDependent | null,
    stateProperty: BooleanProperties<TDependent>,
    entitiesLoaded: boolean = true,
    force: boolean = false
  ): Observable<T[]> {
    return this._innerFrom(() => {
      const dependentEntity = dependentRoot(this.value) as OnlyBoolean<TDependent>;

      if (dependentEntity === null) {
        throw new Error('The dependent entity could not be found!');
      }

      const state = dependentEntity[stateProperty];

      if (state !== true || force === true) {
        this.update(d => {
          (dependentRoot(d) as OnlyBoolean<TDependent>)[stateProperty] = null;
        });

        return this._getLoadQuery<(T | TData) | (T | TData)[]>(url)
          .pipe(
            map(data => Array.isArray(data) ? data : [data]),
            map((data: (T | TData)[]) => data as T[]),
            tap(data => this.upsertValues(root, data, { loaded: entitiesLoaded })),
            tap(() => dependentRoot && this.update(d => { (dependentRoot(d) as OnlyBoolean<TDependent>)[stateProperty] = true; })),
            catchError(err => {
              dependentRoot && this.update(d => { (dependentRoot(d) as OnlyBoolean<TDependent>)[stateProperty] = state; });

              return throwError(() => new Error(err));
            }),
            finalize(() => this._removeLoadQuery(url))
          )
      }

      return of([]);
    });
  }

  /**
   * Loads a single entity with state tracking on a dependent object.
   *
   * @template T - The entity type to load
   * @template TDependent - The dependent object type containing the state property
   * @template TData - The HTTP response data type
   * @param url - URL to fetch from, or an ExternalCall configuration
   * @param root - Selector for the collection to populate
   * @param dependentRoot - Selector for the object containing the state property
   * @param stateProperty - Boolean property name tracking the load state
   * @param entityLoaded - Whether the loaded entity is considered fully loaded (default: true)
   * @param force - Bypass the loaded check (default: false)
   * @returns Observable of the loaded entity or null
   */
  public loadEntity<T extends BaseEntity<T['id']>, TDependent extends LoadableFlags, TData extends BaseEntity<TData['id']> = T>(
    url: string | ExternalCall<(T | TData)>,
    root: (s: TStore) => Entities<T>,
    dependentRoot: (s: TStore) => TDependent,
    stateProperty: BooleanProperties<TDependent>,
    entityLoaded: boolean = true,
    force: boolean = false
  ): Observable<T | null> {
    return this._innerFrom(() => {
      const state = dependentRoot(this.value)[stateProperty];

      if (state !== true || force === true) {
        this.update(d => {
          (dependentRoot(d) as OnlyBoolean<TDependent>)[stateProperty] = null;
        });

        return this._getLoadQuery<T | TData>(url)
          .pipe(
            map((data: T | TData) => data as T),
            tap((data: T) => this.upsertValue(root, data, { loaded: entityLoaded })),
            tap(() => dependentRoot && this.update(d => { dependentRoot(d)[stateProperty] = true as any; })),
            catchError(err => {
              this.update(d => { (dependentRoot(d) as OnlyBoolean<TDependent>)[stateProperty] = state; });

              return throwError(() => new Error(err));
            }),
            finalize(() => this._removeLoadQuery(url))
          )
      }

      return of(null);
    });
  }

  /**
   * Loads an entity by a custom predicate.
   * Useful for loading a partially-loaded entity or fetching by criteria other than id.
   *
   * @template T - The entity type
   * @template TData - The HTTP response data type
   * @param url - URL to fetch from, or an ExternalCall configuration
   * @param root - Selector for the collection to populate
   * @param selector - Predicate to find the entity (if multiple match, first is used)
   * @param entityLoaded - Whether the loaded entity is considered fully loaded (default: true)
   * @param force - Bypass the loaded check (default: false)
   * @returns Observable of the loaded entity
   *
   * @example
   * ```typescript
   * // Load book by ISBN
   * store.loadEntityBy(
   *   `/api/books/isbn/${isbn}`,
   *   s => s.books,
   *   b => b.isbn === isbn
   * ).subscribe();
   * ```
   */
  public loadEntityBy<T extends BaseEntity<T['id']>, TData extends BaseEntity<TData['id']> = T>(
    url: string | ExternalCall<(T | TData)>,
    root: (s: TStore) => Entities<T>,
    selector: (item: T) => boolean,
    entityLoaded: boolean = true,
    force: boolean = false
  ): Observable<T> {
    return this._loadEntity(url, root, selector, entityLoaded, force);
  }

  /**
   * Loads an entity by its key.
   * Skips loading if entity exists and is already loaded (unless `force: true`).
   *
   * @template T - The entity type
   * @template TData - The HTTP response data type
   * @param url - URL to fetch from, or an ExternalCall configuration
   * @param root - Selector for the collection to populate
   * @param key - Key of the entity to load
   * @param entityLoaded - Whether the loaded entity is considered fully loaded (default: true)
   * @param force - Bypass the loaded check (default: false)
   * @returns Observable of the loaded entity
   *
   * @example
   * ```typescript
   * store.loadEntityByKey(`/api/books/${bookId}`, s => s.books, bookId).subscribe(book => {
   *   console.log('Loaded:', book.title);
   * });
   * ```
   */
  public loadEntityByKey<T extends BaseEntity<T['id']>, TData extends BaseEntity<TData['id']> = T>(
    url: string | ExternalCall<(T | TData)>,
    root: (s: TStore) => Entities<T>,
    key: T['id'],
    entityLoaded: boolean = true,
    force: boolean = false
  ): Observable<T> {
    return this._loadEntity(url, root, key, entityLoaded, force);
  }

  /**
   * Creates a new entity via HTTP POST and adds it to the store.
   *
   * @template T - The entity type
   * @template TResult - The HTTP response type (defaults to T)
   * @param url - URL to POST to
   * @param root - Selector for the collection to add the entity to
   * @param data - Data to send in the POST body
   * @returns Observable of the HTTP response
   *
   * @remarks
   * The response is automatically added to the store (unless `automaticPost: false` in config).
   *
   * @example
   * ```typescript
   * store.postEntity('/api/books', s => s.books, { title: 'New Book', authorId: 1 })
   *   .subscribe(createdBook => {
   *     console.log('Created book with id:', createdBook.id);
   *   });
   * ```
   */
  public postEntity<T extends BaseEntity<T['id']>, TResult = T>(
    url: string,
    root: (s: TStore) => Entities<T>,
    data: unknown
  ): Observable<TResult> {
    return this._innerFrom(() => {
      const autoInsert = this._config.automaticPost !== false;

      return this._http
        .post<TResult>(url, data)
        .pipe(
          tap(result => autoInsert && this.upsertValue(root, result as unknown as T))
        );
    });
  }

  /**
   * Updates all entities via HTTP PUT.
   *
   * @template T - The entity type
   * @template TResult - The HTTP response type (defaults to T)
   * @param url - URL to PUT to
   * @param root - Selector for the collection to update
   * @param data - Array of entities to send
   * @returns Observable of the HTTP response array
   *
   * @remarks
   * Response entities are automatically upserted (unless `automaticPut: false` in config).
   */
  public putAllEntities<T extends BaseEntity<T['id']>, TResult = T>(
    url: string,
    root: (s: TStore) => Entities<T>,
    data: BaseEntity<T['id']>[]
  ): Observable<TResult[]> {
    return this._innerFrom(() => {
      const autoInsert = this._config.automaticPut !== false;

      return this._http
        .put<TResult[]>(url, data)
        .pipe(
          tap(results => autoInsert && this.upsertValues(root, results as unknown as T[]))
        );
    });
  }

  /**
   * Updates an entity via HTTP PUT.
   *
   * @template T - The entity type
   * @template TResult - The HTTP response type (defaults to T)
   * @param url - URL to PUT to
   * @param root - Selector for the collection containing the entity
   * @param key - Key of the entity (for reference, not used in request)
   * @param data - Data to send in the PUT body
   * @returns Observable of the HTTP response
   *
   * @remarks
   * The response is automatically upserted (unless `automaticPut: false` in config).
   *
   * @example
   * ```typescript
   * store.putEntityByKey('/api/books/123', s => s.books, 123, updatedBook)
   *   .subscribe(result => {
   *     console.log('Updated:', result.title);
   *   });
   * ```
   */
  public putEntityByKey<T extends BaseEntity<T['id']>, TResult = T>(
    url: string,
    root: (s: TStore) => Entities<T>,
    key: T['id'] | null,
    data: unknown
  ): Observable<TResult> {
    return this._innerFrom(() => {
      const autoInsert = this._config.automaticPut !== false;

      return this._http
        .put<TResult>(url, data)
        .pipe(
          tap(result => autoInsert && this.upsertValue(root, result as unknown as T))
        );
    });
  }

  /**
   * Rebuilds all indices for a collection.
   * Use this if indices become corrupted or after manual array manipulation.
   *
   * @template T - The entity type
   * @param root - Selector for the collection to rebuild indices for
   *
   * @remarks
   * This is rarely needed during normal usage. The store maintains indices automatically.
   */
  public rebuildIndices<T extends BaseEntity<T['id']>>(
    root: (s: TStore) => Entities<T>
  ): void {
    this.update((store: TStore) => {
      const entities = root(store);

      for (const index of entities._indiceNames) {
        entities._indices[index] = new Map<any, number[]>();
      }

      for (let i = 0, length = entities._array.length; i < length; ++i) {
        const entity = entities._array[i];

        if (_isUndefined(entity)) {
          continue;
        }

        for (const index of entities._indiceNames) {
          const value = (entity.value as Record<string, unknown>)[index];
          const map = entities._indices[index];

          if (map.has(value)) {
            map.get(value)!.push(i);
          }
          else {
            map.set(value, [i]);
          }
        }
      }
    });
  }

  /**
   * Compacts the internal array by removing holes created by deletions.
   * Rebuilds `_array`, `_entities`, and `_indices` with consecutive positions.
   *
   * @template T - The entity type
   * @param root - Selector for the collection to compact
   * @returns The number of holes that were removed
   *
   * @remarks
   * - This operation marks all entities as changed, triggering all subscribers
   * - Use periodically when many deletions have accumulated
   * - The store uses sparse arrays (holes) for Immer optimization; compact reclaims memory
   *
   * @example
   * ```typescript
   * // After many deletions
   * const holesRemoved = store.compact(s => s.books);
   * console.log(`Removed ${holesRemoved} holes from array`);
   * ```
   */
  public compact<T extends BaseEntity<T['id']>>(
    root: (s: TStore) => Entities<T>
  ): number {
    const entities = root(this.value);
    const originalLength = entities._array.length;
    const actualCount = entities._array.filter(e => !_isUndefined(e)).length;
    const holesCount = originalLength - actualCount;

    if (holesCount === 0) {
      return 0;
    }

    this.update((store: TStore) => {
      const entities = root(store);

      // Rebuild array without holes
      const compactedArray: Entity<T>[] = [];

      for (let i = 0; i < entities._array.length; ++i) {
        const entity = entities._array[i];

        if (!_isUndefined(entity)) {
          compactedArray.push(entity);
        }
      }

      entities._array = compactedArray;

      // Rebuild _entities map with new positions
      entities._entities = new Map<T['id'], number>();

      for (let i = 0; i < entities._array.length; ++i) {
        entities._entities.set(entities._array[i].value.id, i);
      }

      // Rebuild indices with new positions
      for (const index of entities._indiceNames) {
        entities._indices[index] = new Map<any, number[]>();
      }

      for (let i = 0; i < entities._array.length; ++i) {
        const entity = entities._array[i];

        for (const index of entities._indiceNames) {
          const value = (entity.value as Record<string, unknown>)[index];
          const map = entities._indices[index];

          if (map.has(value)) {
            map.get(value)!.push(i);
          }
          else {
            map.set(value, [i]);
          }
        }
      }
    });

    return holesCount;
  }

  /********************************************************************** PRIVATE **********************************************************************/

  /** @internal Finds the first entity matching a predicate */
  private _findEntityBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: Entity<T>) => boolean,
    store: TStore = this.value
  ): Entity<T> | null {
    return selector(store)._array.find(e => _isUndefined(e) === false && predicate(e)) || null;
  }

  /** @internal Finds an entity by its key. O(1) lookup. */
  private _findEntityByKey<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id'],
    store: TStore = this.value
  ): Entity<T> | null {
    const root = selector(store);
    const position = root._entities.get(key);

    return position === undefined ? null : (root._array[position] || null);
  }

  /** @internal Sets entity state properties */
  private _setEntityState(root: StoreEntity, state: EntityStateOption) {
    Object.assign(root, state || {});
  }

  /** @internal Updates an entity by key within an Immer draft */
  private _updateEntityByKey<T extends BaseEntity<T['id']>>(
    draft: TStore,
    snapshot: TStore,
    selector: (s: TStore) => Entities<T>,
    key: T['id'],
    updater: (entity: Entity<T>) => void
  ) {
    const snapshotRoot = selector(snapshot);
    const draftRoot = selector(draft);

    if (snapshotRoot && snapshotRoot._entities.has(key)) {
      const position = snapshotRoot._entities.get(key)!;
      const entity = draftRoot._array[position];

      if (entity) {
        for (const index of snapshotRoot._indiceNames) {
          const value = (entity.value as Record<string, unknown>)[index];
          const array = (draftRoot._indices[index].get(value) || []).filter(p => p !== position);

          draftRoot._indices[index].set(value, array);
        }

        updater(entity);

        if (entity.value.id !== key) {
          throw new Error(`Changing entity id is not allowed. Original id: ${key}, new id: ${entity.value.id}. Use removeEntitiesByKeys() and upsertValue() instead.`);
        }

        for (const index of snapshotRoot._indiceNames) {
          const value = (entity.value as Record<string, unknown>)[index];

          if (draftRoot._indices[index].has(value)) {
            draftRoot._indices[index].get(value)!.push(position);
          }
          else {
            draftRoot._indices[index].set(value, [position]);
          }
        }
      }
    }
  }

  /** @internal Upserts multiple entities into a collection */
  private _upsertEntities<T extends BaseEntity<T['id']>>(
    root: Entities<T>,
    values: T[],
    state: EntityStateOption
  ) {
    for (const value of values) {
      const entityState = { ...state };
      const position = root._entities.get(value.id);
      const existing = position === undefined ? null : root._array[position];

      if (existing) {
        const position = root._entities.get(value.id)!;

        for (const index of root._indiceNames) {
          const valueAsRecord = value as Record<string, unknown>;
          const existingAsRecord = existing.value as Record<string, unknown>;

          if (index in value && valueAsRecord[index] !== existingAsRecord[index]) {
            const map = root._indices[index];

            const oldValue = existingAsRecord[index];
            const newValue = valueAsRecord[index];

            if (_isUndefined(oldValue) === false) {
              map.set(oldValue, (map.get(oldValue) || []).filter(p => p !== position));
            }

            map.set(newValue, (map.get(newValue) ?? []).concat(position));
          }
        }

        existing.value = { ...existing.value, ...value };

        if (entityState?.loaded === false && existing.loaded === true) {
          entityState.loaded = true;
        }

        this._setEntityState(existing, entityState);
      }
      else {
        const entity = createEntity(value);

        root._array.push(entity);

        const position = root._array.length - 1;

        root._entities.set(value.id, position);

        for (const index of root._indiceNames) {
          if (index in value) {
            const indexValue = (value as Record<string, unknown>)[index];
            const map = root._indices[index];

            if (map.has(indexValue)) {
              (map.get(indexValue) || []).push(position);
            }
            else {
              map.set(indexValue, [position]);
            }
          }
        }

        this._setEntityState(entity, state);
      }
    }
  }

  /** @internal Gets or creates a shared HTTP query observable */
  private _getLoadQuery<T>(data: string | ExternalCall<T>): Observable<T> {
    let query = this._executingQueries.get(typeof data == 'string' ? data : data.key);

    if (!query) {
      query = typeof data == 'string' ? this._http.get<T>(data).pipe(share()) : data.observable.pipe(share());

      this._executingQueries.set(typeof data == 'string' ? data : data.key, query);
    }

    return query;
  }

  /** @internal Wraps an observable factory for lazy execution */
  private _innerFrom<T>(inner: () => Observable<T>): Observable<T> {
    return new Observable<T>(observer => {
      const s = inner().subscribe({
        next: x => observer.next(x),
        error: err => observer.error(err),
        complete: () => observer.complete()
      });

      return {
        unsubscribe: () => s.unsubscribe()
      }
    })
  }

  /** @internal Loads a single entity by key or predicate */
  private _loadEntity<T extends BaseEntity<T['id']>, TData extends BaseEntity<TData['id']> = T>(
    url: string | ExternalCall<(T | TData)>,
    root: (s: TStore) => Entities<T>,
    selector: T['id'] | ((entity: T) => boolean),
    entityLoaded: boolean = true,
    force: boolean = false
  ): Observable<T> {
    return this._innerFrom(() => {
      let hasFailed = true;
      const entity = typeof selector === 'function' ? this._findEntityBy(root, entity => (selector as ((entity: T) => boolean))(entity.value)) : this._findEntityByKey(root, selector as T['id']);
      const state = entity ? entity.loaded : false;

      if (entity === null || state === false || force === true) {
        return this._getLoadQuery<T | TData>(url)
          .pipe(
            map(data => data as T),
            tap(data => this.upsertValue(root, data, { loaded: entityLoaded })),
            tap(data => this.update(d => this._setEntityStates(d, root, data.id, entityLoaded))),
            tap(() => hasFailed = false),
            finalize(() => {
              if (hasFailed && entity?.value?.id) {
                this.update(d => this._setEntityStates(d, root, entity.value.id, false));
              }
              this._removeLoadQuery(url);
            })
          );
      }

      return of(entity?.value || null);
    });
  }

  /** @internal Removes a query from the executing queries cache */
  private _removeLoadQuery(data: string | ExternalCall<unknown>) {
    this._executingQueries.delete(typeof data == 'string' ? data : data.key);
  }

  /** @internal Sets entity loaded states */
  private _setEntityStates<T extends BaseEntity<T['id']>, TEntity>(
    draft: TStore,
    root: (s: TStore) => (Entities<T> | Entity<TEntity>),
    key: T['id'],
    loaded: boolean | null = null
  ) {
    let entity = key !== null
      ? this._findEntityByKey(root as (s: TStore) => Entities<T>, key, draft)
      : (root(draft) as Entity<TEntity>);

    if (entity !== null && key === null && '_array' in entity) {
      entity = null;
    }

    if (entity && loaded !== null) {
      entity.loaded = loaded;
    }
  }

}
