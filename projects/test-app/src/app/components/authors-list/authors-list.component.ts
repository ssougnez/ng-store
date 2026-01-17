import { ChangeDetectionStrategy, Component, inject, output, OutputEmitterRef } from '@angular/core';
import { of } from 'rxjs';
import { NgSignalStoreContainerComponent, NgStore, NgStoreTemplateDirective, QueryAction } from '@areaprog/ng-store';
import { Author } from '../../models/author.model';
import { AuthorService } from '../../services/author.service';
import { AppStore } from '../../models/store.model';

@Component({
  selector: 'app-authors-list',
  imports: [NgSignalStoreContainerComponent, NgStoreTemplateDirective],
  templateUrl: './authors-list.component.html',
  styleUrl: './authors-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthorsListComponent {

  private readonly _authorService = inject(AuthorService);
  private readonly _store = inject<NgStore<AppStore>>(NgStore);

  public readonly authorSelected: OutputEmitterRef<number> = output<number>();

  protected readonly authorsAction = new QueryAction({
    query: () => this._authorService.loadAll(),
    data: () => this._store.selectValues(s => s.authors)
  });

  protected selectAuthor(author: Author): void {
    this.authorSelected.emit(author.id);
  }
}
