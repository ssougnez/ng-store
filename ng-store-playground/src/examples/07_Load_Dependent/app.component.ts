import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TrackByFunction } from '@angular/core';
import { NgStore, NgStoreModule, trackByValue } from 'ng-store';
import { map, Observable } from 'rxjs';
import { PokemonByTypeComponent } from './components/pokemon-by-type.component';
import { Pokemon } from './models/pokemon.model';
import { Type } from './models/type.model';
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
    NgStoreModule,
    PokemonByTypeComponent,
  ]
})
export class AppComponent {

  /************************************************** SERVICES **************************************************/

  private readonly _pokemonService = inject(PokemonService);
  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** VARIABLES **************************************************/

  public selectedId: number | null = null;

  /************************************************** OBSERVABLES **************************************************/

  public query$: Observable<Type[]> = this._pokemonService.loadTypes();
  public types$: Observable<Type[]> = this._store.selectValues<Type>(s => s.types).pipe(
    map(types => types.sort((t1, t2) => t1.name.localeCompare(t2.name)))
  );

  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

}
