import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { NgStore } from '@areaprog/ng-store';
import { AppStore } from '../models/store.model';
import { Author, AuthorCreationData } from '../models/author.model';

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

  public findById(id: number): Author | null {
    return this._store.findValueByKey(s => s.authors, id);
  }

  public add(author: AuthorCreationData): Observable<Author> {
    return this._store.postEntity<Author>(
      '/api/authors',
      s => s.authors,
      { ...author, booksLoaded: false }
    );
  }
}
