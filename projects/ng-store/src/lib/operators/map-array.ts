import { Observable, OperatorFunction } from 'rxjs';
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
 * // Transform entities to values
 * store.selectEntities(s => s.books).pipe(
 *   mapArray(entity => entity.value)
 * ).subscribe(books => {
 *   console.log(books);
 * });
 *
 * // Extract specific property
 * store.selectValues(s => s.books).pipe(
 *   mapArray(book => book.title)
 * ).subscribe(titles => {
 *   console.log(titles);
 * });
 * ```
 */
export function mapArray<T, TReturn>(mapper: (item: T) => TReturn): OperatorFunction<T[], TReturn[]> {
    return (source: Observable<T[]>) => {
        return source
            .pipe(
                map(array => array.map(mapper))
            );
    }
};
