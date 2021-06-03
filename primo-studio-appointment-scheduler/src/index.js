import { appointmentScheduler } from './module';

/* Required for modules used by Primo Studio */
try {
  if (app && app.requires) {
    app.requires.push(appointmentScheduler.name);
  }
} catch(e) { }