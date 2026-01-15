import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { StoreConfiguration } from "./models";
import { NgStore } from "./services";
import { NG_STORE_CONFIG } from "./tokens";

export const provideStore = (config: StoreConfiguration): EnvironmentProviders => makeEnvironmentProviders([
  NgStore,
  {
    provide: NG_STORE_CONFIG,
    useValue: config
  }
]);