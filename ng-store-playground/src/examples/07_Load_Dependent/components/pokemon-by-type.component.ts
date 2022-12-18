import { AsyncPipe, JsonPipe, NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, TrackByFunction } from '@angular/core';
import { NgStore, NgStoreModule, trackByValue } from 'ng-store';
import { map, Observable } from 'rxjs';
import { Pokemon } from '../models/pokemon.model';
import { PokemonService } from '../services/pokemon.service';
import { AppState } from '../state/app.state';

@Component({
  selector: 'app-pokemon-by-type',
  templateUrl: './pokemon-by-type.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    JsonPipe,
    NgFor,
    NgStoreModule
  ]
})
export class PokemonByTypeComponent {

  /************************************************** BINDINGS **************************************************/

  @Input()
  public set id(value: number) {
    this.query$ = this._pokemonService.loadPokemonByType(value);
    this.pokemons$ = this._store.selectValuesByIndex<Pokemon>(s => s.pokemons, 'typeId', value);
  }

  /************************************************** SERVICES **************************************************/

  private readonly _pokemonService = inject(PokemonService);
  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** VARIABLES **************************************************/

  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

  /************************************************** OBSERVABLES **************************************************/

  public query$!: Observable<Pokemon[]>;
  public pokemons$!: Observable<Pokemon[]>;

}
