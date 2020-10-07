import { Subscription, Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
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