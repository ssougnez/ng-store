import { Observable, of, OperatorFunction } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';

// TODO: UPdate with MonoTypeOperatorFunction and lift
export function mapToError<T>(): OperatorFunction<T, any> {
    return (source: Observable<any>) => {
        return source
            .pipe(
                map(() => null),
                catchError(err => of(err))
            );
    }
};