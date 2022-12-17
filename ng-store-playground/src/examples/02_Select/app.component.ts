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

  public firstValue$: Observable<Pokemon | null> = this._store.selectValueByKey(s => s.pokemons, 1);
  public firstEntity$: Observable<Entity<Pokemon> | null> = this._store.selectEntityByKey(s => s.pokemons, 1);

  public values$: Observable<Pokemon[]> = this._store.selectValues(s => s.pokemons);
  public entities$: Observable<Entity<Pokemon>[]> = this._store.selectEntities(s => s.pokemons);

  public normalValues$: Observable<Pokemon[]> = this._store.selectValuesBy(s => s.pokemons, p => p.type === 'normal');
  public normalEntities$: Observable<Entity<Pokemon>[]> = this._store.selectEntitiesBy(s => s.pokemons, e => e.value.type === 'normal');

  public trackByEntity: TrackByFunction<Entity<Pokemon>> = trackByEntity;
  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

}
