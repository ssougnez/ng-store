import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { findStoreValueByKey, NgStore } from '@areaprog/ng-store';
import { AppStore } from '../models/store.model';
import { Author } from '../models/author.model';
import { Book } from '../models/book.model';

@Injectable({ providedIn: 'root' })
export class BookService {

  private readonly _store = inject<NgStore<AppStore>>(NgStore);

  public loadByAuthorId(authorId: number): Observable<Book[]> {
    return this._store.loadEntities<Book, Author>(
      `/api/books?authorId=${authorId}`,
      s => s.books,
      findStoreValueByKey(s => s.authors, authorId),
      'booksLoaded'
    );
  }

  public togglePublished(book: Book): Observable<Book> {
    const updatedBook = { ...book, isPublished: !book.isPublished };

    return this._store.putEntityByKey<Book, Book>(
      `/api/books/${book.id}`,
      s => s.books,
      book.id,
      updatedBook
    ).pipe(tap(book => this._store.upsertValue(s => s.books, book)));
  }
}
