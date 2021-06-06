import { AppointmentSchedulerModule } from './appointment-scheduler.module';

/* Required for modules used by Primo Studio */
try {
  if (app && app.requires) {
    app.requires.push(AppointmentSchedulerModule.name);
  }
} catch(e) { }