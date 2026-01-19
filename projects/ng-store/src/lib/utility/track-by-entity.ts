import { BaseEntity, Entity } from "../models";

/**
 * @deprecated This will be dropped. Use @for (item in list; track item.value.id) instead
 */
export function trackByEntity<T>(_: number, entity: Entity<BaseEntity<T>>): T {
  return entity.value.id;
}
