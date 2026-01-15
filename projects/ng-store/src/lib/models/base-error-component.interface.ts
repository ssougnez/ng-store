import { InputSignal } from "@angular/core";

export interface IBaseErrorComponent {
  error: Error | InputSignal<Error>;
}
