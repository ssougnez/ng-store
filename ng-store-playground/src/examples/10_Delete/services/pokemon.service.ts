import { inject, Injectable } from "@angular/core";
import { NgStore } from "@ssougnez/ng-store";
import { Observable, tap } from "rxjs";
import { Pokemon } from "../models/pokemon.model";
import { AppState } from "../state/app.state";

@Injectable({
    providedIn: 'root'
})
export class PokemonService {

    private _store: NgStore<AppState> = inject(NgStore);

    public deletePokemon(id: number): Observable<Pokemon> {
        return this._store.deleteEntityByKey(`http://localhost:3000/pokemons-full/${id}`, s => s.pokemons, id).pipe(
            tap(pokemon => this._store.removeValuesByKeys(s => s.pokemons, id))
        );
    }

    public loadPokemons(): Observable<Pokemon[]> {
        return this._store.loadAllEntities('http://localhost:3000/pokemons-full', s => s.pokemons);
    }

}