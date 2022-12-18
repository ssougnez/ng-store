import { AsyncPipe, JsonPipe, NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, TrackByFunction } from '@angular/core';
import { NgStore, NgStoreModule, trackByValue } from 'ng-store';
import { map, Observable } from 'rxjs';
import { Pokemon } from '../models/pokemon.model';
import { PokemonService } from '../services/pokemon.service';
import { AppState } from '../state/app.state';

@Component({
  selector: 'app-pokemon',
  templateUrl: './pokemon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    JsonPipe,
    NgStoreModule
  ]
})
export class PokemonComponent {

  /************************************************** BINDINGS **************************************************/

  @Input()
  public set id(value: number) {
    this.query$ = this._pokemonService.loadPokemonById(value);
    this.pokemon$ = this._store.selectValueByKey(s => s.pokemons, value);
  }

  /************************************************** SERVICES **************************************************/

  private readonly _pokemonService = inject(PokemonService);
  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** VARIABLES **************************************************/

  public query$!: Observable<Pokemon>;
  public pokemon$!: Observable<Pokemon | null>;

}
