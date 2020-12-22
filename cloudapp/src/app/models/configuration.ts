import { FormGroup } from '@angular/forms';
import { FormGroupUtil } from '@exlibris/exl-cloudapp-angular-lib';
import * as uuid from 'uuid';

export class Configuration {
  locations: Location[] = [];
  duration: number = 15;
  startHour: number = 8;
  endHour: number = 18;
  notification: Notification = new Notification();
}

export class Notification {
  active: boolean = true;
  sms: boolean = false;
  countryCode: string = null;
  dateFormat: string = null;
  subject: string = 'Your library appointment';
  body: string = "Hi there!\n\nWe're happy to let you know that your appointment at the library has been set for {{startTime}}.\n\nLooking forward to seeing you at {{location}}.\n\n-The library staff";
  cancelBody: string = "Your appointment at the library has been cancelled."
  replyTo: string = '';
  from: string = 'Your library';
}

export class Location {
  id: string = uuid.v4();
  color: string = Object.keys(Colors)[rand(Object.keys(Colors).length)];
  name: string = 'Location';
  capacity: number = 1;
  replyTo: string = '';
}

export interface Color {
  primary: string;
  secondary: string
}

export const configFormGroup = (configuration: Configuration): FormGroup => {
  return FormGroupUtil.toFormGroup(migrateConfiguration(configuration));
}

export const migrateConfiguration = (configuration: Configuration): Configuration => {
  configuration.notification = Object.assign(new Notification(), configuration.notification);
  const defaultLocation = new Location();
  configuration.locations.forEach((loc, i) =>
    configuration.locations[i] = Object.assign({...defaultLocation}, loc)
  );
  return configuration;
}

export const locationFormGroup = (location: Location = null): FormGroup => {
  if (location==null) location = new Location();
  return FormGroupUtil.toFormGroup(location);
}

export const Colors: any = {
  purple: {
    primary: '#511379',
    secondary: '#F4ECF7',
  },
  blue: {
    primary: '#004d8f',
    secondary: '#a8c5e5',
  },
  green: {
    primary: '#006f38',
    secondary: '#b6e0cf',
  },
  yellow: {
    primary: '#7D6608',
    secondary: '#FCF3CF'
  },
  orange: {
    primary: '#ff7b1e',
    secondary: '#ffd8c6'
  },
  red: {
    primary: '#ff0617',
    secondary: '#ffd0d0'
  },
  grey: {
    primary: '#17202A',
    secondary: '#D5D8DC'

  },
  brown: {
    primary: '#6E2C00',
    secondary: '#F6DDCC'
  }
};

const rand = (max: number) => Math.floor(Math.random() * Math.floor(max));
