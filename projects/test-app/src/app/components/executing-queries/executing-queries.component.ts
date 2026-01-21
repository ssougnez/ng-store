import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  protected readonly executingQueries = toSignal(this._store.executingQueries$, { initialValue: new Set<string>() });
}
