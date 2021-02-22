import AppointmentSchedulerComponent from '../../primo-explore-appointment-scheduler/src/appointment-scheduler.component';
import controller from '../../primo-explore-appointment-scheduler/src/appointment-scheduler.controller';
import { AppointmentSchedulerModule } from '../../primo-explore-appointment-scheduler/src/appointment-scheduler.module';
import { camelCase } from 'lodash';

const { name } = require('../package.json');
const componentName = camelCase(name);

/* Update dependencies with Primo Studio Congif instead of $attrs */
const attr = controller.$inject.indexOf('$attrs');
if (~attr) controller.$inject[attr] = `${componentName}StudioConfig`;

/* Add component with component name by convention */
export const appointmentScheduler = AppointmentSchedulerModule
.component(componentName, AppointmentSchedulerComponent)
