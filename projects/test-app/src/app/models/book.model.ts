import { BaseEntity } from '@areaprog/ng-store';

export interface Book extends BaseEntity<number> {
  title: string;
  year: number;
  authorId: number;
  isPublished: boolean;
}
