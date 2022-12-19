import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TrackByFunction } from '@angular/core';
import { NgStore, NgStoreModule, trackByValue } from '@ssougnez/ng-store';
import { map, Observable } from 'rxjs';
import { PokemonUpsertFormComponent } from './components/pokemon-upsert-form/pokemon-upsert-form.component';
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
    NgFor,
    NgStoreModule,
    PokemonUpsertFormComponent
  ]
})
export class AppComponent {

  /************************************************** SERVICES **************************************************/

  private readonly _pokemonService = inject(PokemonService);
  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** VARIABLES **************************************************/

  public selectedId: number | null = null;
  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

  /************************************************** OBSERVABLES **************************************************/

  public query$: Observable<Pokemon[]> = this._pokemonService.loadPokemons();
  public data$: Observable<Pokemon[]> = this._store.selectValues<Pokemon>(s => s.pokemons).pipe(
    map(pokemons => pokemons.sort((p1, p2) => p1.name.localeCompare(p2.name)))
  );

}
