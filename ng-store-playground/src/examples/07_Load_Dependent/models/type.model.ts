import { BaseEntity } from "@ssougnez/ng-store";

export type Type = BaseEntity<number> & {
    name: string;

    pokemonsLoaded: boolean;
}