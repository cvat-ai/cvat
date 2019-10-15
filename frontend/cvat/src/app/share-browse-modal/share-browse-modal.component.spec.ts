import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareBrowseModalComponent } from './share-browse-modal.component';

describe('ShareBrowseModalComponent', () => {
  let component: ShareBrowseModalComponent;
  let fixture: ComponentFixture<ShareBrowseModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShareBrowseModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShareBrowseModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
