import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse} from '@angular/common/http';
import { environment } from '../environments/environment';
import { Task } from './models/task'
import { Observable, throwError as observableThrowError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  httpOptions={
    headers: new HttpHeaders({
      'Content-Type':  'application/json',
      'Authorization' : 'Basic' +btoa(sessionStorage.getItem('username')+':'+sessionStorage.getItem('password'))
    })
  }

/*
return this.http.get(environment.apiUrl+'dashboard/meta').subscribe(response => {
     console.log(response['base_url']);
}, err => {
  console.log("User authentication failed!");
});
*/


  constructor(private http: HttpClient) { }

  getTasks(): Observable<Task[]>{

    return this.http.get(environment.apiUrl+'api/v1/tasks', this.httpOptions).pipe(
        map(response=> response['results'] as Task[]),
        catchError(this.handleError)
    );
  }

  private handleError(res: HttpErrorResponse | any) {
    console.error(res.error || res.body.error);
    return observableThrowError(res.error || 'Server error');
  }

}
