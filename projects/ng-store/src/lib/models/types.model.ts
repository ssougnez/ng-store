import { Observable } from "rxjs";

/****************************************************************** UTILITY TYPES ******************************************************************/

/**
 * Extracts keys of T where the value type is boolean
 */
export type BooleanProperties<T> = { [K in keyof T]: T[K] extends boolean ? K : never }[keyof T];

/**
 * Creates a type with only the boolean properties of T, allowing boolean | null | undefined values
 */
export type OnlyBoolean<T> = { [K in BooleanProperties<T>]: boolean | null | undefined };

/****************************************************************** ENTITY TYPES ******************************************************************/

/**
 * Base type for all entities. All entities must have an id property.
 */
export type BaseEntity<TKey> = {
  readonly id: TKey;
}

/**
 * Wrapper around a single value with loading state
 */
export type Entity<T> = {
  readonly uid: number;
  loaded: boolean;
  value: T;
}

/**
 * Collection of entities with internal indexing for O(1) lookups
 */
export type Entities<T extends BaseEntity<T['id']>> = {
  readonly uid: number;

  /** Internal map from entity id to array position */
  _entities: Map<T['id'], number>;

  /** Internal array of entities (may be sparse after deletions) */
  _array: Entity<T>[];

  /** Set of property names used for indexing */
  _indiceNames: Set<Extract<keyof T, string>>;

  /** Index maps for O(1) lookup by indexed properties */
  _indices: EntityIndices<T>;

  /** Whether the collection has been loaded */
  loaded: boolean | null;
}

/**
 * Type for the indices map structure.
 * Maps property names to a Map of property values to array positions.
 */
export type EntityIndices<T> = {
  [property: string]: Map<unknown, number[]>;
}

/**
 * Options for setting entity state
 */
export type EntityStateOption = {
  loaded?: boolean;
}

/**
 * Union type for any store entity (single or collection)
 */
export type StoreEntity = Entities<BaseEntity<unknown>> | Entity<unknown>;

/****************************************************************** SELECTOR TYPES ******************************************************************/

/**
 * Function that selects a part of the store
 */
export type Selector<TStore, TResult> = (store: TStore) => TResult;

/**
 * Function that selects an Entities collection from the store
 */
export type EntitiesSelector<TStore, T extends BaseEntity<T['id']>> = Selector<TStore, Entities<T>>;

/**
 * Function that selects a single Entity from the store
 */
export type EntitySelector<TStore, T> = Selector<TStore, Entity<T>>;

/****************************************************************** HTTP TYPES ******************************************************************/

/**
 * Interface for HTTP client implementations
 */
export interface IHttpClient {
  delete<T>(url: string): Observable<T>;
  get<T>(url: string): Observable<T>;
  post<T>(url: string, data: unknown): Observable<T>;
  put<T>(url: string, data: unknown): Observable<T>;
}

/**
 * Represents an external call configuration for custom data fetching
 */
export type ExternalCall<T> = {
  key: string;
  observable: Observable<T>;
}
