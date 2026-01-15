import { Directive, Signal, inject, isSignal } from "@angular/core";
import { Observable } from "rxjs";
import { NgStore } from "../services";

@Directive()
export class StoreComponent<TStore, TData> {

  /************************************************** SERVICES **************************************************/

  protected readonly _store: NgStore<TStore> = inject(NgStore<TStore>);

  /************************************************** ACCESSORS **************************************************/

  public get data$(): Observable<TData> | undefined { return this._cast(this._data$); }
  public set data$(value: Observable<TData> | Signal<Observable<TData>>) { this._data$ = value; }

  public get query$(): Observable<any> | undefined { return this._cast(this._query$); }
  public set query$(value: Observable<any> | Signal<Observable<any>>) { this._query$ = value; }

  /************************************************** VARIABLES **************************************************/

  private _data$: Observable<TData> | Signal<Observable<TData>> | undefined = undefined;
  private _query$: Observable<any> | Signal<Observable<any>> | undefined = undefined;

  /************************************************** PRIVATE **************************************************/

  /** */
  private _cast(value: Observable<any> | Signal<Observable<any>> | undefined) {
    if (value === undefined) {
      return undefined;
    }

    if (isSignal(value)) {
      return value();
    }

    return value;
  }
}
