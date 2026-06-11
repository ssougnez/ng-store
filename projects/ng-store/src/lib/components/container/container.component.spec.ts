import { Component, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { QueryAction, StoreConfiguration } from '../../models';
import { NG_STORE_CONFIG } from '../../tokens';
import { NgSignalStoreContainerComponent, NgStoreTemplateDirective } from './container.component';

@Component({
  imports: [NgSignalStoreContainerComponent, NgStoreTemplateDirective],
  template: `
    <ngs-container [action]="action" loaderType="none">
      <ng-container *ngsTemplate="action as value">{{ value }}</ng-container>
    </ngs-container>
  `
})
class HostComponent {
  public action!: QueryAction<number, string, string>;
}

describe('QueryAction.value', () => {
  let fixture: ComponentFixture<HostComponent>;
  let querySubject: Subject<number>;
  let dataSubject: Subject<string>;
  let dependency: WritableSignal<number>;

  const createAction = (changed?: (data: string, firstTime: boolean) => void): QueryAction<number, string, string> => {
    return new QueryAction({
      query: () => querySubject.asObservable(),
      data: () => {
        dependency();

        return dataSubject.asObservable();
      },
      converter: data => data.toUpperCase(),
      changed
    });
  };

  beforeEach(() => {
    querySubject = new Subject<number>();
    dataSubject = new Subject<string>();
    dependency = signal(0);

    TestBed.configureTestingModule({
      providers: [
        { provide: NG_STORE_CONFIG, useValue: {} as StoreConfiguration }
      ]
    });

    fixture = TestBed.createComponent(HostComponent);
  });

  it('should be null before any emission', () => {
    const action = createAction();

    expect(action.value()).toBeNull();

    fixture.componentInstance.action = action;
    fixture.detectChanges();

    querySubject.next(1);

    expect(action.value()).toBeNull();
  });

  it('should contain the converted result after emission', () => {
    const action = createAction();

    fixture.componentInstance.action = action;
    fixture.detectChanges();

    querySubject.next(1);
    dataSubject.next('raw');

    expect(action.value()).toBe('RAW');
  });

  it('should reset to null when the action is re-executed', () => {
    const action = createAction();

    fixture.componentInstance.action = action;
    fixture.detectChanges();

    querySubject.next(1);
    dataSubject.next('raw');

    expect(action.value()).toBe('RAW');

    dependency.set(1);
    fixture.detectChanges();

    expect(action.value()).toBeNull();

    querySubject.next(2);
    dataSubject.next('updated');

    expect(action.value()).toBe('UPDATED');
  });

  it('should already hold the converted result when changed is invoked', () => {
    const seen: (string | null)[] = [];
    const action = createAction(data => seen.push(action.value()));

    fixture.componentInstance.action = action;
    fixture.detectChanges();

    querySubject.next(1);
    dataSubject.next('raw');

    expect(seen).toEqual(['RAW']);
  });
});
