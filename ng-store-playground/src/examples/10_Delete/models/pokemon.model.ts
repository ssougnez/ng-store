import { BaseEntity } from "ng-store";

export type Pokemon = BaseEntity<number> & {
    name: string;
    type: 'water' | 'fire' | 'electric' | 'grass' | 'bug' | 'normal' | 'poison';
}