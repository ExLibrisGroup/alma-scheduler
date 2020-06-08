import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { debounceTime, filter, tap, switchMap, finalize, map } from 'rxjs/operators';
import { CloudAppRestService, CloudAppEventsService } from '@exlibris/exl-cloudapp-angular-lib';
import { AppService } from '../app.service';
import { ToastrService } from 'ngx-toastr';
import { AlmaSchedulerEventUtils, AlmaSchedulerEvent } from '../models/event';
import { Configuration } from '../models/configuration';
import moment from 'moment';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
  private eventUtils: AlmaSchedulerEventUtils
  userSearch = new FormControl('');
  searching = false;
  users: any[];
  loading = false;
  events: any[];
  config: Configuration;

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private appService: AppService,
    private toastr: ToastrService,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
  this.userSearch.valueChanges
  .pipe(
    debounceTime(300),
    filter(value => typeof value === 'string' && value.length >= 3),
    tap(() => this.searching = true),
    switchMap(value => this.restService.call(`/users?limit=20&q=ALL~${value.replace(' ','_')}`)
      .pipe(finalize(() => this.searching = false))
    ),
  )
  .subscribe( users => this.users = users.user); 
  }

  displayUser(user) {
    return user && user.first_name ? `${user.first_name} ${user.last_name} (${user.primary_id})`  : undefined;
  }

  search(val) {
    console.log('search', val);
    this.loading = true;
    this.getConfig().pipe(
      finalize(()=>this.loading=false),
      switchMap(() => this.eventUtils.getEvents({userId: val.primary_id})),
      map( events => 
        events.filter(event=>this.config.locations.some(l=>l.id==event.location))
        .map(event=>({
          id: event.id,
          startTime: moment(event.startTime).format("dddd, MMMM Do YYYY, hh:mm"), 
          location: this.config.locations.find(location=>location.id==event.location).name
        }))
      )
    )
    .subscribe(
      events => this.events = events,
      e => {
        console.error('Error retrieving events', e);
        this.toastr.error('Could not retrieve events')
      }
    );
  }

  edit(id) {
    this.router.navigate(['event', id])
  }

  getConfig() {
    return this.eventsService.getInitData().pipe(
      tap(data=>this.eventUtils = new AlmaSchedulerEventUtils(this.http, data['instCode']||'test')),
      switchMap(()=>this.appService.config),
      tap(config => this.config = config)
    )
  }

}
