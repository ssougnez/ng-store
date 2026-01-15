import { NgForOf } from "@angular/common";
import { Directive, Input, NgIterable, inject } from "@angular/core";
import { BaseEntity, Entity } from "../services";

/**
 * @deprecated This will be dropped. Use @for (item in list; track item.id) instead
 */
@Directive({
  selector: '[ngForTrackByValue]',
  standalone: true
})
export class NgForTrackByValueDirective<T extends BaseEntity<any>> {

  /****************************************************************** BINDINGS ******************************************************************/

  @Input()
  public ngForOf!: NgIterable<T>;

  /****************************************************************** VARIABLES ******************************************************************/

  private readonly _ngFor = inject(NgForOf<T>, { self: true });

  /****************************************************************** LIFE CYCLE ******************************************************************/

  constructor() {
    this._ngFor.ngForTrackBy = (_: number, item: T) => item.id;
  }
}

/**
 * @deprecated This will be dropped. Use @for (item in list; track item.value.id) instead
 */
@Directive({
  selector: '[ngForTrackByEntity]',
  standalone: true
})
export class NgForTrackByEntityDirective<T extends Entity<BaseEntity<any>>> {

  /****************************************************************** BINDINGS ******************************************************************/

  @Input()
  public ngForOf!: NgIterable<T>;

  /****************************************************************** VARIABLES ******************************************************************/

  private readonly _ngFor = inject(NgForOf<T>, { self: true });

  /****************************************************************** LIFE CYCLE ******************************************************************/

  constructor() {
    this._ngFor.ngForTrackBy = (_: number, item: T) => item.value.id;
  }
}
