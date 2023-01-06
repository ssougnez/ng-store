import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TrackByFunction } from '@angular/core';
import { NgStore, NgStoreContainerComponent, trackByValue } from '@ssougnez/ng-store';
import { map, Observable } from 'rxjs';
import { PokemonComponent } from './components/pokemon.component';
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
    NgStoreContainerComponent,
    PokemonComponent
  ]
})
export class AppComponent {

  /************************************************** SERVICES **************************************************/

  private readonly _pokemonService = inject(PokemonService);
  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** VARIABLES **************************************************/

  public selectedId: number | null = null;

  /************************************************** OBSERVABLES **************************************************/

  public query$: Observable<Pokemon[]> = this._pokemonService.loadPokemons();
  public pokemons$: Observable<Pokemon[]> = this._store.selectValues<Pokemon>(s => s.pokemons).pipe(
    map(pokemons => pokemons.sort((p1, p2) => p1.name.localeCompare(p2.name)))
  );

  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

}
