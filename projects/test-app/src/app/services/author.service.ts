import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { findStoreValueByKey, NgStore } from '@areaprog/ng-store';
import { AppStore } from '../models/store.model';
import { Author, AuthorCreationData } from '../models/author.model';
import { Book } from '../models/book.model';

@Injectable({ providedIn: 'root' })
export class AuthorService {

  private readonly _store = inject<NgStore<AppStore>>(NgStore);

  public loadAll(): Observable<Author[]> {
    return this._store.loadAllEntities<Author>(
      '/api/authors',
      s => s.authors,
      false  // entities not fully loaded (no biography)
    );
  }

  public loadAuthorByKey(id: number): Observable<Author> {
    return this._store.loadEntityByKey<Author>(
      `/api/authors/${id}`,
      s => s.authors,
      id
    );
  }

  public loadBooks(authorId: number): Observable<Book[]> {
    return this._store.loadEntities<Book, Author>(
      `/api/authors/${authorId}/books`,
      s => s.books,
      findStoreValueByKey(s => s.authors, authorId),
      'booksLoaded'
    );
  }

  public findById(id: number): Author | null {
    return this._store.findNullableValueByKey(s => s.authors, id);
  }

  public add(author: AuthorCreationData): Observable<Author> {
    return this._store.postEntity<Author>(
      '/api/authors',
      s => s.authors,
      { ...author, booksLoaded: false }
    );
  }
}
