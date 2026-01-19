import { OperatorFunction, pipe } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * RxJS operator that transforms items in an array stream.
 *
 * Unlike the standard `map` operator which transforms the entire emission,
 * this operator transforms each item within the emitted array.
 *
 * @template T - The type of items in the input array
 * @template TReturn - The type of items in the output array
 * @param mapper - Function to transform each item
 * @returns An operator function that maps array items
 *
 * @example
 * ```typescript
 * // Extract specific property from values
 * store.selectValues(s => s.books).pipe(
 *   mapArray(book => book.title)
 * ).subscribe(titles => {
 *   console.log(titles);
 * });
 *
 * // Transform to a different structure
 * store.selectValues(s => s.books).pipe(
 *   mapArray(book => ({ id: book.id, label: book.title }))
 * ).subscribe(options => {
 *   console.log(options);
 * });
 * ```
 */
export function mapArray<T, TReturn>(mapper: (item: T) => TReturn): OperatorFunction<T[], TReturn[]> {
    return pipe(
        map((array: T[]) => array.map(mapper))
    );
}
