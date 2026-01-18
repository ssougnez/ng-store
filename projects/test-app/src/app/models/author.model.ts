import { BaseEntity } from '@areaprog/ng-store';

export interface Author extends BaseEntity<number> {
  name: string;
  country: string;
  booksLoaded: boolean;
}

export type AuthorCreationData = {
  name: string;
  country: string;
}
