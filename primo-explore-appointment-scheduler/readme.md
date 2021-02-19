# primo-explore-appointment-scheduler
Adds a widget in Primo account overview screen to allow patrons to manage their appointments made with the [Alma Appointment Scheduler Cloud App](https://developers.exlibrisgroup.com/appcenter/appointment-scheduler/).

## Features
* View/cancel existing appointments
* Create new appointmen
* Cancel existing appointment
* Works with configuration from the Appointment Scheduler Cloud App
  * List of locations
  * Lists appointment slots based on start and end hours
  * Lists appointment slots dependent on location capacity
* Supports overriding display strings and localizations based on Primo interface language

### Screenshots
![screenshot](primo-explore-appointment-scheduler-account.png)

Account home page

![screenshot](primo-explore-appointment-scheduler-widget.png)

Widget in new appointment state

## Install
1. Make sure you've installed and configured [primo-explore-devenv](https://github.com/ExLibrisGroup/primo-explore-devenv).
2. Navigate to your template/central package root directory. For example:
    ```
    cd primo-explore/custom/MY_VIEW_ID
    ```
3. If you do not already have a `package.json` file in this directory, create one:
    ```
    npm init -y
    ```
4. Install this package:
    ```
    npm install primo-explore-appointment-scheduler --save-dev
    ```

## Usage
Once this package is installed, add `appointmentScheduler` as a dependency for your custom module definition.

```js
const app = angular.module('viewCustom', ['appointmentScheduler']);
```

Note: If you're using the `--browserify` build option, you will need to first import the module with:

```javascript
import 'primo-explore-appointment-scheduler';
```

Then add the `appointment-scheduler` component to the `prmAccountOverviewAfter` placeholder as follows:

```js
/** Appointment Scheduler in Library Card */
app.component('prmAccountOverviewAfter', {
  bindings: {parentCtrl: '<'},
  template: `<appointment-scheduler 
    parent-ctrl="$ctrl.parentCtrl"
    apikey="l8xx..."
  ></appointment-scheduler>`
});
/** END Appointment Scheduler in Library Card */
```

## Configuration
The following configuration parameters are available:
| Parameter | Description |
| --- | --- |
| apikey | An [API key](https://developers.exlibrisgroup.com/primo/apis/) which is configured for read-only on the **Primo Public Key API only**. (This is important as the key will be exposed in the HTML). The key is used to validate the authorization token.   |
| i18n |  Overrides for the strings used in the display. The list of string is available [here](https://github.com/ExLibrisGroup/alma-scheduler/blob/master/primo-explore-appointment-scheduler/src/i18n.js). Any string not provided will fall-back to the default. Strings can be provided in different Primo locales (i.e. en, fr). <br>Example:<br><pre>i18n='{<br>  en: {<br>    appointments: "Library Appointments"<br>  },<br>  fr: {<br>    appointments: "Rendez-vous à la bibliothèque"<br>  }<br>}'</pre>|

## Development
To build this add-on, use:
```
npm run build
```

To publish:
```
npm publish
```

## Contributions
We welcome contributions to this community-supported add-on. We're also happy to add additional default translations to the [string file](https://github.com/ExLibrisGroup/alma-scheduler/blob/master/primo-explore-appointment-scheduler/src/i18n.js).
