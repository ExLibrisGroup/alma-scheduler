import { environment } from './environment';
import { AppointmentSchedulerHttpInterceptor, AppointmentSchedulerService } from './appointment-scheduler.service';
import { formatDate, formatTime } from './utils';
import AppointmentSchedulerComponent from './appointment-scheduler.component';

export const AppointmentSchedulerModule =  
angular.module('appointmentScheduler', [])
.constant('AppointmentSchedulerOptions', environment)
.config(AppointmentSchedulerHttpInterceptor)
.factory('AppointmentSchedulerService', AppointmentSchedulerService)
.filter('formatDate', () => formatDate)
.filter('formatTime', () => formatTime);

angular.module('appointmentScheduler')
.component(AppointmentSchedulerComponent.selector, AppointmentSchedulerComponent);
