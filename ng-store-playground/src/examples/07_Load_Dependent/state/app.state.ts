import { createEntities, Entities } from "ng-store";
import { Pokemon } from "../models/pokemon.model";
import { Type } from "../models/type.model";

export type AppState = {
    pokemons: Entities<Pokemon>;
    types: Entities<Type>;
}

export const initial: AppState = {
    pokemons: createEntities<Pokemon>([], ['typeId']),
    types: createEntities<Type>()
}
