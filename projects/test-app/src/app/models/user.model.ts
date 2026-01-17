import { BaseEntity } from '@areaprog/ng-store';

export interface User extends BaseEntity<number> {
  id: number;
  name: string;
  email: string;
}
