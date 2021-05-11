import { DateTime, Interval } from 'luxon';

export const sortByStartTime = (a, b) => {
  const a1 = DateTime.fromISO(a.startTime),
        b1 = DateTime.fromISO(b.startTime);
  return a1 < b1 ? -1 : a1 > b1 ? 1 : 0;
}; 

export const formatDate = (dt, locale='en') => (DateTime.isDateTime(dt) ? dt : DateTime.fromISO(dt)).setLocale(locale).toLocaleString(DateTime.DATETIME_MED);
export const formatTime = (dt, locale='en') => (DateTime.isDateTime(dt) ? dt : DateTime.fromISO(dt)).setLocale(locale).toLocaleString(DateTime.TIME_SIMPLE);

export const buildSlots = (events, config, newEvent, hoursConfig = {}) => {
  const { startHour, endHour, duration } = config;
  const locationId = newEvent.location; 
  const { capacity, library } = config.locations.find(l=>l.id == locationId);
  /* Build initial slots */
  let slots = [];
  let today = DateTime.fromJSDate(newEvent.startDate).startOf('day');
  const hours = hoursConfig[library] && hoursConfig[library][today.toISODate()];
  if (hours) {
    hours.sort((a, b) => {
      if(a.from > b.from) return 1;
      if(a.from < b.from) return -1;
      return 0;
    });
    hours.forEach(h => {
      today = today.set(timeToDateTime(h.from));
      const end = today.set(timeToDateTime(h.to))
      while (today < end) {
        slots.push(today);
        today = today.plus({ minutes: duration })
      }
    })
  } else {
    today = today.set({ hour: startHour });
    while (today.hour < endHour) {
      slots.push(today);
      today = today.plus({ minutes: duration })
    }
  }

  /* Get capacity configuration */
  let countOverlapping = 1, currentInterval, nextInterval;
  let capacitySlots = [];
  /* Filter events for this location */
  const eventList = events.filter(e=>e.location == locationId).sort(sortByStartTime);
  /* Loop through events, count events per slot, if exceeds capacity add to list */
  for (const e of eventList) {
    nextInterval = Interval.after(DateTime.fromISO(e.startTime), { minutes: e.duration });
    if (currentInterval == undefined) {
      currentInterval = nextInterval;
      continue;
    }
    if (nextInterval.overlaps(currentInterval)) {
      countOverlapping++;
      /* Extend interval if event is longer */
      currentInterval = currentInterval.set({ end: DateTime.max(currentInterval.end, nextInterval.end) });
    } else {
      /* Moved on to next slot */
      if (countOverlapping >= capacity) {
        capacitySlots.push(currentInterval);
      }
      countOverlapping = 1;
      currentInterval = nextInterval;
    }
  }
  /* Check final slot */
  if (currentInterval && countOverlapping >= capacity) {
    capacitySlots.push(currentInterval)
  }
  /* Remove filled slots */
  slots = slots.filter(s=>!capacitySlots.find(c=>
    c.overlaps(Interval.after(s, {minutes: config.duration}))
  ))
  return slots;
}

const timeToDateTime = time => {
  const parts = time.split(':');
  return { hour: parts[0], minute: parts[1] }
}