import { Observable, OperatorFunction } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function filterArray<T>(selector: (item: T) => boolean, distinct: boolean = true): OperatorFunction<T[], T[]> {
    return (source: Observable<T[]>) => {
        return source
            .pipe(
                map(array => array.filter(selector)),
                distinctUntilChanged((previous: T[], current: T[]) => {
                    if (distinct === false || previous.length !== current.length) {
                        return false;
                    }

                    for (let i = 0, length = previous.length; i < length; ++i) {
                        if (previous[i] !== current[i]) {
                            return false;
                        }
                    }

                    return true;
                })
            );
    }
};
