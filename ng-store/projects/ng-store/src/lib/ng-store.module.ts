import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { NgStoreContainerComponent } from './components/container/container.component';

@NgModule({
  imports: [
    NgStoreContainerComponent,
    HttpClientModule
  ],
  exports: [
    NgStoreContainerComponent
  ]
})
export class NgStoreModule { }