import { inject, Injectable } from "@angular/core";
import { NgStore } from "@ssougnez/ng-store";
import { Observable, tap } from "rxjs";
import { Pokemon, PokemonUpsertData } from "../models/pokemon.model";
import { AppState } from "../state/app.state";

@Injectable({
    providedIn: 'root'
})
export class PokemonService {

    private _store: NgStore<AppState> = inject(NgStore);

    public upsertPokemon(data: PokemonUpsertData): Observable<Pokemon> {
        const action$ = data.id === null
            ? this._store.postEntity(`http://localhost:3000/pokemons-full`, s => s.pokemons, data)
            : this._store.putEntityByKey<Pokemon>(`http://localhost:3000/pokemons-full/${data.id}`, s => s.pokemons, data.id, data);

        return action$.pipe(
            tap(pokemon => this._store.upsertValue(s => s.pokemons, pokemon))
        );
    }

    public loadPokemons(): Observable<Pokemon[]> {
        return this._store.loadAllEntities('http://localhost:3000/pokemons-full', s => s.pokemons);
    }

    public loadPokemonById(id: number): Observable<Pokemon> {
        return this._store.loadEntityByKey(`http://localhost:3000/pokemons-full/${id}`, s => s.pokemons, id);
    }

}