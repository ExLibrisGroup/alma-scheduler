import { Component, OnInit, ViewEncapsulation, Injectable } from '@angular/core';
import { CanDeactivate } from "@angular/router";
import { AppService } from '../app.service';
import { ToastrService } from 'ngx-toastr';
import { FormGroup, FormArray } from '@angular/forms';
import { configFormGroup, locationFormGroup, Colors } from '../models/configuration';

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

  constructor(
    private appService: AppService,
    private toastr: ToastrService
  ) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.appService.config.subscribe(config=>{
      this.form = configFormGroup(config);
    });
  }

  save() {
    this.saving = true;
    this.appService.setConfig(this.form.value).subscribe(
      () => {
        this.toastr.success('Settings successfully saved.');
        this.form.markAsPristine();
      },
      err => this.toastr.error(err.message),
      ()  => this.saving = false
    );
  }

  reset() {
    if (confirm('Discard configuration?')) {
      this.saving = true;
      this.appService.removeConfig().subscribe({
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
  }

  deleteLocation(i) {
    this.locations.removeAt(i);
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
    return this.notification.controls.active.value;
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