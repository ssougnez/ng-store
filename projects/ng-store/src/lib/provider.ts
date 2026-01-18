import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { enableMapSet } from "immer";
import { StoreConfiguration } from "./models";
import { NgStore } from "./services";
import { NG_STORE_CONFIG } from "./tokens";

export const provideStore = (config: StoreConfiguration): EnvironmentProviders => {
  enableMapSet();

  return makeEnvironmentProviders([
    NgStore,
    {
      provide: NG_STORE_CONFIG,
      useValue: config
    }
  ]);
}