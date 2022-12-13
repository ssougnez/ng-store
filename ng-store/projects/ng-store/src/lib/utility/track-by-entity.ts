import { BaseEntity, Entity } from "../services";

export function trackByEntity<T>(_: number, entity: Entity<BaseEntity<T>>): T {
  return entity.value.id;
}
