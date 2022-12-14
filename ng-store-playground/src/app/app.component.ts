import { Component, inject } from '@angular/core';
import { NgStore } from 'ng-store';
import { Observable } from 'rxjs';
import { Pokemon } from './models/pokemon.model';
import { AppState } from './state/app.state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public store: NgStore<AppState> = inject(NgStore);

  public pokemons$: Observable<Pokemon[]> = this.store.selectValues(s => s.pokemons);

  public add() {
    this.store.upsertValue<Pokemon>(s => s.pokemons, { id: 1, name: 'Pikachu', type: 'electric' });
  }

  public update() {
    this.store.updateValueByKey<Pokemon>(s => s.pokemons, 1, p => p.name = 'Dracofeu');
  }

  public remove() {
    this.store.removeEntitiesByKeys<Pokemon>(s => s.pokemons, 1);
  }

  public reset() {
    this.store.reset();
  }

}
