import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TrackByFunction } from '@angular/core';
import { NgStore, NgStoreContainerComponent, trackByValue } from '@ssougnez/ng-store';
import { map, Observable } from 'rxjs';
import { PokemonAddFormComponent } from './components/pokemon-add-form/pokemon-add-form.component';
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
    NgStoreContainerComponent,
    PokemonAddFormComponent
  ]
})
export class AppComponent {

  /************************************************** SERVICES **************************************************/

  private readonly _pokemonService = inject(PokemonService);
  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** VARIABLES **************************************************/

  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

  /************************************************** OBSERVABLES **************************************************/

  public query$: Observable<Pokemon[]> = this._pokemonService.loadPokemons();
  public data$: Observable<Pokemon[]> = this._store.selectValues<Pokemon>(s => s.pokemons).pipe(
    map(pokemons => pokemons.sort((p1, p2) => p1.name.localeCompare(p2.name)))
  );

}
