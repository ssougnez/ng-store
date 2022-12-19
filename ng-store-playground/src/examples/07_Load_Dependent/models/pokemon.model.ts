import { BaseEntity } from "@ssougnez/ng-store";

export type Pokemon = BaseEntity<number> & {
    name: string;
    typeId: number;
}