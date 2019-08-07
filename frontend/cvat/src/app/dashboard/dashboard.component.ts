import { Component, OnInit } from '@angular/core';
import { StartupService } from '../startup.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  title='CVAT Dashboard';
  metaData: Object; //SHOULD THIS BE PRIVATE?
  taskData: Object;
  constructor(
    private startupService: StartupService
/* NOT SURE IF THIS SHOULD BE A PRIVATE INSTANCE VARIABLE OR NAH
    ,
    private metaData: Object,
    private taskData: Object
*/
    //dashboardList:
  ) { }

  ngOnInit() {
  }


  ngAfterViewInit() {
      // DASHBOARD ENTRYPOINT

      this.startupService.get('.../../../../../backend/dashboard/meta').subscribe(
        metaData => this.metaData=metaData,
        errorData => console.log('HTTP Error', errorData)
        /*errorData =>{
            $('#content').empty();
            const message = `Can not build CVAT dashboard. Code: ${errorData.status}. ` +
                `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        }*/
      );


      this.startupService.get('.../../../../../backend/api/v1/tasks${window.location.search}').subscribe(
        taskData => this.taskData=taskData,
        errorData => console.log('HTTP Error', errorData)
        /*errorData =>{
            $('#content').empty();
            const message = `Can not build CVAT dashboard. Code: ${errorData.status}. ` +
                `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        }*/
      );






/*
        when(
            // TODO: Use REST API in order to get meta
            //dashboard->app->src_>cvat->frontend->
            this.startupService.get('.../../../../../backend/dashboard/meta'),
            this.startupService.get(`.../../../../../backend/api/v1/tasks${window.location.search}`),
        ).then((metaData, taskData) => {
            try {
                new DashboardView(metaData[0], taskData[0]);
            }
            catch(exception) {
                $('#content').empty();
                const message = `Can not build CVAT dashboard. Exception: ${exception}.`;
                showMessage(message);
            }
        }).fail((errorData) => {
            $('#content').empty();
            const message = `Can not build CVAT dashboard. Code: ${errorData.status}. ` +
                `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        }).always(() => {
            $('#loadingOverlay').remove();
        });
        */
  }
}
