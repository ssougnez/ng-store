import { inject, Injectable } from "@angular/core";
import { findStoreValueByKey, NgStore } from "@ssougnez/ng-store";
import { Observable } from "rxjs";
import { Pokemon } from "../models/pokemon.model";
import { Type } from "../models/type.model";
import { AppState } from "../state/app.state";

@Injectable({
    providedIn: 'root'
})
export class PokemonService {

    private _store: NgStore<AppState> = inject(NgStore);

    public loadPokemonByType(id: number): Observable<Pokemon[]> {
        return this._store.loadEntities<Pokemon, Type>(
            `http://localhost:3000/pokemons-with-type?typeId=${id}`, 
            s => s.pokemons,
            findStoreValueByKey(s => s.types, id),
            'pokemonsLoaded',
            false
        );
    }

    public loadTypes(): Observable<Type[]> {
        return this._store.loadAllEntities('http://localhost:3000/types', s => s.types);
    }

}