import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, TrackByFunction } from '@angular/core';
import { NgStore, NgStoreModule, StoreComponent, trackByValue } from '@ssougnez/ng-store';
import { map, Observable } from 'rxjs';
import { Pokemon } from './models/pokemon.model';
import { PokemonService } from './services/pokemon.service';
import { AppState } from './state/app.state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgFor,
    NgStoreModule
  ]
})
export class AppComponent extends StoreComponent<AppState, Pokemon[]> implements OnInit {

  /************************************************** SERVICES **************************************************/

  private readonly _pokemonService = inject(PokemonService);

  /************************************************** OBSERVABLES **************************************************/

  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

  /************************************************** LIFE CYCLE **************************************************/

  public ngOnInit() {
    this.query$ = this._pokemonService.loadPokemons();
    this.data$ = this._store.selectValues<Pokemon>(s => s.pokemons).pipe(
      map(pokemons => pokemons.sort((p1, p2) => p1.name.localeCompare(p2.name)))
    );
  }

}
