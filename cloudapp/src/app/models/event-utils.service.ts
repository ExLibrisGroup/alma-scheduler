import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders, ɵangular_packages_common_http_http_e } from '@angular/common/http';
import moment from 'moment';
import { Observable, iif, of, forkJoin } from 'rxjs';
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
    this.instCode = initData['instCode'];
    this.configuration = await this.configurationService.getConfig();
    this.token = await this.configurationService.getToken();
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

  sendNotification = (event: AlmaSchedulerEvent, user: any, message: 'appt' | 'cancel' = 'appt'): Observable<boolean> => {
    let requests = [];
    const notification = this.configuration.notification;
    let body = message == 'cancel' ? notification.cancelBody : notification.body;
    body = body.replace(/{{(\w*)}}/g, (match, str) => {
      switch (str) {
        case 'startTime':
          return formatDate(event.startTime, notification.dateFormat);
        case 'location':
          return this.configuration.locations.find(l=>l.id==event.location).name;
        default:
          return '';
      }
    })
    /* Email */
    if ((  notification.active && 
            user.contact_info && 
            user.contact_info.email && 
            user.contact_info.email.length>0 && 
            user.contact_info.email.some(e=>e.preferred))
    ) {
      const email = user.contact_info.email.find(e=>e.preferred).email_address;
      const replyTo = notification.replyTo ? [notification.replyTo] : [];
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
      requests.push(this.http.post(`${environment.service}/notifications/email`, payload, { headers: this.headers }))
    }
    /* SMS */
    if ((  notification.sms && 
      user.contact_info && 
      user.contact_info.phone && 
      user.contact_info.phone.length>0 && 
      user.contact_info.phone.some(e=>e.preferred))
    ) {
      let phone: string = user.contact_info.phone.find(p=>p.preferred).phone_number;
      if (!phone.startsWith('+')) {
        phone = phone.startsWith(notification.countryCode)
          ? '+' + phone
          : '+' + notification.countryCode + phone;
      }
      let payload = {
        message: body,
        to: phone
      }
      requests.push(this.http.post(`${environment.service}/notifications/sms`, payload, { headers: this.headers }))
    }
    try {
      return iif(()=>requests.length==0,
      of(false), 
      forkJoin(requests)
      .pipe(
        catchError(e=>{
          console.error('Error trying to send notification', e.error);
          return of(false)
        }),
        map(()=>true))
      );
    } catch(e) {
      console.error('Error trying to send notification', e);
      return of(false);
    }
  }
}

const formatDate = (dt: Date, locale: string) => {
  const options = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: 'numeric'
  };
  try {
    return new Intl.DateTimeFormat(locale || [], options).format(new Date(dt)); 
  } catch (e) {
    return dt.toString();
  }
}