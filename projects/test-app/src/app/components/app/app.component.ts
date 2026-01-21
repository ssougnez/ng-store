import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthorsListComponent } from '../authors-list/authors-list.component';
import { AuthorBiographyComponent } from '../author-biography/author-biography.component';
import { AuthorQuotesComponent } from '../author-quotes/author-quotes.component';
import { BooksListComponent } from '../books-list/books-list.component';
import { ExecutingQueriesComponent } from '../executing-queries/executing-queries.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuthorsListComponent, AuthorBiographyComponent, AuthorQuotesComponent, BooksListComponent, ExecutingQueriesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  protected readonly title = signal('ng-store Test App');

  selectedAuthorId = signal<number | null>(null);

  protected onAuthorSelected(id: number): void {
    this.selectedAuthorId.set(id);
  }
}
