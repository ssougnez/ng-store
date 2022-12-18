import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { NG_STORE_CONFIG, StoreConfiguration } from 'ng-store';

import { AppComponent as FindComponent } from './examples/01_Find/app.component';
import { initial as initialFindExample } from './examples/01_Find/state/app.state';

import { AppComponent as SelectComponent } from './examples/02_Select/app.component';
import { initial as initialSelectExample } from './examples/02_Select/state/app.state';

import { AppComponent as IndexesComponent } from './examples/03_Indexes/app.component';
import { initial as initialIndexesExample } from './examples/03_Indexes/state/app.state';

import { AppComponent as UpsertComponent } from './examples/04_Upsert/app.component';
import { initial as initialUpsertExample } from './examples/04_Upsert/state/app.state';

import { AppComponent as RemoveComponent } from './examples/05_Remove/app.component';
import { initial as initialRemoveExample } from './examples/05_Remove/state/app.state';

import { AppComponent as LoadComponent } from './examples/06_Load/app.component';
import { initial as initialLoadExample } from './examples/06_Load/state/app.state';

import { AppComponent as LoadDependentComponent } from './examples/07_Load_Dependent/app.component';
import { initial as initialLoadDependentExample } from './examples/07_Load_Dependent/state/app.state';

import { AppComponent as PostComponent } from './examples/08_Post/app.component';
import { initial as initialPostExample } from './examples/08_Post/state/app.state';

import { AppComponent as PutComponent } from './examples/09_Put/app.component';
import { initial as initialPutExample } from './examples/09_Put/state/app.state';

import { AppComponent as DeleteComponent } from './examples/10_Delete/app.component';
import { initial as initialDeleteExample } from './examples/10_Delete/state/app.state';

import { AppComponent as ContainerComponent } from './examples/11_Container/app.component';
import { initial as initialContainerExample } from './examples/11_Container/state/app.state';

import { AppComponent as ComponentComponent } from './examples/12_Component/app.component';
import { initial as initialComponentExample } from './examples/12_Component/state/app.state';

const component = LoadDependentComponent;

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

configurations.set(UpsertComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialUpsertExample,
    httpClientType: null
  } as StoreConfiguration
}]);

configurations.set(RemoveComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialRemoveExample,
    httpClientType: null
  } as StoreConfiguration
}]);

configurations.set(LoadComponent, [
  {
    provide: NG_STORE_CONFIG,
    useValue: {
      initialValue: initialLoadExample
    } as StoreConfiguration,
  },
  provideHttpClient()
]);

configurations.set(LoadDependentComponent, [
  {
    provide: NG_STORE_CONFIG,
    useValue: {
      initialValue: initialLoadDependentExample
    } as StoreConfiguration,
  },
  provideHttpClient()
]);

configurations.set(PostComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialPostExample,
    httpClientType: null
  } as StoreConfiguration
}]);

configurations.set(PutComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialPutExample,
    httpClientType: null
  } as StoreConfiguration
}]);

configurations.set(DeleteComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialDeleteExample,
    httpClientType: null
  } as StoreConfiguration
}]);

configurations.set(ContainerComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialContainerExample,
    httpClientType: null
  } as StoreConfiguration
}]);

configurations.set(ComponentComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialComponentExample,
    httpClientType: null
  } as StoreConfiguration
}]);

bootstrapApplication(component, {
  providers: [
    ...configurations.get(component)
  ]
});
