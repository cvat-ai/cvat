import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { environment } from '../environments/environment.prod';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class StartupService {

  constructor(private http: HttpClient) { }

  get(endpoint: string){
    //console.log(API_URL+endpoint);
    return this.http.get(API_URL+endpoint);
    //return this.http.get(API_URL+endpoint, {reponseType: 'text'});
  }


}
