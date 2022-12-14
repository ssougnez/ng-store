import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgStoreModule, NG_STORE_CONFIG, StoreConfiguration } from 'ng-store';
import { AppComponent } from './app.component';
import { initial } from './state/app.state';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    NgStoreModule
  ],
  providers: [
    {
      provide: NG_STORE_CONFIG,
      useValue: {
        initialValue: initial
      } as StoreConfiguration
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
