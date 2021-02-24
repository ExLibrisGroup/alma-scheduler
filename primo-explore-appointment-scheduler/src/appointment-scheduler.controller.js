import { DateTime } from 'luxon';
import i18n from './i18n';
import { merge } from 'lodash'
import { buildSlots } from './utils';

const DEFAULT_LOCALE = 'en';

function AppointmentSchedulerController ($scope, $attrs, options, service) {
  var vm = this;
  vm.newEvent = {
    startDate: new Date(),
    location: 0,
    startTime: null,
  };
  vm.locale = this.parentCtrl.$stateParams.lang;
  vm.minDate = new Date();
  vm.loading = false;
  vm.msg = null;
  vm.config = null;
  vm.appointments = [];
  vm.slots = [];
  vm.showForm = false;
  
  this.$onInit = () => {
    /*
    $scope.vm = {
      newEvent: {
        startDate: new Date(),
        location: 0,
        startTime: null,
      },
      locale: this.parentCtrl.$stateParams.lang,
      minDate: new Date(),
      loading: false,
      msg: null,
      config: null,
      appointments: null,
      slots: null,
      showForm: false,
    };
    */
    /* Merge i18n with provided strings */
    vm.mergedi18n = merge(i18n, vm.i18n);

    /* Set apikey, $attrs can be a Primo Studio config array or the attrs hash */
    const attrs = Array.isArray($attrs) ? $attrs[0] : $attrs;
    options.apikey = attrs.apikey;

    /* Load config and events */
    vm.loading = true;
    service.getConfig()
    .then(data => {
      if (!data) vm.msg = { text: this.translate('noconfig'), type: 'warning' };
      else vm.config = data;
    })
    .then(() => this.getEvents())
    .catch( e => {
      vm.msg = { text: this.translate('serviceerror'), type: 'error' };
      console.warn(e) 
    })
    .finally( () => vm.loading = false );   
  }

  this.getEvents = () => {
    service.getEvents(vm.config && vm.config.locations)
    .then(appointments => vm.appointments = appointments)
  }

  this.translate = key => 
    vm.mergedi18n[vm.locale] && vm.mergedi18n[vm.locale][key] || 
    vm.mergedi18n[DEFAULT_LOCALE][key] || 
    key;

  this.cancel = id => {
    if (!confirm(this.translate('cancelconfirm'))) return;
    vm.loading = true;
    service.deleteAppointment(id)
    .then(() => {
      vm.msg = { text: this.translate('cancelsuccess'), type: 'success' };          
      setTimeout( () => { vm.msg = null; $scope.$apply(); }, 3000);
      this.hideForm();
    })
    .then(() => this.getEvents() )
    .catch( e => {
      vm.msg = { text: this.translate('cancelfail') + (e.message || e.statusText), type: 'error' };
      setTimeout( () => { vm.msg = null; $scope.$apply(); }, 5000);
    })
    .finally( () => vm.loading = false );
  }

  this.newEventChanged = () => {
    if (vm.newEvent.startDate && vm.newEvent.location) {
      const dt = DateTime.fromJSDate(vm.newEvent.startDate).toISODate();
      service.getSlots(dt)
      .then(data=>{
        const events = data.filter(e=>e.location==vm.newEvent.location);
        vm.slots = buildSlots(events, vm.config, vm.newEvent);
        vm.newEvent.startTime = null;          
      })
    }
  }

  this.add = () => {
    const newEvent = vm.newEvent;
    const body = {
      duration: vm.config.duration,
      location: newEvent.location,
      startTime: newEvent.startTime.toISO()
    }
    vm.loading = true;
    service.createAppointment(body)
    .then( () => {
      vm.msg = { text: this.translate('createsuccess'), type: 'success' };          
      setTimeout( () => { vm.msg = null; $scope.$apply(); }, 3000);
      this.hideForm();
    })
    .then(() => this.getEvents() )
    .catch( e => {
      vm.msg = { text: this.translate('createfail') + (e.message || e.statusText), type: 'error' };
      setTimeout( () => { vm.msg = null; $scope.$apply(); }, 5000);
    })
    .finally( () => vm.loading = false );
  }

  this.hideForm = () => vm.showForm = false;

  this.clearAlert = () => vm.msg = null;
}

AppointmentSchedulerController.$inject = [
  '$scope', '$attrs', 'AppointmentSchedulerOptions', 'AppointmentSchedulerService'
];

export default AppointmentSchedulerController;
