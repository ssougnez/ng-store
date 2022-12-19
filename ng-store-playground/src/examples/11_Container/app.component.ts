import { AsyncPipe, JsonPipe, NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TrackByFunction } from '@angular/core';
import { NgStore, trackByValue } from '@ssougnez/ng-store';
import { map, Observable } from 'rxjs';
import { Pokemon } from './models/pokemon.model';
import { AppState } from './state/app.state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    AsyncPipe,
    NgFor,
    JsonPipe
  ]
})
export class AppComponent {

  /************************************************** SERVICES **************************************************/

  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** VARIABLES **************************************************/

  public pokemons$: Observable<Pokemon[]> = this._store.selectValues<Pokemon>(s => s.pokemons).pipe(
    map(pokemons => pokemons.sort((p1, p2) => p1.name.localeCompare(p2.name)))
  );

  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

  /************************************************** PUBLIC **************************************************/

  /** */
  public upsertNonExisting(): void {
    const pokemon: Pokemon = {
      id: 13,
      name: 'Vulpix',
      type: 'fire'
    };

    this._store.upsertValue<Pokemon>(s => s.pokemons, pokemon);
  }

  /** */
  public upsertExisting(): void {
    const pokemon: Pokemon = {
      id: 1,
      name: 'Zubat',
      type: 'poison'
    };

    this._store.upsertValue<Pokemon>(s => s.pokemons, pokemon);
  }

  /** */
  public updateExisting(): void {
    this._store.updateValueByKey(s => s.pokemons, 1, p => p.name = 'Jigglypuff');
  }
}
