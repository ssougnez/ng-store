import { OperatorFunction, pipe } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

/**
 * RxJS operator that filters items in an array stream.
 *
 * Unlike the standard `filter` operator which filters emissions,
 * this operator filters items within each emitted array.
 *
 * @template T - The type of items in the array
 * @param selector - Predicate function to test each item
 * @param distinct - Whether to apply distinctUntilChanged (default: true)
 * @returns An operator function that filters array items
 *
 * @remarks
 * When `distinct` is true (default), the operator compares arrays by reference
 * equality of their elements to prevent unnecessary emissions.
 *
 * @example
 * ```typescript
 * // Filter to only published books
 * store.selectValues(s => s.books).pipe(
 *   filterArray(book => book.published)
 * ).subscribe(publishedBooks => {
 *   console.log(publishedBooks);
 * });
 * ```
 */
export function filterArray<T>(selector: (item: T) => boolean, distinct: boolean = true): OperatorFunction<T[], T[]> {
    return pipe(
        map((array: T[]) => array.filter(selector)),
        distinctUntilChanged((previous: T[], current: T[]) => {
            if (!distinct || previous.length !== current.length) {
                return false;
            }
            return previous.every((item, i) => item === current[i]);
        })
    );
}
