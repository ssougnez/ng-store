import { BaseEntity } from "../models";

/**
 * @deprecated This will be dropped. Use @for (item in list; track item.id) instead
 */
export function trackByValue<T>(_: number, entity: BaseEntity<T>): T {
  return entity.id;
}
