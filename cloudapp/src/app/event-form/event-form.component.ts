import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib';
import { debounceTime, tap, switchMap, finalize, filter, map } from 'rxjs/operators';
import { EventUtilsService } from '../models/event-utils.service';
import moment from 'moment';
import { Configuration } from '../models/configuration';
import { ConfigurationService } from '../models/configuration.service';

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss']
})
export class EventFormComponent implements OnInit {
  config: Configuration;
  form: FormGroup;
  sendNotification = true;
  loading = false;
  searching = false;
  users: any[];
  userSearch = new FormControl();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private restService: CloudAppRestService,
    private configurationService: ConfigurationService,
    private eventUtils: EventUtilsService
  ) { }

  async ngOnInit() {
    this.eventUtils = await this.eventUtils.init();
    this.config = await this.configurationService.getConfig();
  
    if (this.route.snapshot.params.id) {
      this.get(this.route.snapshot.params);
    } else {
      this.form = this.eventUtils.eventFormGroup();
      this.form.patchValue({
        startTime: moment(this.route.snapshot.params['date']),
        location: this.route.snapshot.params['location'],
        duration: +this.route.snapshot.params['duration']
      });
    }

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

  get(params: any) {
    this.loading = true;
    let opts = {...params};
    if (params.duration) opts.duration = +params.duration;
    this.eventUtils.getEvent(params.id).pipe(
      finalize(() => this.loading = false ),
      map(event=> Object.assign(event, opts)),
      tap(event => this.form = this.eventUtils.eventFormGroup(event)),
      switchMap(event => this.restService.call(`/users/${event.userId}`)),
      tap(user => this.userSearch.setValue(user)),
    )
    .subscribe({
      error: e => this.toastr.error('An error occurred: ' + e.message)
    });  
  }

  save() {
    this.loading = true;
    this.eventUtils.saveEvent(this.form.value)
    .pipe(
      switchMap(()=>this.restService.call(`/users/${this.form.value.userId}`)),
      switchMap(user=>this.eventUtils.sendNotification(this.form.value, user)),
      finalize(()=>this.loading = false),
    )
    .subscribe( 
      success => this.toastr.success(`Event saved. Notification was ${success ? '' : 'NOT '}sent.`),
      e => {
        console.error('Error saving event', e)
        this.toastr.error('An error occurred: ' + e.message);
      },
      () => setTimeout(() => this.router.navigate(['/main']), 500)
    )
  }

  delete() {
    if (!confirm('Are you sure?')) return;
    this.loading = true;
    this.eventUtils.deleteEvent(this.form.value.id)
    .pipe(finalize(() => this.loading = false ))
    .subscribe(
      () => this.toastr.success('Event deleted'),
      e => this.toastr.error('An error occurred: ' + e.message),
      () => setTimeout(() => this.router.navigate(['/main']), 500)
    )
  }

  displayUser(user) {
    return user && user.first_name ? `${user.first_name} ${user.last_name} (${user.primary_id})`  : undefined;
  }

  setUser(val) {
    this.form.patchValue({userId: val.primary_id, title: this.displayUser(val)})
  }
}



