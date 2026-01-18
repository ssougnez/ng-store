import { ProviderToken, Type } from "@angular/core";
import { IBaseErrorComponent } from "./base-error-component.interface";
import { IBaseLoaderComponent } from "./base-loader-component.interface";
import { IHttpClient } from "./types.model";

export type StoreConfiguration = {
  httpClientType: ProviderToken<IHttpClient>;
  initialValue: unknown;
  loaderComponent: Type<IBaseLoaderComponent>;
  initialLoaderSize?: string;
  errorComponent?: Type<IBaseErrorComponent>;
  defaultLoaderText?: () => string;
  defaultExecuteActionErrorHandler?: (err: Error) => void;
  automaticPut?: boolean;
  automaticPost?: boolean;
  automaticDelete?: boolean;
}
