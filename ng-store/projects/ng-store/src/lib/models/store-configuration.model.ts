import { ProviderToken, Type } from "@angular/core";
import { IHttpClient } from "../services";
import { IBaseErrorComponent } from "./base-error-component.interface";
import { IBaseLoaderComponent } from "./base-loader-component.interface";

export type StoreConfiguration = {
  httpClientType: ProviderToken<IHttpClient>;
  initialValue: unknown;
  loaderComponent: Type<IBaseLoaderComponent>;
  initialLoaderSize?: string;
  errorComponent?: Type<IBaseErrorComponent>;
  defaultLoaderText?: () => string;
}