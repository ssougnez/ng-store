# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ng-store is an Angular library (`@areaprog/ng-store`) that provides reactive state management using Immer for immutable updates. It's designed to manage collections of entities with built-in support for loading states, HTTP operations, and indexing.

## Build Commands

```bash
# Build the library
ng build ng-store

# Build and package for npm publishing
npm run package

# Run tests (no tests currently exist)
ng test ng-store
```

## Architecture

### Core Concepts

**Entities and Collections**: The store manages data in two primary structures:
- `Entity<T>`: Wraps a single value with state flags (`loading`, `loaded`, `busy`, `deleting`, `updating`)
- `Entities<T>`: A collection of entities with internal indexing via `_entities` (Map), `_array`, and `_indices`

**Sparse Arrays**: The store uses sparse arrays when deleting entities (creates holes instead of compacting). This is an Immer optimization that avoids marking all entities as changed.

**Indices**: Collections support indexed lookups on specified properties for O(1) access via `selectEntitiesByIndex`, `findValueByIndex`, etc.

### Key Files

- `projects/ng-store/src/lib/services/ng-store.service.ts` - Main `NgStore<TStore>` service with all store operations
- `projects/ng-store/src/lib/models/actions.model.ts` - `QueryAction` and `ExecuteAction` classes for reactive data fetching
- `projects/ng-store/src/lib/components/container/container.component.ts` - `ngs-container` component for declarative data loading
- `projects/ng-store/src/lib/provider.ts` - `provideStore()` function for configuration

### Store Configuration

Configure via `provideStore()`:
```typescript
provideStore({
  httpClientType: HttpClient,  // Must implement IHttpClient interface
  initialValue: initialStoreState,
  loaderComponent: MyLoaderComponent,
  errorComponent: MyErrorComponent
})
```

### Entity Requirements

All entities must have an `id` property (`BaseEntity<TKey>`). The id is used for internal indexing and entity lookup.

### State Management Pattern

Store updates use Immer's `produce` function internally. The `update()` method provides access to both draft and original state:
```typescript
store.update((draft, original) => {
  // mutate draft directly
});
```

### HTTP Integration

The store expects an HTTP client implementing `IHttpClient` interface (get, post, put, delete methods). Built-in methods like `loadAllEntities`, `postEntity`, `putEntityByKey`, `deleteEntityByKey` manage loading/busy states automatically.

## Dependencies

- Angular 20+
- Immer (for immutable state updates)
- @areaprog/rxjs-plus (peer dependency)
- RxJS

## Test Data (json-server)

The test app uses json-server to mock an API. There are two JSON files:
- `db.template.json` - The source template, committed to git. **Always modify this file** when changing test data.
- `db.json` - The working copy used by json-server at runtime. This file is gitignored and regenerated from the template.

When adding or modifying test data (authors, books, etc.), edit `db.template.json`, not `db.json`.

## Windows Notes

Always delete the `NUL` file if it gets created. On Windows, commands like `> NUL` create a file instead of redirecting to null device.
