import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CloudAppConfigService, CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

const NO_USER_ROLE = 'It appears you don\'t have access to user information, which is required to assign appointments. Please check with an administrator.'

@Component({
  selector: 'app-splash',
  template: `<div class="loading-shade">
  <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
  </div>`,
})
export class SplashComponent implements OnInit {

  constructor(
    private configService: CloudAppConfigService,
    private restService: CloudAppRestService,
    private router: Router,
  ) { }

  ngOnInit() {
    forkJoin([
      this.configService.get(),
      this.restService.call('/users?limit=1').pipe(
        switchMap(users=>this.restService.call(users.user[0].link)),
        catchError(e=>of(e))
      )
    ]).pipe(
      map( ([config, users]) => {
        if (Object.keys(config).length==0) {
          this.router.navigate(['/noconfig']);
          return false;
        }
        if (users.error) {
          this.router.navigate(['/error', { msg: NO_USER_ROLE }]);
          return false;
        }
        this.router.navigate(['/main']);
      })
    ).subscribe();    
  }

}
