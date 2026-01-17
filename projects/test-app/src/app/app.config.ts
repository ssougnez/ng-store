import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideStore } from '@areaprog/ng-store';
import { routes } from './app.routes';
import { LoaderComponent } from './components/loader/loader.component';
import { initialStore } from './models/store.model';
import { HttpClientService } from './services/http-client.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideStore({
      httpClientType: HttpClientService,
      initialValue: initialStore,
      loaderComponent: LoaderComponent
    })
  ]
};
