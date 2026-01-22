import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgStore } from '@areaprog/ng-store';
import { AppStore } from '../../models/store.model';

@Component({
  selector: 'app-executing-queries',
  templateUrl: './executing-queries.component.html',
  styleUrl: './executing-queries.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExecutingQueriesComponent {

  private readonly _store = inject<NgStore<AppStore>>(NgStore);

  protected readonly executingGetQueries = toSignal(this._store.executingQueries$, { initialValue: new Set<string>() });
  protected readonly executingDeleteQueries = toSignal(this._store.executingDeleteQueries$, { initialValue: new Set<string>() });

  protected readonly hasQueries = computed(() => this.executingGetQueries().size > 0 || this.executingDeleteQueries().size > 0);
}
