import { HttpClient } from '@angular/common/http';
import { Inject, inject, Injectable } from '@angular/core';
import { enableMapSet, produce } from 'immer';
import { BehaviorSubject, catchError, distinctUntilChanged, finalize, map, Observable, of, share, tap, throwError } from 'rxjs';
import { StoreConfiguration } from '../models';
import { filterArray, mapArray } from '../operators';
import { NG_STORE_CONFIG } from '../tokens';

type StoreEntity = Entities<BaseEntity<unknown>> | Entity<unknown>;
type BooleanProperties<T> = { [k in keyof T]: T[k] extends boolean ? k : never }[keyof T];
type OnlyBoolean<T> = { [k in BooleanProperties<T>]: boolean | null | undefined };

type EntityStateOption = {
  loading?: boolean,
  loaded?: boolean,
  busy?: boolean
}

let nextUniqueId = 0;

export interface IHttpClient {
  delete<T>(url: string): Observable<T>;
  get<T>(url: string): Observable<T>;
  post<T>(url: string, data: unknown): Observable<T>;
  put<T>(url: string, data: unknown): Observable<T>;
}

export type BaseEntity<TKey> = {
  readonly id: TKey;
}

export type Entities<T extends BaseEntity<T['id']>> = {
  readonly uid: number;

  _entities: Map<T['id'], number>;
  _array: Entity<T>[];
  _indiceNames: Set<Extract<keyof T, string>>;
  _indices: {
    [property: string]: Map<any, number[]>
  };

  loaded: boolean | null;
  adding: boolean;
  loading: boolean;
  busy: boolean;
}

export type Entity<T> = {
  readonly uid: number;

  busy: boolean;
  deleting: boolean;
  loaded: boolean;
  loading: boolean;
  updating: boolean;
  value: T;
}

export const createEntity = <T>(value: T): Entity<T> => {
  return {
    uid: nextUniqueId++,
    loaded: !!value,
    loading: false,
    value: value,
    busy: false,
    deleting: false,
    updating: false
  }
}

export const createEntities = <T extends BaseEntity<T['id']>>(values: T[] = [], indices: (Extract<keyof T, string>)[] = []): Entities<T> => {
  const entities: Entities<T> = {
    uid: nextUniqueId++,

    _array: values.map(value => createEntity(value)),
    _indices: {},
    _entities: new Map<T['id'], number>(),
    _indiceNames: new Set<Extract<keyof T, string>>(indices),

    busy: false,
    loaded: false,
    adding: false,
    loading: false
  }

  for (const index of indices) {
    entities._indices[index] = new Map<any, number[]>();
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

export const findStoreValueByKey = <TStore, T extends BaseEntity<T['id']>>(
  root: (s: TStore) => Entities<T>,
  key: T['id']
): ((s: TStore) => T | null) => {
  return (s: TStore): T | null => {
    const position = root(s)._entities.get(key);

    return position === undefined ? null : (root(s)._array[position]?.value || null);
  }
}

export type ExternalCall<T> = {
  key: string;
  observable: Observable<T>;
}

function _isUndefined(value: any): boolean {
  return typeof value === 'undefined';
}

@Injectable({
  providedIn: 'root'
})
export class NgStore<TStore>  {

  /****************************************************************** VARIABLES ******************************************************************/

  private _addingStates: Map<number, number> = new Map<number, number>();
  private _deletingStates: Map<number, number> = new Map<number, number>();
  private _loadingStates: Map<number, number> = new Map<number, number>();
  private _updatingStates: Map<number, number> = new Map<number, number>();
  private _executingQueries: Map<string, Observable<any>> = new Map<string, Observable<any>>();
  private _executedQueries: Set<string> = new Set<string>();
  private _executedQueriesSubject: BehaviorSubject<Set<string>> = new BehaviorSubject<Set<string>>(this._executedQueries);
  private _store: BehaviorSubject<TStore>;
  private _http: IHttpClient | null = null;
  private _root: Observable<TStore>;

  public readonly executedQueries$: Observable<Set<string>> = this._executedQueriesSubject.asObservable();

  /********************************************************************** ACCESSORS **********************************************************************/

  public get value(): TStore {
    return this._store.value;
  }

  public get root(): Observable<TStore> {
    return this._root;
  }

  /****************************************************************** LIFE CYCLE ******************************************************************/

  constructor(@Inject(NG_STORE_CONFIG) private _config: StoreConfiguration) {
    enableMapSet();

    if (_config.httpClientType !== null) {
      this._http = inject(_config.httpClientType ?? HttpClient);
    }

    this._store = new BehaviorSubject(produce(_config.initialValue as TStore, draft => draft));    
    this._root = this._store.asObservable();
  }

  /********************************************************************** PUBLIC **********************************************************************/

  /**
   * Returns the first entity based on a predicate
   * 
   * @param selector  Selector to returns the part of the store to filter
   * @param predicate Predicate to select the entity
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
   */
  public findEntityBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: Entity<T>) => boolean,
    store: TStore = this.value
  ): Entity<T> | null {
    return selector(store)._array.find(e => _isUndefined(e) === false && predicate(e)) || null;
  }

  /**
   * Returns the first entity with a specific key
   * 
   * @param selector  Selector to returns the part of the store to filter
   * @param key       Key used for the entity selection
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
   */
  public findEntityByKey<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id'],
    store: TStore = this.value
  ): Entity<T> | null {
    const root = selector(store);
    const position = root._entities.get(key);

    return position === undefined ? null : (root._array[position] || null);
  }

  /**
   * Returns the first entity with a unique id
   * 
   * @param selector  Selector to returns the part of the store to filter
   * @param uid       Unique ID used for the entity selection
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
   */
  public findEntityByUniqueId<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    uid: number,
    store: TStore = this.value
  ): Entity<T> | null {
    const root = selector(store)

    return root._array.find(e => e.uid === uid) || null;
  }

  /**
  * Returns all entities matching a predicate
  * 
  * @param selector   Selector to returns the part of the store to filter
  * @param predicate  Predicate to select the the entities
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
  */
  public findEntitiesBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: Entity<T>) => boolean,
    store: TStore = this.value
  ): Entity<T>[] {
    return selector(store)._array.filter(e => _isUndefined(e) === false && predicate(e));
  }

  /**
   * Returns the first value based on a predicate
   * 
   * @param selector  Selector to returns the part of the store to filter
   * @param predicate Predicate to select the value
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
   */
  public findValueBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: T) => boolean,
    store: TStore = this.value
  ): T | null {
    return selector(store)._array.find(e => _isUndefined(e) === false && predicate(e.value))?.value || null;
  }

  /**
   * Returns the first value based on an index
   * 
   * @param selector  Selector to returns the part of the store to filter
   * @param index     Index name
   * @param value     Index value
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
   */
  public findValueByIndex<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    index: Extract<keyof T, string>,
    value: any,
    store: TStore = this.value
  ): T | null {
    const array = selector(store)._indices[index].get(value);
    const position = (array && array[0]) || null;

    return position !== null ? selector(store)._array[position].value : null;
  }

  /**
   * Returns the first value with a specific key
   * 
   * @param selector  Selector to returns the part of the store to filter
   * @param key       Key used for the entity selection
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
   */
  public findValueByKey<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id'],
    store: TStore = this.value
  ): T | null {
    return this.findEntityByKey(selector, key, store)?.value || null;
  }

  /**
   * Returns all values matching a predicate
   * 
   * @param selector  Selector to returns the part of the store to filter
   * @param predicate Predicate to select the the values
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
   */
  public findValuesBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: T) => boolean,
    store: TStore = this.value
  ): T[] {
    return selector(store)._array.filter(e => _isUndefined(e) === false && predicate(e.value)).map(e => e.value);
  }

  /**
   * Returns all the entities of a store location
   * 
   * @param selector  Function used to locate the entities in the store
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
   */
  public getEntities<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    store: TStore = this.value
  ): Entity<T>[] {
    return selector(store)._array.filter(e => _isUndefined(e) === false);
  }

  /**
   * Returns all the values of a store location
   *
   * @param selector  Function used to locate the values in the store
   * @param store     By default the search is performed on the store, but you can pass another version of the store in this parameter
   */
  public getValues<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    store: TStore = this.value
  ): T[] {
    return this.getEntities(selector, store).map(e => e.value);
  }

  /**
   * Returns whether a specific entity exists in the store
   * 
   * @param selector  Location in the store to get the entity from
   * @param key   Key of the entity
   */
  public hasEntity<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id']
  ): boolean {
    return selector(this.value)._entities.has(key);
  }

  /**
   * Returns an observable emitting a value when a specific query has been correctly executed
   * 
   * @param query   Query URL
   */
  public isQueryExecuted(query: string): Observable<boolean> {
    return this.executedQueries$.pipe(map(queries => queries.has(query)), distinctUntilChanged());
  }

  /**
   * Remove values from the store that match a predicate
   * 
   * @param selector  Selector to return the part of the store where values are removed from
   * @param predicate Predicate to match the value
   */
  public removeValuesBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: T) => boolean
  ) {
    this.update((draft, state) => {
      const snapshotRoot = selector(state);
      const draftRoot = selector(draft);

      if (snapshotRoot) {
        const array = snapshotRoot._array;

        for (let i = array.length - 1; i >= 0; --i) {
          if (_isUndefined(array[i]) === false && predicate(array[i].value) === true) {
            draftRoot._entities.delete(array[i].value.id);

            for (const index of snapshotRoot._indiceNames) {
              const value = array[i].value[index];
              const mapArray = (snapshotRoot._indices[index].get(value) || []).filter(p => p !== i);

              draftRoot._indices[index].set(value, mapArray);
            }

            delete draftRoot._array[i];
          }
        }
      }
    });
  }

  /**
   * Remove entities from the store by their keys
   * 
   * @param selector  Selector to return the part of the store where entities are removed from
   * @param keys      Keys used to remove entities
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

        for (let i = snapshotRoot._array.length - 1; i >= 0; --i) {
          if (_isUndefined(snapshotRoot._array[i]) === false && keys.includes(snapshotRoot._array[i].value.id)) {
            draftRoot._entities.delete(snapshotRoot._array[i].value.id);

            for (const index of snapshotRoot._indiceNames) {
              const value = snapshotRoot._array[i].value[index];
              const mapArray = (snapshotRoot._indices[index].get(value) || []).filter(p => p !== i);

              draftRoot._indices[index].set(value, mapArray);
            }

            delete draftRoot._array[i];
          }
        }
      });
    }
  }

  /** 
   * Reset the store to its initial value
  */
  public reset(): void {
    this._store.next(this._config.initialValue as TStore);
  }

  /**
   * Returns an observable matching a part of the store
   * 
   * @param selector Selector to select the part of the store
   */
  public select<T>(selector: (s: TStore) => T): Observable<T> {
    return this.root
      .pipe(
        map(s => selector(s)),
        distinctUntilChanged()
      );
  }

  /**
   * Returns an observable with all the entities in a part of the store
   * 
   * @param selector  Selector to fetch the entities
   */
  public selectEntities<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>
  ): Observable<Entity<T>[]> {
    return this.select(selector)
      .pipe(
        map(e => e._array.filter(e => _isUndefined(e) === false))
      );
  }

  /**
   * Returns an observable filtering the store entities based on a selector
   * 
   * @param selector  Selector to fetch the entities
   * @param filter    Function to filter the entities
   */
  public selectEntitiesBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    filter: (item: Entity<T>) => boolean
  ): Observable<Entity<T>[]> {
    return this.select(selector)
      .pipe(
        map(e => e._array.filter(e => _isUndefined(e) === false)),
        filterArray(filter)
      );
  }

  /**
   * Returns an observable filtering the store entities based on a predefined index
   * 
   * @param selector  Selector to fetch the entities
   * @param index     Name of the property used to create the index
   * @param value     Index value
   */
  public selectEntitiesByIndex<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    index: Extract<keyof T, string>,
    value: any
  ): Observable<Entity<T>[]> {
    return this.select(selector).pipe(map(e => (e._indices[index].get(value) || []).map(p => e._array[p])));
  }

  /**
   * Returns an observable with the first entity matching a predicate
   * 
   * @param selector  Selector to select the part of the store 
   * @param predicate Predicate to find the entity
   */
  public selectEntityBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    predicate: (item: Entity<T>) => boolean
  ): Observable<Entity<T>> {
    return this.selectEntitiesBy(selector, predicate)
      .pipe(
        map(items => items[0] || null),
        distinctUntilChanged()
      );
  }

  /**
   * Returns an observable filtering the store entities based on a predefined index. If multiple item correspond to the index, the first one is returned
   * 
   * @param selector  Selector to fetch the entities
   * @param index     Name of the property used to create the index
   * @param value     Index value
   */
  public selectEntityByIndex<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    index: Extract<keyof T, string>,
    value: any
  ): Observable<Entity<T>> {
    return this.selectEntitiesByIndex(selector, index, value)
      .pipe(
        map(entities => entities[0] || null)
      );
  }

  /**
   * Returns an observable with the first entity with the specified key
   * 
   * @param selector  Selector to select the part of the store
   * @param key       Key used to find the entity   
   */
  public selectEntityByKey<T extends BaseEntity<T['id']>>(selector: (s: TStore) => Entities<T>, key: T['id']): Observable<Entity<T> | null> {
    return this.select(selector)
      .pipe(
        map(e => {
          const position = e._entities.get(key);

          return position === undefined ? null : (e._array[position] || null);
        }),
        distinctUntilChanged()
      )
  }

  /**
   * Returns an observable with the values of entities
   * 
   * @param selector Selector to select the part of the store containing the entities
   */
  public selectValues<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>
  ): Observable<T[]> {
    return this.select(selector)
      .pipe(
        map(root => root._array),
        distinctUntilChanged(),
        filterArray(e => _isUndefined(e) === false, false),
        mapArray(e => e.value)
      )
  }

  /**
   * Returns an observable filtering the store entities values based on a selector
   * 
   * @param selector  Selector to fetch the values
   * @param filter    Function to filter the values
   */
  public selectValuesBy<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    filter: (item: T) => boolean
  ): Observable<T[]> {
    return this.selectValues(selector).pipe(filterArray(filter));
  }

  /**
   * Returns an observable filtering the store entities based on a predefined index
   * 
   * @param selector  Selector to fetch the entities
   * @param index     Name of the property used to create the index
   * @param value     Index value
   */
  public selectValuesByIndex<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    index: Extract<keyof T, string>,
    value: any
  ): Observable<T[]> {
    return this.select(selector)
      .pipe(
        distinctUntilChanged((prev, curr) => prev._array === curr._array),
        map(root => (root._indices[index].get(value) || []).map(p => root._array[p].value))
      );
  }

  /**
   * Returns an observable filtering the store entities based on a predefined index. If multiple value are stored at the specified index, only the first one is returned.
   * 
   * @param selector  Selector to fetch the entities
   * @param index     Name of the property used to create the index
   * @param value     Index value
   */
  public selectValueByIndex<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    index: Extract<keyof T, string>,
    value: any
  ): Observable<T> {
    return this.selectValuesByIndex(selector, index, value)
      .pipe(
        map(values => values[0] || null)
      );
  }

  /**
   * Returns an observable with the value of an entity
   * 
   * @param selector Selector to select the entity
   */
  public selectValue<T>(selector: (s: TStore) => Entity<T>): Observable<T> {
    return this.select(selector)
      .pipe(
        map(e => e.value),
        distinctUntilChanged()
      )
  }

  /**
   * Returns an observable with the first value matching a predicate
   * 
   * @param selector  Selector to select the part of the store containing the entities
   * @param predicate Predicate used to find the value
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
   * Returns an observable with a value with the specified key
   * 
   * @param selector  Selector to select the part of the store containing the entities
   * @param key       Key used to find the value
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
   * Update the store
   * 
   * @param updater Function used to update the store
   */
  public update(updater: (draft: TStore, original: TStore) => void) {
    // DO NOT REMOVE THE BRACKETS FOR THE SECOND PARAMETER AS BECAUSE OF CURRYING IT WOULD MEAN SOMETHING ELSE
    const nextState = produce(this._store.value, draft => { updater(draft as TStore, this._store.value); });

    this._store.next(nextState);
  }

  /**
  * Update entities based on a predicate
  *
  * @param root      Selector used to fetch the entities containing the value to update
  * @param selector  Selector used to filter entities
  * @param updater   Function used to update entities
  */
  public updateEntitiesBy<T extends BaseEntity<T['id']>>(
    root: (s: TStore) => Entities<T>,
    selector: (item: Entity<T>) => boolean,
    updater: (item: Entity<T>) => void
  ) {
    this.update((d, s) => {
      const entities = root(s);
      const ids = entities._array.filter(e => selector(e) === true).map(e => e.value.id);

      for (const id of ids) {
        this._updateEntityByKey(d, s, root, id, updater);
      }
    });
  }

  /**
   * Update an entity by key
   * 
   * @param selector  Selector used to fetch the entities containing the entity to update
   * @param key       Key used to fetch the entity to update
   * @param updater   Function used to update the entity
   */
  public updateEntityByKey<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id'],
    updater: (item: Entity<T>) => void
  ) {
    this.update((d, s) => this._updateEntityByKey(d, s, selector, key, entity => updater(entity)));
  }

  /**
   * Update a value by key
   * 
   * @param selector  Selector used to fetch the entities containing the value to update
   * @param key       Key used to fetch the value to update
   * @param updater   Function used to update the entity
   */
  public updateValueByKey<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    key: T['id'],
    updater: (item: T) => void
  ) {
    this.update((d, s) => this._updateEntityByKey(d, s, selector, key, entity => updater(entity.value)));
  }

  /**
   * Update values based on a predicate
   * 
   * @param root      Selector used to fetch the entities containing the value to update
   * @param selector  Selector used to filter entities
   * @param updater   Function used to update entities
   */
  public updateValuesBy<T extends BaseEntity<T['id']>>(
    root: (s: TStore) => Entities<T>,
    selector: (item: T) => boolean,
    updater: (item: T) => void
  ) {
    this.updateEntitiesBy(root, e => selector(e.value), e => updater(e.value));
  }

  /**
   * Upsert multiple values in the store. If the value already exists in the store, entities are merged.
   * 
   * @param selector          Selector defining where the values are added
   * @param values            Values to add
   * @param state             By default, entities are set as "busy: false, loading: false and loaded to true if the value is not null". Can be overriden using this parameter.
   * @param state.busy        Defines whether the entity is currently busy
   * @param state.loading     Defines whether the entity is currently loading
   * @param state.loaded      Defines whether the entity is currently loaded. Could be use to partially loaded entity.
   */
  public upsertValues<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    values: T[],
    state?: EntityStateOption
  ) {
    this.update(d => this._upsertEntities(selector(d), values, state || {}));
  }

  /**
   * Upsert a value in the store. If the value already exists in the store, entities are merged.
   * 
   * @param selector          Selector defining where the value is added
   * @param value             Value to add
   * @param state             By default, the entity is set as "busy: false, loading: false and loaded to true if the value is not null". Can be overriden using this parameter.
   * @param state.busy        Defines whether the entity is currently busy
   * @param state.loading     Defines whether the entity is currently loading
   * @param state.loaded      Defines whether the entity is currently loaded. Could be use to partially loaded entity.
   */
  public upsertValue<T extends BaseEntity<T['id']>>(
    selector: (s: TStore) => Entities<T>,
    value: T,
    state?: EntityStateOption
  ) {
    this.update(d => this._upsertEntities(selector(d), [value], state || {}));
  }

  /**
  * Call a HTTP route to delete an entity by key
  * 
  * @param url            URL to call
  * @param root           Store entities containing the entity to delete
  * @param key            Key to find the entity in the entities
  */
  public deleteEntityByKey<T extends BaseEntity<T['id']>, TReturn = unknown>(
    url: string,
    root: (s: TStore) => Entities<T>,
    key: T['id']
  ): Observable<TReturn> {
    if (this._http === null) {
      throw new Error('You need to define a compatible HttpClient to call this function');
    }

    return this._innerFrom(() => {
      const entity = this.findEntityByKey(root, key);

      if (entity === null) {
        return throwError(() => 'The entity was not found in the store');
      }

      if (entity.deleting === true) {
        return throwError(() => 'The entity is already being deleted by another process');
      }

      this.update(d => {
        this._setEntitiesStates(d, root, null, null, null, true);
        this._setEntityStates(d, root, key, null, null, null, true);
      })

      return this._http!
        .delete<TReturn>(url)
        .pipe(
          finalize(() => {
            this.update(d => {
              this._setEntitiesStates(d, root, null, null, null, false);
              this._setEntityStates(d, root, key, null, null, null, false);
            });
          })
        );
    });
  }




  /**
   * 
   * @param url               URL to call
   * @param root              Store location where to load the entities
   * @param dependentRoot     Dependant store location
   * @param dependentKeys     Keys of depending entites
   * @param stateProperty     Property determining if the entity has to be loaded
   * @param entitiesLoaded    Defines whether the entity are fully loaded
   * @param force     By-pass the loaded check
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
          this._setEntitiesStates(d, root, null, true, null, null);

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
            finalize(() => {
              this.update(d => this._setEntitiesStates(d, root, null, false, null, null));
              this._removeLoadQuery(url);
            })
          )
      }

      return of([]);
    });
  }

  /**
   * Load all the entities
   * 
   * @param url               URL to call
   * @param root              Store location to place the loaded entities
   * @param entitiesLoaded    Defines whether the entities are compltely loaded or not
   * @param force             Ignore the "loaded" state
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
        this.update(d => {
          this._setEntitiesStates(d, root, null, true, null, null);
          root(d).loaded = null;
        });

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
              this.update(d => this._setEntitiesStates(d, root, null, false, null, null));
              this._removeLoadQuery(url);
            })
          );
      }

      return of(this.getValues(root));
    });
  }

  /**
   * Load entities once based on a custom condition
   * 
   * @param url               URL to call to load the entities
   * @param root              Selector to get the location of the store where the entities will be loaded
   * @param entitiesLoaded    Defines whether the retrieved entities are considered as loaded or not
   * @param force             Used to retrieve the entities no matter what
   */
  public loadEntitiesOnce<T extends BaseEntity<T['id']>, TData extends BaseEntity<TData['id']> = T>(
    url: string,
    root: (s: TStore) => Entities<T>,
    entitiesLoaded: boolean = true,
    force: boolean = false
  ): Observable<T[]> {
    return this._innerFrom(() => {
      if (this._executedQueries.has(url) === false || force === true) {
        this.update(d => this._setEntitiesStates(d, root, null, true, null, null));

        return this._getLoadQuery<(T | TData) | (T | TData)[]>(url)
          .pipe(
            map(data => Array.isArray(data) ? data : [data]),
            map((data: (T | TData)[]) => data as T[]),
            tap(data => this.upsertValues(root, data, { loaded: entitiesLoaded })),
            tap(() => {
              this._executedQueries.add(url);
              this._executedQueriesSubject.next(this._executedQueries);
            }),
            finalize(() => {
              this.update(d => this._setEntitiesStates(d, root, null, false, null, null));
              this._removeLoadQuery(url);
            })
          )
      }

      return of([]);
    });
  }

  /**
   * Load entities based on a custom optional condition
   * 
   * @param url               URL to call to load the entities
   * @param root              Selector to get the location of the store where the entities will be loaded
   * @param dependentRoot     Selector to retrieve the location where the variable defining whether the entities are loading or not is located
   * @param stateProperty     Name of the property defining whether the entities are loading or not is located
   * @param entitiesLoaded    Defines whether the retrieved entities are considered as loaded or not
   * @param options           Loading options
   * @param options.force     Used to retrieve the entities no matter what
   * @param options.mapper    Used to convert the data returned by the server in entity type
   */
  public loadEntities<T extends BaseEntity<T['id']>, TDependent extends { [K in keyof OnlyBoolean<TDependent>]?: boolean }, TData extends BaseEntity<TData['id']> = T>(
    url: string | ExternalCall<(T | TData)[]>,
    root: (s: TStore) => Entities<T>,
    dependentRoot: (s: TStore) => TDependent,
    stateProperty: BooleanProperties<TDependent>,
    entitiesLoaded: boolean = true,
    force: boolean = false
  ): Observable<T[]> {
    return this._innerFrom(() => {
      const state = (dependentRoot(this.value) as OnlyBoolean<TDependent>)[stateProperty];

      if (state !== true || force === true) {
        this.update(d => {
          this._setEntitiesStates(d, root, null, true, null, null);

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
            finalize(() => {
              this.update(d => this._setEntitiesStates(d, root, null, false, null, null));
              this._removeLoadQuery(url);
            })
          )
      }

      return of([]);
    });
  }

  /**
   * Load an entity based on a custom condition
   *
   * @param url               URL to call to load the entity
   * @param root              Selector to get the location of the store where the entities will be loaded
   * @param dependentRoot     Selector to retrieve the location where the variable defining whether the entities are loading or not is located
   * @param stateProperty     Name of the property defining whether the entities are loading or not is located
   * @param entityLoaded      Defines whether the retrieved entity is considered as loaded or not
   * @param force             Used to retrieve the entities no matter what
   */
  public loadEntity<T extends BaseEntity<T['id']>, TDependent extends { [K in keyof OnlyBoolean<TDependent>]?: boolean }, TData extends BaseEntity<TData['id']> = T>(
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
          this._setEntitiesStates(d, root, null, true, null, null);

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
            finalize(() => {
              this.update(d => this._setEntitiesStates(d, root, null, false, null, null));
              this._removeLoadQuery(url);
            })
          )
      }

      return of(null);
    });
  }

  /**
   * Loads an entity by some criteria defined by selector. Used to load a partially loaded entity already present in the store or to load a non existing entity in the store.
   *
   * @param url               URL called to load the entity
   * @param root              Location of the store the entity is put
   * @param selector          Delegates used to find the entity. If multiple entity match the criteria, only the first one will be loaded
   * @param entityLoaded      Defines whether the retrieved entity is considered as loaded or not
   * @param force             By default, the entity is loaded only if it does not exist in the store or is not loaded. Use force to load it no matter what.
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
   * Loads an entity by key. Used to load a partially loaded entity already present in the store or to load a non existing entity in the store.
   * 
   * @param url               URL called to load the entity
   * @param root              Location of the store the entity is put
   * @param key               Key of the entity to load
   * @param entityLoaded      Defines whether the retrieved entity is considered as loaded or not
   * @param force             By default, the entity is loaded only if it does not exist in the store or is not loaded. Use force to load it no matter what.
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
   * Call a HTTP route to create a new entity
   * 
   * @param url               URL to call
   * @param root              Store location where to put the entity
   * @param data              Data to post
   */
  public postEntity<T extends BaseEntity<T['id']>, TResult = any>(
    url: string,
    root: (s: TStore) => Entities<T>,
    data: unknown
  ): Observable<TResult> {
    if (this._http === null) {
      throw new Error('You need to define a compatible HttpClient to call this function');
    }

    return this._innerFrom(() => {
      this.update(d => this._setEntitiesStates(d, root, true, null, null, null));

      return this._http!
        .post<TResult>(url, data)
        .pipe(finalize(() => this.update(d => this._setEntitiesStates(d, root, false, null, null, null))));
    });
  }

  /**
   * Call a HTTP route to update an existing entity
   * 
   * @param url               URL to call
   * @param root              Store entities containing the entity to update
   * @param key               Key of the entity to update
   * @param data              Updated data
   */
  public putEntityByKey<T extends BaseEntity<T['id']>, TResult = any>(
    url: string,
    root: (s: TStore) => Entities<T>,
    key: T['id'] | null,
    data: unknown
  ): Observable<TResult> {
    if (this._http === null) {
      throw new Error('You need to define a compatible HttpClient to call this function');
    }

    return this._innerFrom(() => {
      const entity = this.findEntityByKey(root, key);
      const state = entity ? entity.loaded : false;

      this.update(d => {
        this._setEntitiesStates(d, root, entity === null ? true : null, null, entity !== null ? true : null, null);
        this._setEntityStates(d, root, key, null, null, true, null);
      })
      return this._http!
        .put<TResult>(url, data)
        .pipe(
          finalize(() => {
            this.update(d => {
              this._setEntitiesStates(d, root, entity === null ? false : null, null, entity !== null ? false : null, null);
              this._setEntityStates(d, root, key, state, null, false, null);
            })
          })
        );
    });
  }

  /**
   * Rebuild the indices map of an entity list
   * 
   * @param root Store entities to rebuild the indices of
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

        for (const index of entities._indiceNames) {
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
    });
  }

  /********************************************************************** PRIVATE **********************************************************************/

  /**
   * 
   * @param root
   * @param state
   */
  private _setEntityState(root: StoreEntity, state: EntityStateOption) {
    Object.assign(root, state || {});
  }

  /**
   * 
   * @param draft
   * @param snapshot
   * @param selector
   * @param key
   * @param updater
   */
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
          const value = entity.value[index];
          const array = (draftRoot._indices[index].get(value) || []).filter(p => p !== position);

          draftRoot._indices[index].set(value, array);
        }

        updater(entity);

        for (const index of snapshotRoot._indiceNames) {
          const value = entity.value[index];

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

  /**
   * 
   * @param root
   * @param values
   * @param state
   */
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
          if (index in value && value[index] !== existing.value[index]) {
            const map = root._indices[index];

            const oldValue = existing.value[index];
            const newValue = value[index];

            if (_isUndefined(oldValue) === false) {
              map.set(oldValue, (map.get(oldValue) || []).filter(p => p !== position));
            }

            (map.get(newValue) || []).push(position);
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
            const indexValue = value[index];
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

  /* */
  private _getLoadQuery<T>(data: string | ExternalCall<T>): Observable<T> {
    let query = this._executingQueries.get(typeof data == 'string' ? data : data.key);

    if (!query) {
      query = typeof data == 'string' ? this._http!.get<T>(data).pipe(share()) : data.observable.pipe(share());

      this._executingQueries.set(typeof data == 'string' ? data : data.key, query);
    }

    return query;
  }

  /* */
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

  /**
   * 
   * @param url
   * @param root
   * @param selector
   * @param options
   */
  private _loadEntity<T extends BaseEntity<T['id']>, TData extends BaseEntity<TData['id']> = T>(
    url: string | ExternalCall<(T | TData)>,
    root: (s: TStore) => Entities<T>,
    selector: T['id'] | ((entity: T) => boolean),
    entityLoaded: boolean = true,
    force: boolean = false
  ): Observable<T> {
    return this._innerFrom(() => {
      let hasFailed = true;
      const entity = typeof selector === 'function' ? this.findEntityBy(root, entity => (selector as ((entity: T) => boolean))(entity.value)) : this.findEntityByKey(root, selector as T['id']);
      const state = entity ? entity.loaded : false;

      if (entity === null || state === false || force === true) {
        this.update(d => {
          this._setEntitiesStates(d, root, null, true, null, null);

          entity !== null && this._setEntityStates(d, root, entity.value.id, null, true, null, null);
        });

        return this._getLoadQuery<T | TData>(url)
          .pipe(
            map(data => data as T),
            tap(data => this.upsertValue(root, data, { loaded: entityLoaded })),
            tap(data => this.update(d => this._setEntityStates(d, root, data.id, entityLoaded, false, null, null))),
            tap(() => hasFailed = false),
            finalize(() => {
              this.update(d => {
                this._setEntityStates(d, root, entity?.value?.id, hasFailed === true ? false : undefined, false, null, null);
                this._setEntitiesStates(d, root, null, false, null, null);
              });

              this._removeLoadQuery(url);
            })
          );
      }

      return of(entity?.value || null);
    });
  }

  /**
   * 
   * @param data
   */
  private _removeLoadQuery(data: string | ExternalCall<unknown>) {
    this._executingQueries.delete(typeof data == 'string' ? data : data.key);
  }

  /**
   * 
   * @param root
   * @param loading
   * @param deleting
   * @param updating
   */
  private _setEntitiesStates<T extends BaseEntity<T['id']>>(
    draft: TStore,
    root: (s: TStore) => Entities<T>,
    adding: boolean | null = null,
    loading: boolean | null = null,
    updating: boolean | null = null,
    deleting: boolean | null = null
  ) {
    const entities = root(draft);

    if (entities) {
      this._updateStateMaps(this._addingStates, entities.uid, adding);
      this._updateStateMaps(this._loadingStates, entities.uid, loading);
      this._updateStateMaps(this._updatingStates, entities.uid, updating);
      this._updateStateMaps(this._deletingStates, entities.uid, deleting);

      entities.loading = (this._loadingStates.get(entities.uid) || 0) > 0;
      entities.adding = !!this._addingStates.get(entities.uid);
      entities.busy = (this._addingStates.get(entities.uid) || 0) +
        (this._loadingStates.get(entities.uid) || 0) +
        (this._updatingStates.get(entities.uid) || 0) +
        (this._deletingStates.get(entities.uid) || 0) > 0;
    }
  }

  /**
   * 
   * @param root
   * @param key
   * @param loading
   * @param deleting
   * @param updating
   */
  private _setEntityStates<T extends BaseEntity<T['id']>, TEntity>(
    draft: TStore,
    root: (s: TStore) => (Entities<T> | Entity<TEntity>),
    key: T['id'],
    loaded: boolean | null = null,
    loading: boolean | null = null,
    updating: boolean | null = null,
    deleting: boolean | null = null
  ) {
    let entity = key !== null
      ? this.findEntityByKey(root as (s: TStore) => Entities<T>, key, draft)
      : (root(draft) as Entity<TEntity>);

    if (entity !== null && key === null && '_array' in entity) {
      entity = null;
    }

    if (entity) {
      this._updateStateMaps(this._loadingStates, entity.uid, loading);
      this._updateStateMaps(this._updatingStates, entity.uid, updating);
      this._updateStateMaps(this._deletingStates, entity.uid, deleting);

      if (loaded !== null) {
        entity.loaded = loaded;
      }

      entity.loading = (this._loadingStates.get(entity.uid) || 0) > 0;
      entity.updating = (this._updatingStates.get(entity.uid) || 0) > 0;
      entity.deleting = (this._deletingStates.get(entity.uid) || 0) > 0;

      entity.busy = entity.loading || entity.deleting || entity.updating;
    }
  }

  /**
   * 
   * @param map
   * @param id
   * @param flag
   */
  private _updateStateMaps(map: Map<number, number>, id: number, flag: boolean | null) {
    if (flag === true) {
      map.set(id, (map.get(id) || 0) + 1);
    }
    else if (flag === false) {
      map.set(id, (map.get(id) || 0) - 1);
    }
  }

}
