import { bootstrapApplication } from '@angular/platform-browser';
import { NG_STORE_CONFIG, StoreConfiguration } from 'ng-store';
import { AppComponent as SimpleExampleComponent } from './examples/01_Simple/app.component';
import { initial as initialSimpleExample } from './examples/01_Simple/state/app.state';

const component = SimpleExampleComponent;

const configurations = new Map();

configurations.set(component, [{
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
