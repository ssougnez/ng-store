import { ChangeDetectionStrategy, Component, inject, input, InputSignal } from '@angular/core';
import { ExecuteAction, NgSignalStoreContainerComponent, NgStore, NgStoreTemplateDirective, QueryAction } from '@areaprog/ng-store';
import { AppStore } from '../../models/store.model';
import { Book } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { AddBookComponent } from '../add-book/add-book.component';

@Component({
  selector: 'app-books-list',
  imports: [NgSignalStoreContainerComponent, NgStoreTemplateDirective, AddBookComponent],
  templateUrl: './books-list.component.html',
  styleUrl: './books-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BooksListComponent {

  private readonly _bookService = inject(BookService);
  private readonly _store = inject<NgStore<AppStore>>(NgStore);

  public readonly authorId: InputSignal<number> = input.required<number>();

  protected readonly booksAction = new QueryAction({
    query: () => this._bookService.loadByAuthorId(this.authorId()),
    data: () => this._store.selectValuesByIndex(s => s.books, 'authorId', this.authorId())
  });

  protected readonly togglePublishedAction = new ExecuteAction<Book, Book>({
    query: book => this._bookService.togglePublished(book)
  });

  protected readonly deleteBookAction = new ExecuteAction<number, Book>({
    query: bookId => this._bookService.delete(bookId)
  });
}
