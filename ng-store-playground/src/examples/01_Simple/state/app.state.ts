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
        }
    ])
}
