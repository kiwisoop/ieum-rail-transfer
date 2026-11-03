export function minutes(time) {
  if (typeof time !== 'string' || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) return null;
  const [h, m, s = 0] = time.split(':').map(Number);
  return h < 24 && m < 60 && s < 60 ? h * 60 + m + s / 60 : null;
}

export function demoState(delayed = false, movementKnown = false) {
  const arrival = delayed ? '14:20' : '14:10';
  return { arrival, departure: '14:25', gap: minutes('14:25') - minutes(arrival), movement: movementKnown ? 4 : null };
}

export function demoProgress(delayed = false) {
  const stops = [['목포', '12:00'], ['익산', '13:05'], ['공주', '13:50'], ['오송', demoState(delayed).arrival]];
  const start = minutes(stops[0][1]);
  const duration = minutes(stops.at(-1)[1]) - start;
  const now = '13:59';
  return { now, percent: (minutes(now) - start) / duration * 100,
    stops: stops.map(([station, time]) => ({ station, time, percent: (minutes(time) - start) / duration * 100 })) };
}

export function createNetwork(data) {
  if (!Array.isArray(data?.records)) throw new Error('정차정보 형식을 확인해 주세요.');
  // shortcut: 시트별 구간만 탐색하며, 시트 간 직통 연결이 필요하면 운행일·정차 순서를 검증해 병합한다.
  const records = data.records.map(record => {
    if (!record || !Array.isArray(record.stops) || !record.kind || !record.train || !record.sheet) {
      throw new Error('열차정보 형식을 확인해 주세요.');
    }
    const stops = record.stops.filter(stop => stop && typeof stop.station === 'string' && stop.station.trim() &&
      minutes(stop.time_raw) !== null && minutes(stop.time_raw) > 0);
    return { ...record, stops, line: record.sheet.startsWith('동해선') ? '동해선' : record.sheet,
      service: `${record.kind}:${record.train}` };
  }).filter(record => record.stops.length > 1);
  const boarding = new Map();
  records.forEach(record => record.stops.forEach((stop, index) => {
    if (index === record.stops.length - 1) return;
    if (!boarding.has(stop.station)) boarding.set(stop.station, []);
    boarding.get(stop.station).push({ record, index });
  }));
  return { records, boarding, metadata: data.metadata || {}, stations: [...new Set(records.flatMap(r => r.stops.map(s => s.station)))].sort((a, b) => a.localeCompare(b, 'ko')) };
}

function leg(record, start, end) {
  return { line: record.line, train: record.train, type: record.train_type, service: record.service,
    source: record.source, sheet: record.sheet, note: record.operating_note || '비고 없음',
    stops: record.stops.slice(start, end + 1) };
}

export function findConnections(network, origin, destination) {
  if (!origin || !destination) return { error: '출발역과 도착역을 모두 선택해 주세요.', routes: [] };
  if (origin === destination) return { error: '출발역과 도착역을 다르게 선택해 주세요.', routes: [] };
  if (!network.stations.includes(origin) || !network.stations.includes(destination)) {
    return { error: '목록에 있는 역을 선택해 주세요.', routes: [] };
  }
  const options = new Map();
  function add(legs, transfer = null) {
    const path = legs.flatMap((l, i) => l.stops.slice(i ? 1 : 0).map(s => s.station));
    if (new Set(path).size !== path.length) return;
    const key = JSON.stringify([transfer, ...legs.map(l => l.line)]);
    const candidate = { legs, transfer, stops: path, count: path.length - 1 };
    const previous = options.get(key);
    if (!previous || candidate.count < previous.count) options.set(key, candidate);
  }
  for (const { record: first, index: start } of network.boarding.get(origin) || []) {
    for (let end = start + 1; end < first.stops.length; end++) {
      const station = first.stops[end].station;
      if (station === destination) {
        add([leg(first, start, end)]);
        break;
      }
      for (const { record: second, index: nextStart } of network.boarding.get(station) || []) {
        if (first.service === second.service) continue;
        const nextEnd = second.stops.findIndex((s, i) => i > nextStart && s.station === destination);
        if (nextEnd !== -1) add([leg(first, start, end), leg(second, nextStart, nextEnd)], station);
      }
    }
  }
  return { error: '', routes: [...options.values()].sort((a, b) => a.legs.length - b.legs.length || a.count - b.count ||
    (a.transfer || a.legs[0].line).localeCompare(b.transfer || b.legs[0].line, 'ko')) };
}
