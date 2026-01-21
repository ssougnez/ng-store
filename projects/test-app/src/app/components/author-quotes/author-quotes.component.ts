import { ChangeDetectionStrategy, Component, inject, input, InputSignal } from '@angular/core';
import { NgSignalStoreContainerComponent, NgStore, NgStoreTemplateDirective, QueryAction } from '@areaprog/ng-store';
import { AppStore } from '../../models/store.model';
import { Author } from '../../models/author.model';
import { AuthorService } from '../../services/author.service';

@Component({
  selector: 'app-author-quotes',
  imports: [NgSignalStoreContainerComponent, NgStoreTemplateDirective],
  templateUrl: './author-quotes.component.html',
  styleUrl: './author-quotes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthorQuotesComponent {

  private readonly _authorService = inject(AuthorService);
  private readonly _store = inject<NgStore<AppStore>>(NgStore);

  public readonly authorId: InputSignal<number> = input.required<number>();

  protected readonly authorAction = new QueryAction({
    query: () => this._authorService.loadAuthorByKey(this.authorId()),
    data: () => this._store.selectValueByKey(s => s.authors, this.authorId())
  });
}
