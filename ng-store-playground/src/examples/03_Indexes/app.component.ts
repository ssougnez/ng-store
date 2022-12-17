import { AsyncPipe, JsonPipe, NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TrackByFunction } from '@angular/core';
import { Entity, NgStore, trackByEntity, trackByValue } from 'ng-store';
import { Observable } from 'rxjs';
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

  public normalValues$: Observable<Pokemon[]> = this._store.selectValuesByIndex<Pokemon>(s => s.pokemons, 'type', 'normal');
  public normalEntities$: Observable<Entity<Pokemon>[]> = this._store.selectEntitiesByIndex<Pokemon>(s => s.pokemons, 'type', 'normal');

  public trackByEntity: TrackByFunction<Entity<Pokemon>> = trackByEntity;
  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

}
