import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TaskConfigurationComponent } from './task-configuration/task-configuration.component';
import { CookieService } from 'ngx-cookie-service';
import { HttpClientModule, HttpClientXsrfModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpXsrfModule } from '@angular/common/http';

import { LoginComponent } from './login/login.component';
//import { ReactiveFormsModule } from '@angular/forms';
//import { BasicAuthInterceptor } from './_helpers/basic-auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    TaskConfigurationComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    HttpClientXsrfModule.withOptions({ cookieName: 'csrftoken', headerName: 'x-csrftoken' })
  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

//providers: [{ provide: HTTP_INTERCEPTORS, useClass: BasicAuthInterceptor, multi: true } ],
