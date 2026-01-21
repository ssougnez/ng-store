import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NgStore } from '@areaprog/ng-store';
import { AppStore } from '../models/store.model';
import { Book, BookCreationData } from '../models/book.model';

@Injectable({ providedIn: 'root' })
export class BookService {

  private readonly _store = inject<NgStore<AppStore>>(NgStore);

  public togglePublished(book: Book): Observable<Book> {
    const updatedBook = { ...book, isPublished: !book.isPublished };

    return this._store.putEntityByKey(
      `/api/books/${book.id}`,
      s => s.books,
      book.id,
      updatedBook
    );
  }

  public add(book: BookCreationData): Observable<Book> {
    return this._store.postEntity<Book>(
      '/api/books',
      s => s.books,
      book
    );
  }

  public delete(bookId: number): Observable<Book> {
    return this._store.deleteEntityByKey(
      `/api/books/${bookId}`,
      s => s.books,
      bookId
    );
  }
}
