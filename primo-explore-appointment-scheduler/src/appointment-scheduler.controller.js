import { DateTime } from 'luxon';
import i18n from './i18n';
import { merge } from 'lodash'
import { buildSlots } from './utils';

const DEFAULT_LOCALE = 'en';

function AppointmentSchedulerController ($scope, $attrs, options, service) {
  this.$onInit = () => {
    /* Set apikey, $attrs can be a Primo Studio config array or the attrs hash */
    const attrs = Array.isArray($attrs) ? $attrs[0] : $attrs;
    options.apikey = attrs.apikey;

    $scope.newEvent = {
      startDate: new Date(),
      location: 0
    };
    $scope.locale = this.parentCtrl.$stateParams.lang;
    this.mergedi18n = merge(i18n, this.i18n);
    $scope.minDate = new Date();

    /* Load config and events */
    $scope.loading = true;
    service.getConfig()
    .then(data => {
      if (!data) $scope.msg = { text: $scope.translate('noconfig'), type: 'warning' };
      else $scope.config = data;
    })
    .then(() => this.getEvents())
    .catch( e => {
      $scope.msg = { text: $scope.translate('serviceerror'), type: 'error' };
      console.warn(e) 
    })
    .finally( () => $scope.loading = false );   
  }

  this.getEvents = () => {
    service.getEvents($scope.config.locations)
    .then(appointments => $scope.appointments = appointments)
  }

  $scope.translate = key => 
    this.mergedi18n[$scope.locale] && this.mergedi18n[$scope.locale][key] || 
    this.mergedi18n[DEFAULT_LOCALE][key] || 
    key;

  $scope.cancel = id => {
    if (!confirm($scope.translate('cancelconfirm'))) return;
    $scope.loading = true;
    service.deleteAppointment(id)
    .then(() => {
      $scope.msg = { text: $scope.translate('cancelsuccess'), type: 'success' };          
      setTimeout( () => { $scope.msg = null; $scope.$apply(); }, 3000);
      $scope.hideForm();
    })
    .then(() => this.getEvents() )
    .catch( e => {
      $scope.msg = { text: $scope.translate('cancelfail') + (e.msg || e.status), type: 'error' };
      setTimeout( () => { $scope.msg = null; $scope.$apply(); }, 5000);
    })
    .finally( () => $scope.loading = false );
  }

  $scope.newEventChanged = () => {
    if ($scope.newEvent.startDate && $scope.newEvent.location) {
      const dt = DateTime.fromJSDate($scope.newEvent.startDate).toISODate();
      service.getSlots(dt)
      .then(data=>{
        const events = data.filter(e=>e.location==$scope.newEvent.location);
        $scope.slots = buildSlots(events, $scope.config, $scope.newEvent);            
      })
    }
  }

  $scope.add = () => {
    const newEvent = $scope.newEvent;
    const body = {
      duration: $scope.config.duration,
      location: newEvent.location,
      startTime: newEvent.startTime.toISO()
    }
    $scope.loading = true;
    service.createAppointment(body)
    .then( () => {
      $scope.msg = { text: $scope.translate('createsuccess'), type: 'success' };          
      setTimeout( () => { $scope.msg = null; $scope.$apply(); }, 3000);
      $scope.hideForm();
    })
    .then(() => this.getEvents() )
    .catch( e => {
      $scope.msg = { text: $scope.translate('createfail') + (e.msg || e.status), type: 'error' };
      setTimeout( () => { $scope.msg = null; $scope.$apply(); }, 5000);
    })
    .finally( () => $scope.loading = false );
  }

  $scope.hideForm = () => $scope.showForm=false;

  $scope.clearAlert = () => $scope.msg = null;
}

AppointmentSchedulerController.$inject = [
  '$scope', '$attrs', 'AppointmentSchedulerOptions', 'AppointmentSchedulerService'
];

export default AppointmentSchedulerController;
