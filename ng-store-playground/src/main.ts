import { bootstrapApplication } from '@angular/platform-browser';
import { NG_STORE_CONFIG, StoreConfiguration } from 'ng-store';
import { AppComponent as FindComponent } from './examples/01_Find/app.component';
import { initial as initialFindExample } from './examples/01_Find/state/app.state';

import { AppComponent as SelectComponent } from './examples/02_Select/app.component';
import { initial as initialSelectExample } from './examples/02_Select/state/app.state';

import { AppComponent as IndexesComponent } from './examples/03_Indexes/app.component';
import { initial as initialIndexesExample } from './examples/03_Indexes/state/app.state';

import { AppComponent as UpdateComponent } from './examples/04_Update/app.component';
import { initial as initialUpdateExample } from './examples/04_Update/state/app.state';

const component = UpdateComponent;

const configurations = new Map();

configurations.set(FindComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialFindExample,
    httpClientType: null
  } as StoreConfiguration
}]);

configurations.set(SelectComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialSelectExample,
    httpClientType: null
  } as StoreConfiguration
}]);

configurations.set(IndexesComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialIndexesExample,
    httpClientType: null
  } as StoreConfiguration
}]);

configurations.set(UpdateComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialUpdateExample,
    httpClientType: null
  } as StoreConfiguration
}]);

bootstrapApplication(component, {
  providers: [
    ...configurations.get(component)
  ]
});
