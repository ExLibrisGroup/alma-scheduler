import { DateTime } from 'luxon';
import i18n from './i18n';
import { merge } from 'lodash'
import { buildSlots } from './utils';

const DEFAULT_LOCALE = 'en';

function AppointmentSchedulerController ($scope, $attrs, options, service) {
  this.$onInit = () => {
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
    this.mergedi18n = merge(i18n, this.i18n);

    /* Set apikey, $attrs can be a Primo Studio config array or the attrs hash */
    const attrs = Array.isArray($attrs) ? $attrs[0] : $attrs;
    options.apikey = attrs.apikey;

    /* Load config and events */
    $scope.vm.loading = true;
    service.getConfig()
    .then(data => {
      if (!data) $scope.vm.msg = { text: $scope.translate('noconfig'), type: 'warning' };
      else $scope.vm.config = data;
    })
    .then(() => this.getEvents())
    .catch( e => {
      $scope.vm.msg = { text: $scope.translate('serviceerror'), type: 'error' };
      console.warn(e) 
    })
    .finally( () => $scope.vm.loading = false );   
  }

  this.getEvents = () => {
    service.getEvents($scope.vm.config && $scope.vm.config.locations)
    .then(appointments => $scope.vm.appointments = appointments)
  }

  $scope.translate = key => 
    this.mergedi18n[$scope.vm.locale] && this.mergedi18n[$scope.vm.locale][key] || 
    this.mergedi18n[DEFAULT_LOCALE][key] || 
    key;

  $scope.cancel = id => {
    if (!confirm($scope.translate('cancelconfirm'))) return;
    $scope.vm.loading = true;
    service.deleteAppointment(id)
    .then(() => {
      $scope.vm.msg = { text: $scope.translate('cancelsuccess'), type: 'success' };          
      setTimeout( () => { $scope.vm.msg = null; $scope.$apply(); }, 3000);
      $scope.hideForm();
    })
    .then(() => this.getEvents() )
    .catch( e => {
      $scope.vm.msg = { text: $scope.translate('cancelfail') + (e.message || e.statusText), type: 'error' };
      setTimeout( () => { $scope.vm.msg = null; $scope.$apply(); }, 5000);
    })
    .finally( () => $scope.vm.loading = false );
  }

  $scope.newEventChanged = () => {
    if ($scope.vm.newEvent.startDate && $scope.vm.newEvent.location) {
      const dt = DateTime.fromJSDate($scope.vm.newEvent.startDate).toISODate();
      service.getSlots(dt)
      .then(data=>{
        const events = data.filter(e=>e.location==$scope.vm.newEvent.location);
        $scope.vm.slots = buildSlots(events, $scope.vm.config, $scope.vm.newEvent);
        $scope.vm.newEvent.startTime = null;          
      })
    }
  }

  $scope.add = () => {
    const newEvent = $scope.vm.newEvent;
    const body = {
      duration: $scope.vm.config.duration,
      location: newEvent.location,
      startTime: newEvent.startTime.toISO()
    }
    $scope.vm.loading = true;
    service.createAppointment(body)
    .then( () => {
      $scope.vm.msg = { text: $scope.translate('createsuccess'), type: 'success' };          
      setTimeout( () => { $scope.vm.msg = null; $scope.$apply(); }, 3000);
      $scope.hideForm();
    })
    .then(() => this.getEvents() )
    .catch( e => {
      $scope.vm.msg = { text: $scope.translate('createfail') + (e.message || e.statusText), type: 'error' };
      setTimeout( () => { $scope.vm.msg = null; $scope.$apply(); }, 5000);
    })
    .finally( () => $scope.vm.loading = false );
  }

  $scope.hideForm = () => $scope.vm.showForm = false;

  $scope.clearAlert = () => $scope.vm.msg = null;
}

AppointmentSchedulerController.$inject = [
  '$scope', '$attrs', 'AppointmentSchedulerOptions', 'AppointmentSchedulerService'
];

export default AppointmentSchedulerController;
