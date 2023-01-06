import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideStore } from '@ssougnez/ng-store';

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
import { ErrorComponent } from './examples/11_Container/components/error/error.component';
import { LoaderComponent } from './examples/11_Container/components/loader/loader.component';
import { initial as initialContainerExample } from './examples/11_Container/state/app.state';

import { AppComponent as ComponentComponent } from './examples/12_Component/app.component';
import { initial as initialComponentExample } from './examples/12_Component/state/app.state';

const component = LoadComponent;

const configurations = new Map();

configurations.set(FindComponent, [
  provideStore({
    initialValue: initialFindExample,
    httpClientType: null
  })
]);

configurations.set(SelectComponent, [
  provideStore({
    initialValue: initialSelectExample,
    httpClientType: null
  })
]);

configurations.set(IndexesComponent, [
  provideStore({
    initialValue: initialIndexesExample,
    httpClientType: null
  })
]);

configurations.set(UpsertComponent, [
  provideStore({
    initialValue: initialUpsertExample,
    httpClientType: null
  })
]);

configurations.set(RemoveComponent, [
  provideStore({
    initialValue: initialRemoveExample,
    httpClientType: null
  })
]);

configurations.set(LoadComponent, [
  provideStore({
    initialValue: initialLoadExample
  }),
  provideHttpClient()
]);

configurations.set(LoadDependentComponent, [
  provideStore({
    initialValue: initialLoadDependentExample
  }),
  provideHttpClient()
]);

configurations.set(PostComponent, [
  provideStore({
    initialValue: initialPostExample
  }),
  provideHttpClient()
]);

configurations.set(PutComponent, [
  provideStore({
    initialValue: initialPutExample
  }),
  provideHttpClient()
]);

configurations.set(DeleteComponent, [
  provideStore({
    initialValue: initialDeleteExample
  }),
  provideHttpClient()
]);

configurations.set(ContainerComponent, [
  provideStore({
    initialValue: initialContainerExample,
    defaultLoaderText: () => 'This might take a while...',
    loaderComponent: LoaderComponent,
    errorComponent: ErrorComponent
  }),
  provideHttpClient()
]);

configurations.set(ComponentComponent, [
  provideStore({
    initialValue: initialComponentExample
  }),
  provideHttpClient()
]);

bootstrapApplication(component, {
  providers: [
    ...configurations.get(component)
  ]
});
