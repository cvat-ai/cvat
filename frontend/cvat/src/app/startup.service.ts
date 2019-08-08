import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class StartupService {

  constructor(private http: HttpClient) { }

  get(endpoint: string){
    return this.http.get(endpoint);
  }


}
