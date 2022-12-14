import { Directive, inject } from "@angular/core";
import { Observable } from "rxjs";
import { NgStore } from "../services";

@Directive()
export class StoreComponent<TStore, TData> {

    public query$!: Observable<any>;
    public data$!: Observable<TData>;

    protected _store: NgStore<TStore> = inject(NgStore<TStore>);

}