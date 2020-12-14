import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { debounceTime, filter, tap, switchMap, finalize, map } from 'rxjs/operators';
import { CloudAppRestService, CloudAppEventsService, AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { AppService } from '../app.service';
import { EventUtilsService } from '../models/event-utils.service';
import { Configuration } from '../models/configuration';
import moment from 'moment';
import { ConfigurationService } from '../models/configuration.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
  userSearch = new FormControl('');
  searching = false;
  users: any[];
  loading = false;
  events: any[];
  config: Configuration;

  constructor(
    private restService: CloudAppRestService,
    private alert: AlertService,
    private router: Router,
    private configurationService: ConfigurationService,
    private eventUtils: EventUtilsService
  ) { }

  async ngOnInit() {
    const initData = await this.configurationService.getInitData();
    this.eventUtils = await this.eventUtils.init();
    this.config = await this.configurationService.getConfig();

    this.userSearch.valueChanges
    .pipe(
      debounceTime(300),
      filter(value => typeof value === 'string' && value.length >= 3),
      tap(() => this.searching = true),
      switchMap(value => this.restService.call(`/users?limit=20&q=ALL~${value.replace(/ /g,'%2b')}`)
        .pipe(finalize(() => this.searching = false))
      ),
    )
    .subscribe( users => this.users = users.user); 
  }

  displayUser(user) {
    return user && user.first_name ? `${user.first_name} ${user.last_name} (${user.primary_id})`  : undefined;
  }

  search(val) {
    this.loading = true;
    this.eventUtils.getEvents({userId: val.primary_id}).pipe(
      finalize(()=>this.loading=false),
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
        this.alert.error('Could not retrieve events')
      }
    );
  }

  edit(id) {
    this.router.navigate(['event', id])
  }
}
