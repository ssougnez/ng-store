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
  public remove(): void {
    this._store.removeValuesByKeys<Pokemon>(s => s.pokemons, 1, 2);
  }

  /** */
  public removeNormal(): void {
    this._store.removeValuesBy(s => s.pokemons, p => p.type === 'normal');
  }

}
