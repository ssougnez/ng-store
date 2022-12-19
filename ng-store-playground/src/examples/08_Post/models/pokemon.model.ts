import { BaseEntity } from "@ssougnez/ng-store";

export type PokemonType = 'water' | 'fire' | 'electric' | 'grass' | 'bug' | 'normal' | 'poison';

export type Pokemon = BaseEntity<number> & {
    name: string;
    type: PokemonType;
}

export type PokemonCreationData = {
    name: string;
    type: PokemonType;
}