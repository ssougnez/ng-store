import { TestBed } from '@angular/core/testing';

import { NgStoreService } from './ng-store.service';

describe('NgStoreService', () => {
  let service: NgStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
