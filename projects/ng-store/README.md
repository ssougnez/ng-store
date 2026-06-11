# NgStore

This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 14.0.0.

## Code scaffolding

Run `ng generate component component-name --project ng-store` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module --project ng-store`.
> Note: Don't forget to add `--project ng-store` or else it will be added to the default project in your `angular.json` file. 

## Build

Run `ng build ng-store` to build the project. The build artifacts will be stored in the `dist/` directory.

## Publishing

Publishing to npm is automated via GitHub Actions (`.github/workflows/publish.yml`):

- **Pre-release**: pushing commits to a version branch named `X.Y.Z` (e.g. `2.0.0`)
  publishes `@areaprog/ng-store@X.Y.Z-beta.N` under the `beta` dist-tag. `N` is
  auto-incremented from the highest existing beta on npm.
  Consumers install it with `npm i @areaprog/ng-store@beta`.
- **Stable release**: pushing a git tag named `vX.Y.Z` (e.g. `v2.0.0`) publishes
  `@areaprog/ng-store@X.Y.Z` under the `latest` dist-tag.
  Consumers install it with `npm i @areaprog/ng-store`.

The published version is derived from the branch/tag name and injected into the
built `dist/ng-store/package.json` at CI time, so the source `version` stays `0.0.0`.
Publishing requires the `NPM_TOKEN` repository secret (a token with write access to
the `@areaprog` npm scope).

## QueryAction

A `QueryAction` describes a reactive data load: a `query` observable provides the parameters, `data` fetches the data, and an optional `converter` transforms the raw result. It is executed declaratively by the `ngs-container` component.

```typescript
export class BookListComponent {
  readonly loadBooks = new QueryAction({
    query: () => this.route.params.pipe(map(p => p['authorId'])),
    data: (authorId) => this.store.loadEntities(
      `/api/authors/${authorId}/books`,
      s => s.books,
      s => this.store.findNullableValueByKey(s => s.authors, authorId),
      'booksLoaded'
    ),
    converter: (books) => books.map(toBookViewModel)
  });
}
```

```html
<ngs-container [action]="loadBooks">
  <ng-container *ngsTemplate="loadBooks as books">
    <!-- Content shown when loaded -->
  </ng-container>
</ngs-container>
```

### Signals

- `processing` returns true while the query observable has not emitted yet.
- `value` holds the last converted result emitted by the action. It is null until a result has been emitted and resets to null whenever the action restarts. When the `changed` callback is invoked, `value()` already holds the value passed to the callback. If several containers consume the same action instance, the last container to emit wins, exactly like `processing`.

### Reading the result from the component class

The template receives the result through the `*ngsTemplate` alias, but the component class can also read it through `value`. This is useful for selection driven components that combine the loaded data with local signals (selection, form values) in computed signals and read the result in methods such as a submit handler:

```typescript
export class ShopBuyComponent {
  readonly selectedId = signal<number | null>(null);

  readonly loadItems = new QueryAction({
    query: () => of(true),
    data: () => this.store.loadEntities('/api/items', s => s.items, null, 'itemsLoaded')
  });

  readonly view = computed(() => this._toView(this.loadItems.value(), this.selectedId()));

  submit(): void {
    const view = this.view();
    // ...
  }
}
```

Without `value`, the component would have to mirror the result into a private signal through the `changed` callback. Note that reading local signals inside the `data` callback is not equivalent: the container tracks `data()` as a dependency, so any signal change there re-executes the whole action.

## Running unit tests

Run `ng test ng-store` to execute the unit tests via [Vitest](https://vitest.dev).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
