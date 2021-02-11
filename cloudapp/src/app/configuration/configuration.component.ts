import { Component, OnInit, ViewEncapsulation, Injectable } from '@angular/core';
import { CanDeactivate } from "@angular/router";
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { FormGroup, FormArray } from '@angular/forms';
import { configFormGroup, locationFormGroup, Colors } from '../models/configuration';
import { ConfigurationService } from '../models/configuration.service';
import { formatTime } from '../models/utils';
import { EventUtilsService } from '../models/event-utils.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ConfigurationComponent implements OnInit {
  form: FormGroup;
  Colors = Colors;
  saving = false;
  formatTime = formatTime;

  constructor(
    private alert: AlertService,
    private configurationService: ConfigurationService,
    private eventUtils: EventUtilsService,
  ) { }

  ngOnInit() {
    this.load();
  }

  async load() {
   this.form = configFormGroup(await this.configurationService.getConfig());
  }

  save() {
    this.alert.clear();
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return this.alert.error('Please fix the errors in the form.')
    }
    this.saving = true;
    this.configurationService.setConfig(this.form.value)
    .pipe(
      switchMap(()=>this.eventUtils.updateConfig(this.form.value))
    )
    .subscribe(
      () => {
        this.alert.success('Settings successfully saved.');
        this.form.markAsPristine();
      },
      err => this.alert.error(err.message),
      ()  => this.saving = false
    );
  }

  restore() {
    if (confirm('Discard configuration and restore default?')) {
      this.saving = true;
      this.configurationService.removeConfig().subscribe({
        complete: () => {
          this.saving = false;
          this.load();
        }
      })
    }
  }

  addLocation() {
    let location = locationFormGroup();
    location.patchValue({name: `Location #${this.locations.length+1}`});
    this.locations.push(location);
    this.form.markAsDirty();
  }

  deleteLocation(i) {
    this.locations.removeAt(i);
    this.form.markAsDirty();
  }

  get notification() {
    return this.form.get('notification') as FormGroup
  }

  get locations() {
    return this.form.get('locations') as FormArray
  }

  get colors() {
    return Object.keys(Colors);
  }

  get notificationActive() {
    return this.notification.controls.active.value || this.notification.controls.sms.value;
  }

}

@Injectable({
  providedIn: 'root',
})
export class ConfigGuard implements CanDeactivate<ConfigurationComponent> {
  constructor(
  ) {}

  canDeactivate(component: ConfigurationComponent): boolean {
    if(component.form.dirty) {
      return confirm('Discard changes?');
    }
    return true;
  }
}