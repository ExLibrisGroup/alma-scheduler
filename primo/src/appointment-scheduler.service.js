import { sortByStartTime } from './utils';

function AppointmentSchedulerHttpInterceptor($httpProvider, options) {
  $httpProvider.interceptors.push(function () {
    return {
      request: function (req) {
        req.params = req.params || {};
        if (req.url.startsWith(options.schedulerApi)) {
          /* Get token from sessionStorage */
          let token = sessionStorage.getItem('primoExploreJwt');
          /* Sometimes token is surrounded by quotes */
          token = token && token.replace(/"/g, "");
          req.headers.Authorization = `Bearer ${token}`;
          if (!!options.sandbox) req.params.sandbox = 'true';
        }
        return req;
      }
    };
  });
}

AppointmentSchedulerHttpInterceptor.$inject = ['$httpProvider', 'AppointmentSchedulerOptions'];

function AppointmentSchedulerService($http, options) {
  return {
    getConfig: () => $http.get(options.schedulerApi + '/config')
      .then( data => data.data  ),

    getEvents: (locations = []) => $http.get(options.schedulerApi + '/events')
      .then( data => {
        let today = new Date().setUTCHours(0,0,0);
        let appointments = data.data
        .filter(appt=>new Date(appt.startTime) > today)
        .map(appt => {
          let location = locations.find(location=>location.id==appt.location);
          location = location && location.name || "";
          return {
            id: appt._id,
            startTime: appt.startTime, 
            location
          }
        })
        .sort(sortByStartTime);
        return appointments;
      }),

    getSlots: date => $http.get(options.schedulerApi + `/slots?date=${date}`)
      .then( resp => resp.data ),

    deleteAppointment: id => $http.delete(`${options.schedulerApi}/events/${id}`),

    createAppointment: appt => $http.post(options.schedulerApi + '/events', appt)

  }
}

AppointmentSchedulerService.$inject = ['$http', 'AppointmentSchedulerOptions'];

export { AppointmentSchedulerHttpInterceptor, AppointmentSchedulerService };