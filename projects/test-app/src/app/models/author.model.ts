import { BaseEntity } from '@areaprog/ng-store';

export interface Author extends BaseEntity<number> {
  name: string;
  country: string;
  booksLoaded: boolean;
  biography?: string;
  quotes?: string;
}

export type AuthorCreationData = {
  name: string;
  country: string;
}
