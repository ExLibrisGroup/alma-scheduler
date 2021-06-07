import { DateTime, Interval } from 'luxon';

export const sortByStartTime = (a, b) => {
  const a1 = DateTime.fromISO(a.startTime),
        b1 = DateTime.fromISO(b.startTime);
  return a1 < b1 ? -1 : a1 > b1 ? 1 : 0;
}; 

export const formatDate = (dt, locale='en') => (DateTime.isDateTime(dt) ? dt : DateTime.fromISO(dt)).setLocale(locale).toLocaleString(DateTime.DATETIME_MED);
export const formatTime = (dt, locale='en') => (DateTime.isDateTime(dt) ? dt : DateTime.fromISO(dt)).setLocale(locale).toLocaleString(DateTime.TIME_SIMPLE);

export const buildSlots = (events, config, newEvent) => {
  const { startHour, endHour, duration } = config;
  /* Build initial slots */
  let today = DateTime.fromJSDate(newEvent.startDate).set({hour: startHour, minute: 0, second: 0, millisecond: 0});
  let slots = [];
  while (today.hour < endHour) {
    slots.push(today);
    today = today.plus({minutes: duration})
  }
  /* Get capacity configuration */
  let countOverlapping = 1, currentInterval, nextInterval;
  const { location } = newEvent; 
  const { capacity } = config.locations.find(l=>l.id == location);
  let capacitySlots = [];
  /* Filter events for this location */
  const eventList = events.filter(e=>e.location == location).sort(sortByStartTime);
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