import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class BasicAuthInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with basic auth credentials if available
        let currentUser = JSON.parse(localStorage.getItem('currentUser'));
          console.log("auth");
        if (currentUser && currentUser.authdata) {

            console.log("auth");
            request = request.clone({
                setHeaders: {
                    Authorization: `Basic YWRtaW46YWRtaW4=`
                }

            });
        }

        return next.handle(request);
    }
}
