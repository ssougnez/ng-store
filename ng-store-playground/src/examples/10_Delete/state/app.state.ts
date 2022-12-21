import { createEntities, Entities } from "@ssougnez/ng-store";
import { Pokemon } from "../models/pokemon.model";

export type AppState = {
    pokemons: Entities<Pokemon>;
}

export const initial: AppState = {
    pokemons: createEntities<Pokemon>([], ['type'])
}
