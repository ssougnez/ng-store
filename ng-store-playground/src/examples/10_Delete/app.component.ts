import { AsyncPipe, JsonPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TrackByFunction } from '@angular/core';
import { Entity, NgStore, NgStoreContainerComponent, NgStoreModule, trackByEntity, trackByValue } from '@ssougnez/ng-store';
import { map, Observable } from 'rxjs';
import { Pokemon } from './models/pokemon.model';
import { PokemonService } from './services/pokemon.service';
import { AppState } from './state/app.state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgStoreContainerComponent
  ]
})
export class AppComponent {

  /************************************************** SERVICES **************************************************/

  private readonly _pokemonService = inject(PokemonService);
  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** OBSERVABLES **************************************************/

  public query$: Observable<Pokemon[]> = this._pokemonService.loadPokemons();
  public pokemons$: Observable<Entity<Pokemon>[]> = this._store.selectEntities<Pokemon>(s => s.pokemons).pipe(
    map(pokemons => pokemons.sort((p1, p2) => p1.value.name.localeCompare(p2.value.name)))
  );

  public trackByEntity: TrackByFunction<Entity<Pokemon>> = trackByEntity;

  /************************************************** PUBLIC **************************************************/

  /** */
  public deletePokemon(id: number) {
    this._pokemonService
      .deletePokemon(id)
      .subscribe({
        error: err => console.log(err)
      })
  }
}