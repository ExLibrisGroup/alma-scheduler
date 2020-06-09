import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import moment from 'moment';
import { Observable, iif, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CalendarEvent } from 'angular-calendar';
import { User } from '../day-view-scheduler/day-view-scheduler.component';
import { Colors, Configuration } from './configuration';
import { ConfigurationService } from './configuration.service';
import { AlmaSchedulerEvent } from './event';

@Injectable()
export class EventUtilsService {

  private instCode: string;
  private token: string;
  private headers: HttpHeaders;
  private configuration: Configuration;
  
  constructor(
    private http: HttpClient,
    private configurationService: ConfigurationService,
  ) { }

  async init() {
    const initData = await this.configurationService.getInitData();
    this.instCode = initData['instCode']||'test';
    this.configuration = await this.configurationService.getConfig();
    //this.token = await this.configurationService.getToken();
    this.token = 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJFeGxDbG91ZEFwcCIsInN1YiI6ImV4bF9pbXBsIiwiaW5zdF9jb2RlIjoiRVhMREVWMV9JTlNUIiwidXJscyI6eyJhbG1hIjoiaHR0cDovL2xvY2FsaG9zdDoxODAxLyJ9LCJleHAiOjE1ODU2NzEwODR9.h_aTJZZhQk1e3ro9u--Cxdb2zJRf1JS9I5EP4rJQXfHC26p1ybGTcCZnCX4-pb1B0cYvHmZYl2K-FSFsc9WpXjpLNjE1Y8u1Ke5DZSuPOEP1O7K_jlvm7gFuypesHift06aProY8tApPAE7AJIbD2GQP-G_jdd3jWglG9bFwBMmEzBcMM6uq9AFy2QzrMnIJf_mjwpw9G95ieNz8tpmhRMBQ33ml3k66Pwhk_B3PKJnPwUTXij8LFrBnvjYJoui9WSy1zk2lIdZkoygBljNgyDjyjWhandLfMVRx2u3rDH8Oh8aNWdIIPRp5QDA_UETbGkiLttt_KQ_CH68QjTrhQQ';
    this.headers = new HttpHeaders({ 'Authorization': `Bearer ${this.token}` });
    return this;
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
      this.http.put(`${environment.service}/events/${this.instCode}/${event.id}`, event, { headers: this.headers }),
      this.http.post(`${environment.service}/events/${this.instCode}`, event, { headers: this.headers })
    )
  }

  deleteEvent = (id: string) => 
    this.http.delete(`${environment.service}/events/${this.instCode}/${id}`, { headers: this.headers })

  getEvents = ({date = null, userId = null}: {date?: moment.Moment, userId?: string }) => {
    let params = { }
    if (date) params['date'] = date.toISOString();
    if (userId) params['userId'] = userId;
    return this.http.get<any[]>(`${environment.service}/events/${this.instCode}`, {params: params, headers: this.headers})
    .pipe(map(resp=>resp.map(event=>{
      event.id = event._id;
      delete event._id;
      return event;
    })))
  }

  getEvent = (id: string): Observable<AlmaSchedulerEvent> =>
    this.http.get<any>(`${environment.service}/events/${this.instCode}/${id}`, { headers: this.headers })
    .pipe(map(resp=>{
      resp.id = resp._id;
      delete resp._id;
      return resp;
    }))

  sendNotification = (event: AlmaSchedulerEvent, user: any): Observable<boolean> => {
    const notification = this.configuration.notification;
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
            return this.configuration.locations.find(l=>l.id==event.location).name;
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
      return this.http.post(`${environment.service}/notifications`, payload, { headers: this.headers })
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
