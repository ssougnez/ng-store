import { ChangeDetectionStrategy, Component, inject, input, InputSignal, output, OutputEmitterRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExecuteAction } from '@areaprog/ng-store';
import { Book, BookCreationData } from '../../models/book.model';
import { BookService } from '../../services/book.service';

@Component({
  selector: 'app-add-book',
  imports: [FormsModule],
  templateUrl: './add-book.component.html',
  styleUrl: './add-book.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddBookComponent {

  private readonly _bookService = inject(BookService);

  public readonly authorId: InputSignal<number> = input.required<number>();
  public readonly bookAdded: OutputEmitterRef<Book> = output<Book>();

  protected readonly title = signal('');
  protected readonly year = signal(new Date().getFullYear());
  protected readonly isPublished = signal(false);
  protected readonly showForm = signal(false);

  protected readonly addAction = new ExecuteAction<BookCreationData, Book>({
    query: (book) => this._bookService.add(book),
    success: (newBook) => {
      this.bookAdded.emit(newBook);
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
    const book: BookCreationData = {
      title: this.title(),
      year: this.year(),
      authorId: this.authorId(),
      isPublished: this.isPublished()
    };

    this.addAction.execute(book);
  }

  private resetForm(): void {
    this.title.set('');
    this.year.set(new Date().getFullYear());
    this.isPublished.set(false);
  }
}
