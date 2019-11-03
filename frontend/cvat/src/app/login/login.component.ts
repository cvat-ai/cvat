import { Component, OnInit } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { environment } from '../../environments/environment';
import { NgForm, FormBuilder, FormGroup, FormControl} from '@angular/forms';
import { LoginService } from '../login.service';
import { Router } from "@angular/router";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  private cookieValue: string;
  response: string;

  title='Login';
  loginUrl=environment.apiUrl+'auth/login1';
  loginForm: FormGroup;

  constructor(private router: Router, private fb: FormBuilder, private cookieService: CookieService, private loginService: LoginService) {}

  ngOnInit() {
    this.cookieValue=this.cookieService.get('csrftoken');
    this.loginForm = this.fb.group({
      username: [''],
      password:['']
    })
  }

  onSubmit() {
    const loginData = new FormData();
    loginData.append('username', this.loginForm.get('username').value);
    loginData.append('password', this.loginForm.get('password').value);
    loginData.append('csrfmiddlewaretoken',this.cookieValue);


    this.loginService.signIn(loginData).subscribe(response => this.response = response);
  //  localStorage.clear();

  /*This is not sufficient for if you get like 404 not found or something*/
    if(this.response!="Your username and password didn't match. Please try again."){
      this.router.navigate(['./dashboard']);
      sessionStorage.setItem('username', loginData.get('username').toString());
      sessionStorage.setItem('password', loginData.get('password').toString());

      //localStorage.setItem('user', this.response.text());
    }
    //console.log(localStorage.getItem('user').text());
  }


}
