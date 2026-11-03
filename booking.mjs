import { minutes } from './routes.mjs';

const minute = 60000;
export const todayKST = () => new Date(Date.now() + 9 * 60 * minute).toISOString().slice(0, 10);
export function formatTime(value) {
  return minutes(value) === null ? '—' : value.slice(0, 5);
}
export function clockTime(epoch) {
  return new Date(epoch + 9 * 60 * minute).toISOString().slice(11, 16);
}
function dateStart(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const epoch = Date.parse(`${date}T00:00:00+09:00`);
  return Number.isFinite(epoch) && new Date(epoch + 9 * 60 * minute).toISOString().slice(0, 10) === date ? epoch : NaN;
}
export function serviceOn(note, date) {
  const day = new Date(`${date}T12:00:00+09:00`).getUTCDay();
  if (note === '매일') return true;
  if (/^[일월화수목금토]+$/.test(note)) return note.includes('일월화수목금토'[day]);
  if (note === '평일' && [0, 6].includes(day)) return false;
  if (note === '휴일' && [0, 6].includes(day)) return true;
  return null;
}
function timedRecord(record, start) {
  let previous = -1, offset = 0;
  const stops = [];
  for (const stop of record.stops) {
    let value = minutes(stop.time_raw);
    if (value === null) return null;
    if (value + offset < previous) {
      if (previous - value - offset < 720) return null;
      offset += 1440;
    }
    value += offset;
    stops.push({ ...stop, at: start + value * minute });
    previous = value;
  }
  return { ...record, stops };
}
function segment(record, from, to) {
  return { train: record.train, type: record.train_type || record.kind, service: record.service,
    line: record.line, sheet: record.sheet, note: record.operating_note || '자료 미제공', source: record.source,
    stops: record.stops.slice(from, to + 1) };
}

export function findJourneys(network, { origin, destination, date, after = '00:00', effectiveFrom = '2026-11-01' }) {
  const start = dateStart(date), afterMinutes = minutes(after);
  if (!origin || !destination) return { error: '출발역과 도착역을 선택하세요.', routes: [] };
  if (origin === destination) return { error: '출발역과 도착역을 다르게 선택하세요.', routes: [] };
  if (![origin, destination].every(station => network.stations.includes(station))) return { error: '목록에 있는 역을 선택하세요.', routes: [] };
  if (!Number.isFinite(start) || date < effectiveFrom) return { error: `${effectiveFrom} 이후의 올바른 날짜를 선택하세요.`, routes: [] };
  if (afterMinutes === null) return { error: '출발 시각을 확인하세요.', routes: [] };
  const records = network.records.filter(r => serviceOn(r.operating_note, date) !== false).map(r => timedRecord(r, start)).filter(Boolean);
  const boarding = new Map();
  for (const record of records) for (let i = 0; i < record.stops.length - 1; i++) {
    const station = record.stops[i].station;
    if (!boarding.has(station)) boarding.set(station, []);
    boarding.get(station).push({ record, i });
  }
  const candidates = new Map();
  const add = (legs, transfer = null) => {
    const path = legs.flatMap((leg, i) => leg.stops.slice(i ? 1 : 0).map(s => s.station));
    if (new Set(path).size !== path.length) return;
    const key = JSON.stringify([transfer, ...legs.map(l => [l.service, l.stops[0].at, l.stops.at(-1).at])]);
    const route = { date, origin, destination, transfer, legs, stopCount: path.length,
      start: legs[0].stops[0].at, end: legs.at(-1).stops.at(-1).at,
      gap: transfer ? (legs[1].stops[0].at - legs[0].stops.at(-1).at) / minute : null };
    const previous = candidates.get(key);
    if (!previous || path.length < previous.stopCount) candidates.set(key, route);
  };
  for (const { record: first, i } of boarding.get(origin) || []) {
    if (first.stops[i].at < start + afterMinutes * minute || first.stops[i].at >= start + 1440 * minute) continue;
    for (let j = i + 1; j < first.stops.length; j++) {
      const station = first.stops[j].station;
      if (station === destination) { add([segment(first, i, j)]); break; }
      for (const { record: next, i: k } of boarding.get(station) || []) {
        if (first.service === next.service) continue;
        const gap = (next.stops[k].at - first.stops[j].at) / minute;
        // shortcut: 같은 승차일 자료에서 0분 초과~120분 연결만 체험하며, 익일 새 출발 열차는 별도 자료 확인이 필요하다.
        if (gap <= 0 || gap > 120) continue;
        const end = next.stops.findIndex((s, n) => n > k && s.station === destination);
        if (end !== -1) add([segment(first, i, j), segment(next, k, end)], station);
      }
    }
  }
  return { error: '', routes: [...candidates.values()].sort((a, b) => a.start - b.start || a.end - b.end || a.legs.length - b.legs.length).slice(0, 120) };
}

export function journeyStatus(route, at, delayed = false) {
  const legs = route.legs.map((leg, i) => {
    const shift = i === 0 && delayed ? 10 * minute : 0;
    const stops = leg.stops.map(stop => ({ ...stop, at: stop.at + shift }));
    const start = stops[0].at, end = stops.at(-1).at;
    const percent = end > start ? Math.max(0, Math.min(100, (at - start) / (end - start) * 100)) : at >= end ? 100 : 0;
    const current = Math.max(0, stops.findLastIndex(stop => stop.at <= at));
    const next = Math.min(current + 1, stops.length - 1);
    const interval = stops[next].at - stops[current].at;
    const fraction = interval > 0 ? Math.max(0, Math.min(1, (at - stops[current].at) / interval)) : 0;
    const railPercent = at >= end ? 100 : at < start ? 0 : (current + fraction) / Math.max(1, stops.length - 1) * 100;
    return { ...leg, stops, start, end, percent, railPercent, current,
      phase: at < start ? '탑승 전' : at >= end ? '구간 도착' : '이동 중' };
  });
  const gap = legs.length === 2 ? (legs[1].start - legs[0].end) / minute : null;
  const missed = gap !== null && gap <= 0;
  let message = '출발 전 · 열차 정보를 확인하세요.';
  if (missed && at >= legs[0].end) message = '환승 연결 확인 필요 · 다음 열차가 먼저 출발하는 시간표입니다.';
  else if (at >= legs.at(-1).end) message = `${route.destination} 도착 · 여정을 마쳤어요.`;
  else {
    const moving = legs.find(l => at >= l.start && at < l.end);
    if (moving) message = `${moving.type} ${moving.train} · ${moving.stops[moving.current].station} → ${moving.stops[moving.current + 1].station} 이동 중`;
    else if (route.transfer && at >= legs[0].end) message = `${route.transfer} 환승 대기 · 다음 열차 ${clockTime(legs[1].start)}`;
  }
  if (missed && at >= legs[1].start) { legs[1].phase = '탑승 확인 필요'; legs[1].percent = 0; legs[1].railPercent = 0; }
  return { legs, gap, missed, message };
}
