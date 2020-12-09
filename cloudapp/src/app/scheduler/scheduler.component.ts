import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { CalendarEvent, CalendarEventTimesChangedEvent } from 'angular-calendar';
import moment from 'moment';
import { User } from '../day-view-scheduler/day-view-scheduler.component';
import { EventUtilsService } from '../models/event-utils.service';
import { Configuration } from '../models/configuration';
import { CloudAppStoreService, AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { ConfigurationService } from '../models/configuration.service';

const LOCATIONS_STORE = 'locations';

@Component({
  selector: 'app-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss'],
})
export class SchedulerComponent implements OnInit {
  private _viewDate: moment.Moment;
  events: CalendarEvent[] = [];
  loading = false;
  locations: User[] = [];
  locationSelect = new FormControl();
  refresh = new Subject();
  config: Configuration;

  constructor(
    private router: Router,
    private alert: AlertService,
    private storeService: CloudAppStoreService,
    private configurationService: ConfigurationService,
    private eventUtils: EventUtilsService
  ) { }

  async ngOnInit() {
    this.locationSelect.valueChanges.subscribe(this.selectLocations);
    this.eventUtils = await this.eventUtils.init();
    this.config = await this.configurationService.getConfig();
    this.storeService.get(LOCATIONS_STORE).subscribe(val=>{
      this.locationSelect.setValue(val);
      this.selectLocations(val);
    });
  }

  getEvents() {
    this.loading = true;
    this.eventUtils.getEvents({date: this.viewDate}).pipe(
      finalize(()=>this.loading=false),
      map( events => 
        events.filter(event=>this.config.locations.some(l=>l.id==event.location))
        .map(event=>this.eventUtils.toCalendarEvent(event, this.config.locations.find(location=>location.id==event.location)))
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

  selectLocations = (val: string[]) => {
    if (val) {
      this.storeService.set(LOCATIONS_STORE, val).subscribe();
      this.locations = this.config.locations.filter(l=>val.includes(l.id));
      this.refresh.next();
    }
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
    /* Check capacity */
    const [overlap, capacity] = this.checkCapacity(event);
    if (overlap >= capacity) {
      this.alert.warn('Slot is filled to capacity', { autoClose: true, delay: 5000 });
      return;
    }

    this.router.navigate(['event/new', 
      { date: moment(event.date).toISOString(), 
        location: this.locations[event.column].id,
        duration: this.config.duration
      }])
  }

  private checkCapacity = (event: any): [number, number] => {
    const startTime = event.date, endTime = moment(event.date).add(this.config.duration, 'minutes');
    const overlap = 
      this.events.filter(e=>
        e.meta.user.id==this.locations[event.column].id && (
          (moment(e.start).isSame(startTime) && moment(e.end).isSame(endTime)) ||
          moment(e.start).isBetween(startTime, endTime, undefined, '[)') ||
          moment(e.end).isBetween(startTime, endTime, undefined, '(]')  )
      ).length;
    const capacity = this.config.locations.find(l=>l.id==this.locations[event.column].id).capacity;
    return [overlap, capacity];
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
}
