import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { map, finalize, tap, switchMap } from 'rxjs/operators';
import { CalendarEvent, CalendarEventTimesChangedEvent } from 'angular-calendar';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import moment from 'moment';
import { User } from '../day-view-scheduler/day-view-scheduler.component';
import { AlmaSchedulerEventUtils } from '../models/event';
import { Configuration } from '../models/configuration';
import { CloudAppStoreService, CloudAppEventsService } from '@exlibris/exl-cloudapp-angular-lib';
import { AppService } from '../app.service';

const LOCATIONS_STORE = 'locations';

@Component({
  selector: 'app-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss'],
})
export class SchedulerComponent implements OnInit {
  private eventUtils: AlmaSchedulerEventUtils;
  private _viewDate: moment.Moment;
  events: CalendarEvent[] = [];
  loading = false;
  locations: User[] = [];
  locationSelect = new FormControl();
  refresh = new Subject();
  config: Configuration;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService,
    private appService: AppService,
    private storeService: CloudAppStoreService,
    private eventsService: CloudAppEventsService
  ) { }

  ngOnInit() {
    this.locationSelect.valueChanges.subscribe(this.selectLocations);
    this.getConfig().pipe(
      switchMap(() => this.storeService.get(LOCATIONS_STORE)),
      tap(val=>this.locationSelect.setValue(val))
    )
    .subscribe(val=>this.selectLocations(val));
  }

  getEvents() {
    this.loading = true;
    this.getConfig().pipe(
      finalize(()=>this.loading=false),
      switchMap(() => this.eventUtils.getEvents({date: this.viewDate})),
      map( events => 
        events.filter(event=>this.config.locations.some(l=>l.id==event.location))
        .map(event=>this.eventUtils.toCalendarEvent(event, this.config.locations.find(location=>location.id==event.location)))
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

  selectLocations = (val: string[]) => {
    this.storeService.set(LOCATIONS_STORE, val).subscribe();
    this.locations = this.config.locations.filter(l=>val.includes(l.id));
    this.refresh.next();
  }

  eventTimesChanged({event, newStart, newEnd }: CalendarEventTimesChangedEvent): void {
   this.router.navigate(['event', event.meta.id, 
    { 
      startTime: newStart.toISOString(), 
      duration: moment(event.end).diff(event.start, 'minutes') 
    }]);
  }

  userChanged({ event, newUser }) {
   this.router.navigate(['event', event.meta.id, { location: newUser.id }]);
  }

  eventClicked({ event }: { event: CalendarEvent }): void {
    this.router.navigate(['event', event.meta.id])
  }

  hourClicked(event): void {
    const startTime = event.date, endTime = moment(event.date).add(this.config.duration, 'minutes');
    const overlap = 
      this.events.filter(e=>
        e.meta.user.id==this.locations[event.column].id && (
          (moment(e.start).isSame(startTime) && moment(e.end).isSame(endTime)) ||
          moment(e.start).isBetween(startTime, endTime, undefined, '[)') ||
          moment(e.end).isBetween(startTime, endTime, undefined, '(]')  )
      ).length;
    const capacity = this.config.locations.find(l=>l.id==this.locations[event.column].id).capacity;
    if (overlap >= capacity) {
      this.toastr.warning('Slot is filled to capacity');
      return;
    }
    this.router.navigate(['event/new', 
      { date: event.date, 
        location: this.locations[event.column].id,
        duration: this.config.duration
      }])
  }

  set viewDate(val: moment.Moment) {
    if (val) {
      val = moment(val).startOf('day');
      this._viewDate = val;
      this.getEvents();
    }
  }

  get viewDate(): moment.Moment {
    if (!this._viewDate) this.viewDate = moment();
    return this._viewDate;
  }

  getConfig() {
    return this.eventsService.getInitData().pipe(
      tap(data=>this.eventUtils = new AlmaSchedulerEventUtils(this.http, data['instCode']||'test')),
      switchMap(()=>this.appService.config),
      tap(config => this.config = config)
    )
  }

}
