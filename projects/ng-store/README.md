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

## Running unit tests

Run `ng test ng-store` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
