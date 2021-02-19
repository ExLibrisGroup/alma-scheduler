import './appointment-scheduler.component.scss';
import controller from './appointment-scheduler.controller';
import template from './appointment-scheduler.component.html';

const AppointmentSchedulerComponent = {
  selector: 'appointmentScheduler',
  bindings: { parentCtrl: '<', i18n: '<' },
  controller,
  template
};

export default AppointmentSchedulerComponent;
