import { AsyncPipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgStore } from 'ng-store';
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
    JsonPipe
  ]
})
export class AppComponent {

  public store: NgStore<AppState> = inject(NgStore);

  public pokemons$: Observable<Pokemon[]> = this.store.selectValues(s => s.pokemons);
  public pokemons: Pokemon[] = this.store.getValues(s => s.pokemons);

}
