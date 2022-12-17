import { AsyncPipe, JsonPipe, NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TrackByFunction } from '@angular/core';
import { Entity, NgStore, trackByEntity, trackByValue } from 'ng-store';
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

  public firstValue: Pokemon | null = this._store.findValueByKey(s => s.pokemons, 1);
  public firstEntity: Entity<Pokemon> | null = this._store.findEntityByKey(s => s.pokemons, 1);

  public values: Pokemon[] = this._store.getValues(s => s.pokemons);
  public entities: Entity<Pokemon>[] = this._store.getEntities(s => s.pokemons);

  public normalValues: Pokemon[] = this._store.findValuesBy(s => s.pokemons, p => p.type === 'normal');
  public normalEntities: Entity<Pokemon>[] = this._store.findEntitiesBy(s => s.pokemons, e => e.value.type === 'normal');

  public trackByEntity: TrackByFunction<Entity<Pokemon>> = trackByEntity;
  public trackByValue: TrackByFunction<Pokemon> = trackByValue;

}
