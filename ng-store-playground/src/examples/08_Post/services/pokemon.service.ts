import { inject, Injectable } from "@angular/core";
import { NgStore } from "@ssougnez/ng-store";
import { Observable, tap } from "rxjs";
import { Pokemon, PokemonCreationData } from "../models/pokemon.model";
import { AppState } from "../state/app.state";

@Injectable({
    providedIn: 'root'
})
export class PokemonService {

    private _store: NgStore<AppState> = inject(NgStore);

    public addPokemon(data: PokemonCreationData): Observable<Pokemon> {
        return this._store
            .postEntity<Pokemon>('http://localhost:3000/pokemons-full', s => s.pokemons, data)
            .pipe(
                tap(pokemon => this._store.upsertValue(s => s.pokemons, pokemon))
            );
    }

    public loadPokemons(): Observable<Pokemon[]> {
        return this._store.loadAllEntities('http://localhost:3000/pokemons-full', s => s.pokemons);
    }

}