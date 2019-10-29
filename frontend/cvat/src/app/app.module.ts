import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TaskConfigurationModalComponent } from './task-configuration-modal/task-configuration-modal.component';
import { HttpClientModule, HttpClientXsrfModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {MAT_DIALOG_DEFAULT_OPTIONS} from '@angular/material';
import { LoginComponent } from './login/login.component';
import { MatDialogModule } from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ShareBrowseModalComponent } from './share-browse-modal/share-browse-modal.component';
import { DashboardItemComponent } from './dashboard-item/dashboard-item.component';
//import { BasicAuthInterceptor } from './_helpers/basic-auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    TaskConfigurationModalComponent,
    LoginComponent,
    ShareBrowseModalComponent,
    DashboardItemComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    HttpClientXsrfModule.withOptions({ cookieName: 'csrftoken', headerName: 'x-csrftoken' }),
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    BrowserAnimationsModule
  ],
  providers: [CookieService],


  bootstrap: [AppComponent],
  entryComponents: [TaskConfigurationModalComponent]
})
export class AppModule { }

//providers: [{ provide: HTTP_INTERCEPTORS, useClass: BasicAuthInterceptor, multi: true } ],
