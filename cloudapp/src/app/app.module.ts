import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule, getTranslateModule } from '@exlibris/exl-cloudapp-angular-lib';
import { ToastrModule } from 'ngx-toastr';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/moment';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { NgxMatMomentModule } from '@angular-material-components/moment-adapter';
import { MomentDateModule } from '@angular/material-moment-adapter';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import moment from 'moment';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { MainComponent } from './main/main.component';
import { DayViewSchedulerComponent } from './day-view-scheduler/day-view-scheduler.component';
import { SchedulerComponent } from './scheduler/scheduler.component';
import { EventFormComponent } from './event-form/event-form.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { SearchComponent } from './search/search.component';
import { NoConfigComponent } from './main/no-config.component';
import { ConfigurationService } from './models/configuration.service';
import { EventUtilsService } from './models/event-utils.service';
import { ErrorComponent } from './main/error.component';

export function getToastrModule() {
  return ToastrModule.forRoot({
    positionClass: 'toast-top-right',
    timeOut: 2000
  });
}

export function momentAdapterFactory() {
  return adapterFactory(moment);
};

export function getCalendarModule() {
  return  CalendarModule.forRoot({
    provide: DateAdapter,
    useFactory: momentAdapterFactory,
  })
}

@NgModule({
   declarations: [
      AppComponent,
      MainComponent,
      SchedulerComponent,
      DayViewSchedulerComponent,
      EventFormComponent,
      ConfigurationComponent,
      SearchComponent,
      NoConfigComponent,
      ErrorComponent,
   ],
   imports: [
      MaterialModule,
      BrowserModule,
      BrowserAnimationsModule,
      AppRoutingModule,
      HttpClientModule,
      ReactiveFormsModule,
      FormsModule,
      getTranslateModule(),
      getToastrModule(),
      getCalendarModule(),
      NgxMatTimepickerModule,
      NgxMatDatetimePickerModule,
      NgxMatMomentModule,
      MomentDateModule
  ],
  providers: [
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: 'LL',
        },
        display: {
          dateInput: 'LL',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        }
      }
    },
    ConfigurationService,
    EventUtilsService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
