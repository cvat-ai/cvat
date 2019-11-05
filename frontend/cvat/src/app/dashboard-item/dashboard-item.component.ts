import {Component, Input, ViewChild,ViewContainerRef,ComponentFactoryResolver,
ComponentRef} from '@angular/core';
import { Task } from '../models/task';
import {MatDialog} from '@angular/material/dialog';
import { environment } from '../../environments/environment';

export interface deleteTaskInterface{
  delete(id: number);
}

@Component({
  selector: 'app-dashboard-item',
  templateUrl: './dashboard-item.component.html',
  styleUrls: ['./dashboard-item.component.css']
})
export class DashboardItemComponent{
  @Input() task: Task;
  compInteraction: deleteTaskInterface;
  imgUrl = environment.apiUrl+"api/v1/tasks/";

  constructor(private matDialog:MatDialog) { }

  openDeleteModal(templateRef: TemplateRef){
    const dialogRef=this.matDialog.open(templateRef,
    {
      width: '400px',
    });
  }

  delete(id: number){
    this.compInteraction.delete(id);
  }
}
