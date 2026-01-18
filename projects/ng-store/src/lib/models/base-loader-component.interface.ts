import { InputSignal } from "@angular/core";

/**
 * Interface that loader components must implement to be used with `ngs-container`.
 *
 * The component receives a size hint that can be used to adjust the loader's dimensions.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-loader',
 *   template: `
 *     <div class="spinner" [style.width]="size()" [style.height]="size()">
 *       Loading...
 *     </div>
 *   `
 * })
 * export class AppLoaderComponent implements IBaseLoaderComponent {
 *   size = input<string>('48px');
 * }
 * ```
 */
export interface IBaseLoaderComponent {
  /**
   * The size of the loader.
   * Can be implemented as a regular property or an input signal.
   * Typically a CSS size value like '48px', '2rem', etc.
   */
  size: string | InputSignal<string>;
}
