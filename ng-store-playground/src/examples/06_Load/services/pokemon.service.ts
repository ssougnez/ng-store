import { inject, Injectable } from "@angular/core";
import { NgStore } from "ng-store";
import { Observable } from "rxjs";
import { Pokemon } from "../models/pokemon.model";
import { AppState } from "../state/app.state";

@Injectable({
    providedIn: 'root'
})
export class PokemonService {

    private _store: NgStore<AppState> = inject(NgStore);

    public loadPokemons(): Observable<Pokemon[]> {
        return this._store.loadAllEntities('http://localhost:3000/pokemons', s => s.pokemons, false);
    }

    public loadPokemonById(id: number): Observable<Pokemon> {
        return this._store.loadEntityByKey(`http://localhost:3000/pokemons-full/${id}`, s => s.pokemons, id);
    }

}