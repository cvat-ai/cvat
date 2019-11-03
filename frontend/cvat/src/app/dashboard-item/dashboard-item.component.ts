import { Component, Input, Output,EventEmitter} from '@angular/core';
import { Task } from '../models/task';
import {MatDialog} from '@angular/material/dialog';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-dashboard-item',
  templateUrl: './dashboard-item.component.html',
  styleUrls: ['./dashboard-item.component.css']
})
export class DashboardItemComponent{
  @Input() task: Task;
  @Output() deleted = new EventEmitter<number>()
  imgUrl = environment.apiUrl+"api/v1/tasks/";

  constructor(private matDialog:MatDialog) { }

  openDeleteModal(templateRef){
    const dialogRef=this.matDialog.open(templateRef,
    {
      width: '400px',
    });
  }

  delete(){
    this.deleted.emit(this.task.id);
  }
}
