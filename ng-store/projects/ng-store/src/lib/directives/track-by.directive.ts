import { NgForOf } from "@angular/common";
import { Directive, Input, NgIterable, inject } from "@angular/core";
import { BaseEntity, Entity } from "../services";

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
