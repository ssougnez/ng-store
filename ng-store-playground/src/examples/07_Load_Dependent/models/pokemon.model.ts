import { BaseEntity } from "ng-store";

export type Pokemon = BaseEntity<number> & {
    name: string;
    typeId: number;
}