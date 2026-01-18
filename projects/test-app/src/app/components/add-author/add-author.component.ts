import { ChangeDetectionStrategy, Component, inject, output, OutputEmitterRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExecuteAction } from '@areaprog/ng-store';
import { Author, AuthorCreationData } from '../../models/author.model';
import { AuthorService } from '../../services/author.service';

@Component({
  selector: 'app-add-author',
  imports: [FormsModule],
  templateUrl: './add-author.component.html',
  styleUrl: './add-author.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddAuthorComponent {

  private readonly _authorService = inject(AuthorService);

  public readonly authorAdded: OutputEmitterRef<Author> = output<Author>();

  protected readonly name = signal('');
  protected readonly country = signal('');
  protected readonly showForm = signal(false);

  protected readonly addAction = new ExecuteAction<AuthorCreationData, Author>({
    query: (author) => this._authorService.add(author),
    success: (newAuthor) => {
      this.authorAdded.emit(newAuthor);
      this.resetForm();
      this.showForm.set(false);
    }
  });

  protected toggleForm(): void {
    this.showForm.update(v => !v);

    if (!this.showForm()) {
      this.resetForm();
    }
  }

  protected submit(): void {
    const author = {
      name: this.name(),
      country: this.country()
    };

    this.addAction.execute(author);
  }

  private resetForm(): void {
    this.name.set('');
    this.country.set('');
  }
}
