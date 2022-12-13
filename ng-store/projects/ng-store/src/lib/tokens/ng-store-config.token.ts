import { InjectionToken } from "@angular/core";
import { StoreConfiguration } from "../models";

export const NG_STORE_CONFIG = new InjectionToken<StoreConfiguration>('NG_STORE_CONFIG');