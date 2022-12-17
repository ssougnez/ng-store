import { createEntities, Entities } from "ng-store";
import { Pokemon } from "../models/pokemon.model";

export type AppState = {
    pokemons: Entities<Pokemon>;
}

export const initial: AppState = {
    pokemons: createEntities<Pokemon>([
        {
            id: 1,
            name: 'Pikachu',
            type: 'electric'
        },
        {
            id: 2,
            name: 'Bulbasaur',
            type: 'grass'
        },
        {
            id: 3,
            name: 'Charmander',
            type: 'fire'
        },
        {
            id: 4,
            name: 'Charmander',
            type: 'fire'
        },
        {
            id: 5,
            name: 'Squirtle',
            type: 'water'
        },
        {
            id: 6,
            name: 'Caterpie',
            type: 'bug'
        },
        {
            id: 7,
            name: 'Weedle',
            type: 'bug'
        },
        {
            id: 8,
            name: 'Pidgey',
            type: 'normal'
        },
        {
            id: 9,
            name: 'Nidoran',
            type: 'poison'
        },
        {
            id: 10,
            name: 'Rattata',
            type: 'normal'
        },
        {
            id: 11,
            name: 'Spearow ',
            type: 'normal'
        },
        {
            id: 12,
            name: 'Ekans ',
            type: 'poison'
        }
    ], ['type'])
}
