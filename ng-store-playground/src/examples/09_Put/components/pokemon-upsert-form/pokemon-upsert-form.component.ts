import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgStore, NgStoreModule } from '@ssougnez/ng-store';
import { filter, map, Observable, of, take } from 'rxjs';
import { Pokemon, PokemonType, PokemonUpsertData } from '../../models/pokemon.model';
import { PokemonService } from '../../services/pokemon.service';
import { AppState } from '../../state/app.state';

type FormData = {
  id: FormControl<number | null>;
  name: FormControl<string | null>;
  type: FormControl<PokemonType | null>;
}

@Component({
  selector: 'app-pokemon-upsert-form',
  templateUrl: './pokemon-upsert-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    AsyncPipe,
    JsonPipe,
    NgIf,
    NgStoreModule,
    ReactiveFormsModule
  ]
})
export class PokemonUpsertFormComponent implements OnInit {

  /************************************************** BINDINGS **************************************************/

  @Input()
  public set id(value: number | null) {
    this.query$ = value === null ? of(null) : this._pokemonService.loadPokemonById(value);
    this.data$ = value === null ? of(null) : this._store.selectValueByKey(s => s.pokemons, value).pipe(filter(e => e !== null), take(1));
  }

  /************************************************** SERVICES **************************************************/

  private readonly _fb = inject(FormBuilder);
  private readonly _pokemonService = inject(PokemonService);
  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** VARIABLE **************************************************/

  public form!: FormGroup<FormData>;

  /************************************************** OBSERVABLES **************************************************/

  public busy$: Observable<boolean> = this._store.select(s => s.pokemons).pipe(map(e => e.busy));
  public data$!: Observable<Pokemon | null>;
  public query$!: Observable<Pokemon | null>;

  /************************************************** LIFE CYCLE **************************************************/

  public ngOnInit(): void {
    this.form = this._fb.group({
      'id': new FormControl<number | null>(null),
      'name': new FormControl<string | null>(null, Validators.required),
      'type': new FormControl<PokemonType | null>(null, Validators.required),
    });
  }

  /************************************************** PUBLIC **************************************************/

  /** */
  public add() {
    const data: PokemonUpsertData = {
      id: this.form.value.id!,
      name: this.form.value.name!,
      type: this.form.value.type!
    };

    this._pokemonService
      .upsertPokemon(data)
      .subscribe({
        next: () => this.form.value.id === null && this.reset(null),
        error: err => console.log(err)
      })
  }

  /** */
  public reset(pokemon: Pokemon | null) {
    this.form.reset({
      id: pokemon?.id || null,
      name: pokemon?.name || null,
      type: pokemon?.type || null
    })
  }

}
