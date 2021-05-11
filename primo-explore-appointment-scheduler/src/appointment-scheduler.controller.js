import { DateTime } from 'luxon';
import i18n from './i18n';
import { merge } from 'lodash'
import { buildSlots } from './utils';

const DEFAULT_LOCALE = 'en';

class AppointmentSchedulerController {
  
  newEvent = {
    startDate: new Date(),
    location: 0,
    startTime: null,
  };
  locale = this.parentCtrl.$stateParams.lang;
  minDate = new Date();
  maxDate = DateTime.fromJSDate(this.minDate).plus({ days: 90 }).toJSDate();
  loading = false;
  msg = null;
  config = null;
  appointments = [];
  hours = {};
  slots = [];
  showForm = false;

  constructor($scope, $attrs, $mdDateLocale, options, service) {
    this.$scope = $scope;
    this.$attrs = $attrs;
    this.$mdDateLocale = $mdDateLocale;
    this.options = options;
    this.service = service;
  }

  $onInit() {
    /* Merge i18n with provided strings */
    this.mergedi18n = merge(i18n, this.i18n);

    /* Set apikey, $attrs can be a Primo Studio config array or the attrs hash */
    const attrs = Array.isArray(this.$attrs) ? this.$attrs[0] : this.$attrs;
    this.options.apikey = attrs.apikey;
    this.$mdDateLocale.firstDayOfWeek = attrs.firstdayofweek || 0;

    /* Load config and events */
    this.loading = true;
    this.service.getConfig()
      .then(data => {
        if (!data)
          this.msg = { text: this.translate('noconfig'), type: 'warning' };
        else
          this.config = data;
      })
      .then(() => this.getHours())
      .then(() => this.getEvents())
      .catch(e => {
        this.msg = { text: this.translate('serviceerror'), type: 'error' };
        console.warn(e);
      })
      .finally(() => this.loading = false);
  };

  getEvents() {
    return this.service.getEvents(this.config && this.config.locations)
      .then(appointments => this.appointments = appointments);
  };

  dateOpen = (dt) => {
    dt = DateTime.fromJSDate(dt).toISODate();
    const location = this.config.locations.find(l => l.id == this.newEvent.location);
    const hours = location && location.library && this.hours[location.library];
    if (!hours || !hours[dt]) return true;
    return hours[dt].length > 0;
  }

  getHours() {
    const queries = this.config.locations.filter(l => l.library)
    .map(l => this.service.getHours(l.library).then(data => {
      this.hours[l.library] = data;
    }));
    return Promise.all(queries);
  }

  translate(key) {
    return this.mergedi18n[this.locale] && this.mergedi18n[this.locale][key]
    || this.mergedi18n[DEFAULT_LOCALE][key]
    || key;
  }

  cancel(id) {
    if (!confirm(this.translate('cancelconfirm'))) return;
    this.loading = true;
    this.service.deleteAppointment(id)
      .then(() => {
        this.msg = { text: this.translate('cancelsuccess'), type: 'success' };
        setTimeout(() => { this.msg = null; this.$scope.$apply(); }, 3000);
        this.hideForm();
      })
      .then(() => this.getEvents())
      .catch(e => {
        this.msg = { text: this.translate('cancelfail') + (e.message || e.statusText), type: 'error' };
        setTimeout(() => { this.msg = null; this.$scope.$apply(); }, 5000);
      })
      .finally(() => this.loading = false);
  };

  newEventChanged() {
    if (this.newEvent.startDate && this.newEvent.location) {
      const dt = DateTime.fromJSDate(this.newEvent.startDate).toISODate();
      this.service.getSlots(dt)
        .then(data => {
          const events = data.filter(e => e.location == this.newEvent.location);
          this.slots = buildSlots(events, this.config, this.newEvent, this.hours);
          this.newEvent.startTime = null;
        });
    }
  };

  add() {
    const newEvent = this.newEvent;
    const body = {
      duration: this.config.duration,
      location: newEvent.location,
      startTime: newEvent.startTime.toISO()
    };
    this.loading = true;
    this.service.createAppointment(body)
      .then(() => {
        this.msg = { text: this.translate('createsuccess'), type: 'success' };
        setTimeout(() => { this.msg = null; this.$scope.$apply(); }, 3000);
        this.hideForm();
      })
      .then(() => this.getEvents())
      .catch(e => {
        this.msg = { text: this.translate('createfail') + (e.message || e.statusText), type: 'error' };
        setTimeout(() => { this.msg = null; this.$scope.$apply(); }, 5000);
      })
      .finally(() => this.loading = false);
  };

  hideForm() {
    this.showForm = false;
  }

  clearAlert() {
    this.msg = null;
  }
}

AppointmentSchedulerController.$inject = [
  '$scope', '$attrs', '$mdDateLocale', 'AppointmentSchedulerOptions', 'AppointmentSchedulerService'
];

export default AppointmentSchedulerController;
