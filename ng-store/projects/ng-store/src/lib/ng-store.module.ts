import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { NgStoreContainerComponent } from './components/container/container.component';
import { NgStoreErrorHostComponent } from './components/error-host/error-host.component';
import { NgStoreLoaderHostComponent } from './components/loader-host/loader-host.component';

@NgModule({
  declarations: [
    NgStoreContainerComponent,
    NgStoreLoaderHostComponent,
    NgStoreErrorHostComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  exports: [
    NgStoreContainerComponent
  ]
})
export class NgStoreModule { }