import { Subscription, Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router, CanActivate } from '@angular/router';
import { Component, OnInit, OnDestroy, Injectable, ViewEncapsulation } from '@angular/core';
import { CloudAppConfigService, CloudAppEventsService, Entity, PageInfo, CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MainComponent implements OnInit, OnDestroy {

  private pageLoad$: Subscription;
  pageEntities: Entity[];

  loading = false;

  constructor(
    private eventsService: CloudAppEventsService,
  ) { }

  ngOnInit() {
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
  }

  ngOnDestroy(): void {
    this.pageLoad$.unsubscribe();
  }

  onPageLoad = (pageInfo: PageInfo) => {
    this.pageEntities = pageInfo.entities;
    if ((pageInfo.entities || []).length == 1) {
      const entity = pageInfo.entities[0];
    } 
  }

}

const NO_USER_ROLE = 'It appears you don\'t have access to user information, which is required to assign appointments. Please check with an administrator.'

@Injectable({
  providedIn: 'root',
})
export class MainGuard implements CanActivate {
  constructor (
    private configService: CloudAppConfigService,
    private restService: CloudAppRestService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean> {
    return forkJoin([
      this.configService.get(),
      this.restService.call('/users?limit=1').pipe(catchError(e=>of(e)))
    ]).pipe(
      map( ([config, users]) => {
        if (Object.keys(config).length==0) {
          this.router.navigate(['/noconfig']);
          return false;
        }
        if (users.error) {
          this.router.navigate(['/error', { msg: NO_USER_ROLE }])
        }
        return true;
      })
    );
  }
}