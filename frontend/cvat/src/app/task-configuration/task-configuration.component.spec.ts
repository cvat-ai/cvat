import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskConfigurationComponent } from './task-configuration.component';

describe('TaskConfigurationComponent', () => {
  let component: TaskConfigurationComponent;
  let fixture: ComponentFixture<TaskConfigurationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TaskConfigurationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
