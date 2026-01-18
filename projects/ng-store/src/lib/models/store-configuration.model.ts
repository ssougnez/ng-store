import { ProviderToken, Type } from "@angular/core";
import { IBaseErrorComponent } from "./base-error-component.interface";
import { IBaseLoaderComponent } from "./base-loader-component.interface";
import { IHttpClient } from "./types.model";

/**
 * Configuration options for the NgStore.
 * Pass this to `provideStore()` in your application's providers.
 *
 * @template TStore - The type of your store state (optional, defaults to unknown)
 *
 * @example
 * ```typescript
 * // store.model.ts
 * interface AppStore {
 *   books: Entities<Book>;
 *   authors: Entities<Author>;
 *   ui: Entity<UiState>;
 * }
 *
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideStore<AppStore>({
 *       httpClientType: HttpClient,
 *       initialValue: {
 *         books: createEntities<Book>(),
 *         authors: createEntities<Author>(),
 *         ui: createEntity({ loading: false })
 *       },
 *       loaderComponent: AppLoaderComponent,
 *       errorComponent: AppErrorComponent
 *     })
 *   ]
 * };
 * ```
 */
export type StoreConfiguration<TStore = unknown> = {
  /**
   * The HTTP client type to use for API calls.
   * Must implement the `IHttpClient` interface.
   *
   * @example
   * ```typescript
   * httpClientType: HttpClient // Angular's HttpClient
   * ```
   */
  httpClientType: ProviderToken<IHttpClient>;

  /**
   * The initial state of the store.
   * Should match your store's type structure with empty collections.
   *
   * @example
   * ```typescript
   * initialValue: {
   *   books: createEntities<Book>([], ['authorId']),
   *   authors: createEntities<Author>(),
   *   ui: createEntity({ loading: false })
   * }
   * ```
   */
  initialValue: TStore;

  /**
   * Component to display while data is loading.
   * Must implement `IBaseLoaderComponent`.
   */
  loaderComponent: Type<IBaseLoaderComponent>;

  /**
   * Initial size for the loader component.
   * Passed to the loader's `size` input.
   */
  initialLoaderSize?: string;

  /**
   * Component to display when an error occurs.
   * Must implement `IBaseErrorComponent`.
   */
  errorComponent?: Type<IBaseErrorComponent>;

  /**
   * Function that returns the default loader text.
   * Called each time a loader is displayed.
   */
  defaultLoaderText?: () => string;

  /**
   * Default error handler for ExecuteAction instances.
   * Used when an ExecuteAction doesn't specify its own error handler.
   *
   * @example
   * ```typescript
   * defaultExecuteActionErrorHandler: (err) => {
   *   console.error('Action failed:', err);
   *   notificationService.showError(err.message);
   * }
   * ```
   */
  defaultExecuteActionErrorHandler?: (err: Error) => void;

  /**
   * Whether to automatically upsert entities after successful PUT requests.
   * Defaults to `true`.
   *
   * Set to `false` if you want to manually handle store updates after PUT.
   */
  automaticPut?: boolean;

  /**
   * Whether to automatically upsert entities after successful POST requests.
   * Defaults to `true`.
   *
   * Set to `false` if you want to manually handle store updates after POST.
   */
  automaticPost?: boolean;

  /**
   * Whether to automatically remove entities after successful DELETE requests.
   * Defaults to `true`.
   *
   * Set to `false` if you want to manually handle store updates after DELETE.
   */
  automaticDelete?: boolean;
}
