import { createEntities, Entities } from '@areaprog/ng-store';
import { Author } from './author.model';
import { Book } from './book.model';

export interface AppStore {
  authors: Entities<Author>;
  books: Entities<Book>;
}

export const initialStore: AppStore = {
  authors: createEntities<Author>(),
  books: createEntities<Book>([], ['authorId'])
};
