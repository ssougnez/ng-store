import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { enableMapSet } from "immer";
import { StoreConfiguration } from "./models";
import { NgStore } from "./services";
import { NG_STORE_CONFIG } from "./tokens";

/**
 * Provides the NgStore service and its configuration to the application.
 *
 * Call this function in your application's providers array to configure the store.
 *
 * @template TStore - The type of your store state (inferred from initialValue)
 * @param config - Configuration options for the store
 * @returns Environment providers for Angular's dependency injection
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
 * import { provideStore } from '@areaprog/ng-store';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideStore<AppStore>({
 *       httpClientType: HttpClient,
 *       initialValue: {
 *         books: createEntities<Book>([], ['authorId']),
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
export const provideStore = <TStore = unknown>(config: StoreConfiguration<TStore>): EnvironmentProviders => {
  enableMapSet();

  return makeEnvironmentProviders([
    NgStore,
    {
      provide: NG_STORE_CONFIG,
      useValue: config
    }
  ]);
}
