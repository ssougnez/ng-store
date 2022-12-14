import { BaseEntity } from "../services";

export function trackByValue<T>(_: number, entity: BaseEntity<T>): T {
  return entity.id;
}
