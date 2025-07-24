import { TestBed } from '@angular/core/testing';

import { ContentManagementService } from './content-management.service';

describe('ContentManagementService', () => {
  let service: ContentManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContentManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
