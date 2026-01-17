import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { NgStore } from '@areaprog/ng-store';
import { AppStore } from '../../models/store.model';
import { AuthorsListComponent } from '../authors-list/authors-list.component';
import { BooksListComponent } from '../books-list/books-list.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AsyncPipe, JsonPipe, AuthorsListComponent, BooksListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  protected readonly title = signal('ng-store Test App');

  private store = inject<NgStore<AppStore>>(NgStore);

  // Selected author
  selectedAuthorId = signal<number | null>(null);

  // Authors observables (for debug section)
  authorsEntities$ = this.store.selectEntities(s => s.authors);

  onAuthorSelected(id: number): void {
    this.selectedAuthorId.set(id);
  }
}
