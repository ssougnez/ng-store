import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgStore } from '@ssougnez/ng-store';
import { map, Observable } from 'rxjs';
import { PokemonCreationData, PokemonType } from '../../models/pokemon.model';
import { PokemonService } from '../../services/pokemon.service';
import { AppState } from '../../state/app.state';

type FormData = {
  name: FormControl<string | null>;
  type: FormControl<PokemonType | null>;
}

@Component({
  selector: 'app-pokemon-add-form',
  templateUrl: './pokemon-add-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    AsyncPipe,
    ReactiveFormsModule
  ]
})
export class PokemonAddFormComponent implements OnInit {

  /************************************************** SERVICES **************************************************/

  private readonly _fb = inject(FormBuilder);
  private readonly _pokemonService = inject(PokemonService);
  private readonly _store: NgStore<AppState> = inject(NgStore);

  /************************************************** VARIABLE **************************************************/

  public form!: FormGroup<FormData>;

  /************************************************** OBSERVABLES **************************************************/

  public adding$: Observable<boolean> = this._store.select(s => s.pokemons).pipe(map(e => e.adding));

  /************************************************** LIFE CYCLE **************************************************/

  public ngOnInit(): void {
    this.form = this._fb.group({
      'name': new FormControl<string | null>(null, Validators.required),
      'type': new FormControl<PokemonType | null>(null, Validators.required),
    });
  }

  /************************************************** PUBLIC **************************************************/

  /** */
  public add() {
    const data: PokemonCreationData = {
      name: this.form.value.name!,
      type: this.form.value.type!
    };

    this._pokemonService
      .addPokemon(data)
      .subscribe({
        next: () => this.form.reset({ name: null, type: null }),
        error: err => console.log(err)
      })
  }
}
