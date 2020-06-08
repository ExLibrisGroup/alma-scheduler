import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import moment from 'moment';
import { Observable, iif, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CalendarEvent } from 'angular-calendar';
import { User } from '../day-view-scheduler/day-view-scheduler.component';
import { Colors, Notification, Configuration } from './configuration';

export class AlmaSchedulerEvent {
  id: string = ""; 
  startTime: Date = new Date();
  location: string = "";
  userId: string = "";
  title: string = "";
  duration: number = 15;
}

export class AlmaSchedulerEventUtils {
  private http: HttpClient;
  private instCode: string;

  constructor(
    http: HttpClient,
    instCode: string
  ) {
    this.http = http;
    this.instCode = instCode;
  }

  eventFormGroup = (event: AlmaSchedulerEvent = null): FormGroup => {
    if (event == null) event = new AlmaSchedulerEvent();
    return new FormGroup({
      id: new FormControl(event.id),
      userId: new FormControl(event.userId, Validators.required),
      startTime: new FormControl(event.startTime),
      location: new FormControl(event.location),
      duration: new FormControl(event.duration),
      title: new FormControl(event.title)
    });
  }

  toCalendarEvent = (event: AlmaSchedulerEvent, user: User): CalendarEvent => ({

    title: event.title,
    color: Colors[user.color],
    start: moment(event.startTime).toDate(),
    end: moment(event.startTime).add(+event.duration, 'minutes').toDate(),
    meta: {
      location: event.location,
      id: event.id,
      user: user
    },
    draggable: true,
  })

  saveEvent = (event: AlmaSchedulerEvent) => {
    return iif(
      () => !!event.id,
      this.http.put(`${environment.service}/events/${this.instCode}/${event.id}`, event),
      this.http.post(`${environment.service}/events/${this.instCode}`, event)
    )
  }

  deleteEvent = (id: string) => 
    this.http.delete(`${environment.service}/events/${this.instCode}/${id}`)

  getEvents = ({date = null, userId = null}: {date?: moment.Moment, userId?: string }) => {
    let params = {}
    if (date) params['date'] = date.toISOString();
    if (userId) params['userId'] = userId;
    return this.http.get<any[]>(`${environment.service}/events/${this.instCode}`, {params: params})
    .pipe(map(resp=>resp.map(event=>{
      event.id = event._id;
      delete event._id;
      return event;
    })))
  }


  getEvent = (id: string): Observable<AlmaSchedulerEvent> =>
    this.http.get<any>(`${environment.service}/events/${this.instCode}/${id}`)
    .pipe(map(resp=>{
      resp.id = resp._id;
      delete resp._id;
      return resp;
    }))

  sendNotification = (event: AlmaSchedulerEvent, configuration: Configuration, user: any): Observable<boolean> => {
    const notification = configuration.notification;
    if (!(  notification.active && 
            user.contact_info && 
            user.contact_info.email && 
            user.contact_info.email.length>0 && 
            user.contact_info.email.some(e=>e.preferred))
      ) {
      return of(false);
    }
    try {
      const email = user.contact_info.email.find(e=>e.preferred).email_address;
      console.log('send email to', email);
      const replyTo = notification.replyTo ? [notification.replyTo] : [];
      const body = notification.body.replace(/{{(\w*)}}/g, (match, str) => {
        switch (str) {
          case 'startTime':
            return moment(event.startTime).format("dddd, MMMM Do YYYY, hh:mm");
          case 'location':
            return configuration.locations.find(l=>l.id==event.location).name;
          default:
            return '';
        }
      })
      let payload = {
        "Destination": {
          "ToAddresses": [email]},
          "Message": {
            "Body": {
              "Text": {
                "Charset":"UTF-8",
                "Data": body
              }
            },
            "Subject": {
              "Charset":"UTF-8",
              "Data": notification.subject
            }
          },
          "ReplyToAddresses": replyTo,
          "Source": notification.from
        };
      console.log('message', JSON.stringify(payload));
      return this.http.post(`${environment.service}/notifications`, payload)
      .pipe(
        catchError(e=>{
          console.error('Error trying to send notification', e.error);
          return of(false)
        }),
        map(()=>true));
    } catch(e) {
      console.error('Error trying to send notification', e);
      return of(false);
    }
  }
}