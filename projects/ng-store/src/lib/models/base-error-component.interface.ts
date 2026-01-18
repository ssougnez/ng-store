import { InputSignal } from "@angular/core";

/**
 * Interface that error components must implement to be used with `ngs-container`.
 *
 * The component will receive the error that occurred during data loading.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-error',
 *   template: `
 *     <div class="error">
 *       <h3>An error occurred</h3>
 *       <p>{{ error().message }}</p>
 *     </div>
 *   `
 * })
 * export class AppErrorComponent implements IBaseErrorComponent {
 *   error = input.required<Error>();
 * }
 * ```
 */
export interface IBaseErrorComponent {
  /**
   * The error that occurred.
   * Can be implemented as a regular property or an input signal.
   */
  error: Error | InputSignal<Error>;
}
