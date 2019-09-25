import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TaskConfigurationComponent } from './task-configuration/task-configuration.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
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
    HttpClientModule

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

//providers: [{ provide: HTTP_INTERCEPTORS, useClass: BasicAuthInterceptor, multi: true } ],
