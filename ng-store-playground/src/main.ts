import { bootstrapApplication } from '@angular/platform-browser';
import { NG_STORE_CONFIG, StoreConfiguration } from 'ng-store';
import { AppComponent as FindComponent } from './examples/01_Find/app.component';
import { initial as initialSimpleExample } from './examples/01_Find/state/app.state';

const component = FindComponent;

const configurations = new Map();

configurations.set(FindComponent, [{
  provide: NG_STORE_CONFIG,
  useValue: {
    initialValue: initialSimpleExample,
    httpClientType: null
  } as StoreConfiguration
}]);


bootstrapApplication(component, {
  providers: [
    ...configurations.get(component)
  ]
});
