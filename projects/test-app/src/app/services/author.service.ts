import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NgStore } from '@areaprog/ng-store';
import { AppStore } from '../models/store.model';
import { Author } from '../models/author.model';

@Injectable({ providedIn: 'root' })
export class AuthorService {

  private readonly _store = inject<NgStore<AppStore>>(NgStore);

  public loadAll(): Observable<Author[]> {
    return this._store.loadAllEntities<Author>(
      '/api/authors',
      s => s.authors
    );
  }

  public findById(id: number): Author | null {
    return this._store.findValueByKey(s => s.authors, id);
  }
}
