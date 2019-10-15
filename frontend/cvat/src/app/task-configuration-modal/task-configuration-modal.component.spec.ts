import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskConfigurationModalComponent } from './task-configuration-modal.component';

describe('TaskConfigurationComponent', () => {
  let component: TaskConfigurationModalComponent;
  let fixture: ComponentFixture<TaskConfigurationModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TaskConfigurationModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskConfigurationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
