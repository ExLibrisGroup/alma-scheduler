import { DateTime} from 'luxon';
import i18n from './i18n';
import { merge } from 'lodash'
import { sortByStartTime, buildSlots } from './utils';
import './appointment-scheduler.component.scss';

const DEFAULT_LOCALE = 'en';

angular
  .module("appointmentScheduler", [])
  .filter('formatDate', () => (dt, locale='en') => (DateTime.isDateTime(dt) ? dt : DateTime.fromISO(dt)).setLocale(locale).toLocaleString(DateTime.DATETIME_MED))
  .filter('formatTime', () => (dt, locale='en') => (DateTime.isDateTime(dt) ? dt : DateTime.fromISO(dt)).setLocale(locale).toLocaleString(DateTime.TIME_SIMPLE))
  .constant('appointmentSchedulerOptions', 
    {
      "schedulerApi": "https://api-eu.exldevnetwork.net/alma-scheduler/patron",
    }
  )
  .controller('AppointmentSchedulerController', [
    '$http', '$scope', '$attrs', 'appointmentSchedulerOptions', 
    function ($http, $scope, $attrs, appointmentSchedulerOptions) {
      this.$onInit = () => {
        // Get token from sessionStorage
        let token = sessionStorage.getItem('primoExploreJwt');
        /* Sometimes token is surrounded by quotes */
        token = token && token.replace(/"/g, "");
        this.httpOptions = {
          headers: {
            Authorization: 'Bearer ' + token,
            'X-Exl-Apikey': $attrs.apikey
          }
        };
        $scope.newEvent = {
          startDate: new Date(),
          location: 0
        };
        $scope.locale = this.parentCtrl.$stateParams.lang;
        this.mergedi18n = merge(i18n, this.i18n);
        $scope.minDate = new Date();

        /* Load config and events */
        $scope.loading = true;
        $http.get(appointmentSchedulerOptions.schedulerApi + '/config', this.httpOptions)
        .then(data => {
          if (data.data) {
            $scope.config = data.data;
          } else {
            $scope.msg = { text: $scope.translate('noconfig'), type: 'warning' };
          }
        })
        .then(() => this.getEvents())
        .catch( e => {
          $scope.msg = { text: $scope.translate('serviceerror'), type: 'error' };
          console.warn(e) 
        })
        .finally( () => $scope.loading = false );   
      }

      this.getEvents = () => {
        return $http.get(appointmentSchedulerOptions.schedulerApi + '/events', this.httpOptions)
        .then( data => {
          let today = new Date().setUTCHours(0,0,0);
          let appointments = data.data
          .filter(appt=>new Date(appt.startTime) > today)
          /* Filter out removed locations */
          .filter(appt=>$scope.config && $scope.config.locations.some(location=>location.id==appt.location))
          .map(appt=>({
            id: appt._id,
            startTime: appt.startTime, 
            location: $scope.config && $scope.config.locations.find(location=>location.id==appt.location).name
          }))
          .sort(sortByStartTime);
          $scope.appointments = appointments;
        })
      }

      this.getSlots = date => {
        return $http.get(appointmentSchedulerOptions.schedulerApi + `/slots?date=${date}`, this.httpOptions)
        .then( resp => resp.data )        
      }

      $scope.translate = key => 
        this.mergedi18n[$scope.locale] && this.mergedi18n[$scope.locale][key] || 
        this.mergedi18n[DEFAULT_LOCALE][key] || 
        key;

      $scope.cancel = id => {
        if (!confirm($scope.translate('cancelconfirm'))) return;
        $scope.loading = true;
        $http.delete(`${appointmentSchedulerOptions.schedulerApi}/events/${id}`, this.httpOptions)
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
          this.getSlots(dt)
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
        $http.post(appointmentSchedulerOptions.schedulerApi + '/events', body, this.httpOptions)
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
  ])
  .component('appointmentScheduler', {
    bindings: {parentCtrl: '<', i18n: '<'},
    controller: 'AppointmentSchedulerController',
    template: require('./appointment-scheduler.component.html')
});
