import { Observable, OperatorFunction } from 'rxjs';
import { map } from 'rxjs/operators';

export function mapArray<T, TReturn>(mapper: (item: T) => TReturn): OperatorFunction<T[], TReturn[]> {
    return (source: Observable<T[]>) => {
        return source
            .pipe(
                map(array => array.map(mapper))
            );
    }
};
