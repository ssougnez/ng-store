import { BaseEntity } from "ng-store";

export type Type = BaseEntity<number> & {
    name: string;

    pokemonsLoaded: boolean;
}