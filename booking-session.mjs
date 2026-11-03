import { clockTime, findJourneys } from './booking.mjs';

const routeKey = route => JSON.stringify([route.date, route.origin, route.destination,
  ...route.legs.map(leg => [leg.service, leg.stops[0].at, leg.stops.at(-1).at])]);

export function bookingSnapshot(state) {
  return JSON.stringify({ query: { origin: state.origin, destination: state.destination,
    date: state.date, after: state.after, excludeShort: state.excludeShort },
    selection: state.selected ? { origin: state.selected.origin, destination: state.selected.destination,
      date: state.selected.date, after: clockTime(state.selected.start), key: routeKey(state.selected) } : null });
}

export function restoreBooking(network, raw) {
  try {
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return {};
    const restored = {};
    const query = saved.query;
    if (query && typeof query === 'object') {
      for (const field of ['origin', 'destination']) {
        if (network.stations.includes(query[field])) restored[field] = query[field];
      }
      if (typeof query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
        && Number.isFinite(Date.parse(query.date)) && new Date(query.date).toISOString().slice(0, 10) === query.date
        && query.date >= '2026-11-01') restored.date = query.date;
      if (typeof query.after === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(query.after)) restored.after = query.after;
      if (typeof query.excludeShort === 'boolean') restored.excludeShort = query.excludeShort;
    }
    const selection = saved.selection;
    if (selection && typeof selection.key === 'string'
      && ['origin', 'destination', 'date', 'after'].every(field => typeof selection[field] === 'string')) {
      restored.selected = findJourneys(network, selection).routes.find(route => routeKey(route) === selection.key) || null;
    }
    return restored;
  } catch {
    return {};
  }
}
