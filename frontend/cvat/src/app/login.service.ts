import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse} from '@angular/common/http';
import { environment } from '../environments/environment';
import { FormBuilder, FormGroup} from '@angular/forms';
import { Observable, throwError} from 'rxjs';
import { catchError, tap } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private loginUrl=environment.apiUrl+'auth/login1';

  constructor(private http: HttpClient) { }

  private handleError(error: HttpErrorResponse) {
  if (error.error instanceof ErrorEvent) {
    // A client-side or network error occurred. Handle it accordingly.
    console.error('An error occurred:', error.error.message);
  } else {
    // The backend returned an unsuccessful response code.
    // The response body may contain clues as to what went wrong,
    console.error(
      `Backend returned code ${error.status}, ` +
      `body was: ${error.error}`);
  }
  // return an observable with a user-facing error message
  return throwError(
    'Something bad happened; please try again later.');
};


  signIn(signInData: FormData): Observable<string>{
    return this.http.post(this.loginUrl, signInData, {responseType: 'text'});
    //.pipe(
    //  catchError(this.handleError)
    //);
  }
}
