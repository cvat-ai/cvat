import { Component, OnInit } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private cookieValue: string;
  title='Login';
  constructor(private CookieService: CookieService) { }

  ngOnInit() {
    this.cookieValue=this.CookieService.get('csrftoken');
  }

}
