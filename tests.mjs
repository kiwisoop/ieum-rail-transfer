import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNetwork, findConnections, demoState, demoProgress, minutes } from './routes.mjs';
import { osong, filterFacilities } from './facilities.mjs';
import { stationMap, mapPins, mapCategories, floorPins, pinPosition, clusterPins } from './station-map.mjs';
import { photoMap } from './photo-map.mjs';
import { formatTime, clockTime, serviceOn, findJourneys, journeyStatus } from './booking.mjs';
import { bookingScreen } from './booking-ui.mjs';
import { bookingSnapshot, restoreBooking } from './booking-session.mjs';

const scheduled = (train, stops, note = '매일') => ({ kind: 'KTX', train, train_type: 'KTX', sheet: '테스트선', source: 'fixture', operating_note: note,
  stops: stops.map(([station, time_raw]) => ({ station, time_raw })) });

test('탭 저장은 조회 조건과 선택 열차를 복원하고 손상·변경된 시간표는 신뢰하지 않는다', () => {
  const records = [scheduled('1',[['A','10:00'],['B','11:00']]),scheduled('2',[['B','11:20'],['C','12:00']])];
  const network = createNetwork({records});
  const query = {origin:'A',destination:'C',date:'2026-11-03',after:'06:00',excludeShort:true};
  const selected = findJourneys(network,query).routes[0];
  const raw = bookingSnapshot({...query,selected});
  const restored = restoreBooking(network,raw);
  assert.deepEqual(restored,{...query,selected});
  assert.deepEqual(restoreBooking(network,'{broken'),{});
  assert.deepEqual(restoreBooking(network,'null'),{});
  assert.deepEqual(restoreBooking(network,JSON.stringify({query:{origin:'unknown',date:'2026-11-31',after:'25:00'}})),{});
  const changed = createNetwork({records:[records[0],scheduled('2',[['B','11:30'],['C','12:10']])]});
  assert.equal(restoreBooking(changed,raw).selected,null);
  const altered = JSON.parse(raw); altered.selection.key='untrusted';
  assert.equal(restoreBooking(network,JSON.stringify(altered)).selected,null);
  assert.equal(restoreBooking(network,bookingSnapshot({...query,selected:null})).selected,undefined);
});

test('짧은 간격 필터는 10분 미만 환승만 숨기고 원래 후보 선택 번호를 보존한다', () => {
  const network = createNetwork({records:[scheduled('1',[['A','10:00'],['B','11:00']]),
    scheduled('2',[['B','11:05'],['C','12:00']]),scheduled('3',[['B','11:10'],['C','12:10']])]});
  const params={origin:'A',destination:'C',date:'2026-11-03',after:'06:00',visible:8,error:''};
  const routes=findJourneys(network,params).routes;
  assert.equal(routes.length,2);
  const filtered=bookingScreen({...params,routes,excludeShort:true},network,false,false);
  assert.doesNotMatch(filtered,/data-book-confirm="0"/);
  assert.match(filtered,/data-book-confirm="1"/);
  const unfiltered=bookingScreen({...params,routes,excludeShort:false},network,false,false);
  assert.match(unfiltered,/data-book-confirm="0"/);
  const direct = findJourneys(network,{...params,destination:'B'}).routes;
  assert.match(bookingScreen({...params,routes:direct,excludeShort:true},network,false,false),/data-book-confirm="0"/);
});

test('통합 조회는 날짜·시각이 있는 단일 폼과 여정 바로 선택을 제공하고 환승 알림을 구분한다', () => {
  const records = [scheduled('1',[['A','10:00'],['B','11:00']]),scheduled('2',[['B','11:20'],['C','12:00']])];
  const params = {origin:'A',destination:'C',date:'2026-11-03',after:'06:00',error:'',visible:8};
  const network = createNetwork({records});
  const routes = findJourneys(network,params).routes;
  const page = bookingScreen({...params,routes},network,false,false);
  assert.equal((page.match(/<form\b/g)||[]).length,1);
  assert.match(page,/id="book-date"/); assert.match(page,/id="book-after"/);
  assert.match(page,/data-book-confirm="0"/); assert.doesNotMatch(page,/#review/);
  assert.match(page,/검색된 여정은 환승이 필요해요/);
  const directNetwork=createNetwork({records:[...records,scheduled('3',[['A','10:00'],['C','12:00']])]});
  const mixed=bookingScreen({...params,routes:findJourneys(directNetwork,params).routes},directNetwork,false,false);
  assert.match(mixed,/직통 후보가 있어요/); assert.doesNotMatch(mixed,/검색된 여정은 환승이 필요해요/);
});
test('화면 시각은 분까지만 표시하고 원본 초는 계산에 유지한다', () => {
  assert.equal(formatTime('12:07:30'), '12:07');
  assert.equal(formatTime('09:00'), '09:00');
  assert.equal(formatTime('25:00:00'), '—');
  assert.equal(formatTime(null), '—');
  assert.equal(minutes('12:07:30'), 727.5);
});
test('운행일 비고는 명확한 요일만 제외하며 공휴일·미제공은 미확인으로 남긴다', () => {
  assert.equal(serviceOn('매일', '2026-11-03'), true);
  assert.equal(serviceOn('금토일', '2026-11-03'), false);
  assert.equal(serviceOn('월화수목금', '2026-11-03'), true);
  assert.equal(serviceOn('평일', '2026-11-07'), false);
  assert.equal(serviceOn('평일', '2026-11-03'), null);
  assert.equal(serviceOn('', '2026-11-03'), null);
});
test('열차편 조회는 역방향·이른 환승·동일 열차·중복을 제외하고 출발시각 조건을 따른다', () => {
  const a = scheduled('1', [['A','10:00:00'],['B','11:00:30']]);
  const b = scheduled('2', [['B','11:15:00'],['C','12:00:00']]);
  const early = scheduled('3', [['B','09:00:00'],['C','10:00:00']]);
  const net = createNetwork({records:[a,a,b,b,early,scheduled('1',[['B','11:20:00'],['C','12:20:00']])]});
  const input = {origin:'A',destination:'C',date:'2026-11-03',after:'06:00'};
  const result = findJourneys(net,input);
  assert.equal(result.routes.length,1);
  const route = result.routes[0];
  assert.equal(route.transfer,'B');
  assert.equal(route.gap,14.5);
  assert.deepEqual(route.legs.map(l=>l.train),['1','2']);
  assert.equal(findJourneys(net,{...input,after:'10:01'}).routes.length,0);
  assert.equal(findJourneys(net,{...input,origin:'C',destination:'A'}).routes.length,0);
  assert.match(findJourneys(net,{...input,origin:'A',destination:'A'}).error,/다르게/);
  assert.ok(findJourneys(net,{...input,date:'2026-02-30'}).error);
  assert.ok(findJourneys(net,{...input,date:'2026-10-31'}).error);
});
test('선택한 두 열차는 시간 비율로 이동하고 환승 대기·다음 열차·도착으로 이어진다', () => {
  const net=createNetwork({records:[scheduled('1',[['A','10:00'],['B','11:00']]),scheduled('2',[['B','11:05'],['C','12:05']])]});
  const route=findJourneys(net,{origin:'A',destination:'C',date:'2026-11-03'}).routes[0];
  const at=time=>Date.parse(`2026-11-03T${time}:00+09:00`);
  assert.match(journeyStatus(route,at('09:59')).message,/출발 전/);
  assert.equal(journeyStatus(route,at('10:30')).legs[0].percent,50);
  assert.match(journeyStatus(route,at('11:02')).message,/환승 대기/);
  assert.equal(journeyStatus(route,at('11:35')).legs[1].percent,50);
  assert.match(journeyStatus(route,at('12:05')).message,/여정을 마쳤/);
  const delayed=journeyStatus(route,at('11:35'),true);
  assert.equal(delayed.gap,-5);
  assert.equal(delayed.missed,true);
  assert.equal(delayed.legs[1].percent,0);
  assert.equal(delayed.legs[1].phase,'탑승 확인 필요');
  const overlapping=journeyStatus(route,at('11:06'),true);
  assert.equal(overlapping.legs[0].phase,'이동 중');
  assert.equal(overlapping.legs[1].phase,'탑승 확인 필요');
  assert.equal(overlapping.legs[1].percent,0);
});
test('자정이 지나는 같은 열차는 익일 도착으로 계산한다', () => {
  const net=createNetwork({records:[scheduled('1',[['A','23:30'],['B','00:30']])]});
  const route=findJourneys(net,{origin:'A',destination:'B',date:'2026-11-03'}).routes[0];
  assert.equal(route.end-route.start,3600000);
  assert.equal(clockTime(route.end),'00:30');
  assert.match(new Date(route.end+9*3600000).toISOString(),/^2026-11-04/);
});

test('역 이름을 균등 배치해도 열차 위치는 각 역의 정차시각 사이에서 보간한다', () => {
  const net = createNetwork({ records: [scheduled('1', [['A','10:00'],['B','10:10'],['C','11:10']])] });
  const route = findJourneys(net, { origin:'A', destination:'C', date:'2026-11-03' }).routes[0];
  const at = time => Date.parse(`2026-11-03T${time}:00+09:00`);
  for (const [time, expected] of [['09:59',0],['10:05',25],['10:10',50],['10:40',75],['11:10',100]]) {
    assert.equal(journeyStatus(route,at(time)).legs[0].railPercent,expected);
  }
});

test('실제 시간표의 선택 여정은 날짜·열차번호·원본 시트와 순서가 맞는 환승시각을 보존한다', () => {
  const network = createNetwork(JSON.parse(readFileSync(new URL('./data/timetable.json', import.meta.url), 'utf8')));
  for (const [origin, destination] of [['목포','울산'],['강릉','안동'],['춘천','목포']]) {
    const { routes, error } = findJourneys(network, { origin, destination, date:'2026-11-03', after:'06:00' });
    assert.equal(error,''); assert.ok(routes.length > 0);
    for (const route of routes) {
      assert.equal(route.legs[0].stops[0].station,origin);
      assert.equal(route.legs.at(-1).stops.at(-1).station,destination);
      assert.ok(route.end > route.start);
      assert.ok(route.legs.every(l => l.train && l.source && l.sheet));
      if (route.transfer) { assert.ok(route.gap > 0 && route.gap <= 120); assert.notEqual(route.legs[0].service,route.legs[1].service); }
    }
  }
});

test('역 안내도는 외부 지도 이미지 없이 표시하고 층만 확인한 시설을 핀과 구분한다', () => {
  const guide = photoMap();
  assert.match(guide, /<svg[^>]+viewBox="110 350 470 500"[^>]+role="img"/);
  assert.doesNotMatch(guide, /<(?:img|image|script)\b/);
  for (const id of ['nursing', 'lockers']) {
    assert.match(guide, new RegExp(`data-photo="${id}"`));
    assert.ok(!mapPins.some(pin => pin.facility === id));
    assert.equal(osong.facilities.find(facility => facility.id === id).floor, '2');
  }
  assert.match(guide, /data-map-pin="f2-pharmacy"/);
});

test('사진 지도 지점은 층·범위·출처 캡처와 연결되고 식별자가 겹치지 않는다', () => {
  assert.equal(mapPins.length, 37);
  assert.equal(new Set(mapPins.map(pin => pin.id)).size, mapPins.length);
  for (const floor of stationMap.floors) {
    const bytes = readFileSync(new URL(`./assets/osong/floor-${floor}.jpg`, import.meta.url));
    assert.equal(bytes.readUInt16BE(0), 0xffd8);
    assert.ok(floorPins(floor).length > 0);
  }
  for (const pin of mapPins) {
    assert.ok(stationMap.floors.includes(pin.floor));
    assert.ok(mapCategories.some(category => category.id === pin.category));
    const position = pinPosition(pin);
    assert.ok(position.left >= 0 && position.left <= 100 && position.top >= 0 && position.top <= 100);
    const evidence = readFileSync(new URL(`./assets/osong/${pin.evidence}`, import.meta.url));
    assert.equal(evidence.readUInt16BE(0), 0xffd8);
    if (pin.facility) assert.ok(osong.facilities.some(facility => facility.id === pin.facility && facility.floor === pin.floor));
    assert.equal('walkingMinutes' in pin, false);
    assert.equal('openNow' in pin, false);
  }
  assert.deepEqual(pinPosition({ x:110, y:350 }), { left:0, top:0 });
  assert.deepEqual(pinPosition({ x:580, y:850 }), { left:100, top:100 });
});

test('층·종류별 사진 지도 필터는 다른 층의 표시를 섞지 않는다', () => {
  assert.deepEqual(floorPins('2', 'shop').map(pin => pin.name), ['오송역약국', '스토리웨이 편의점']);
  assert.deepEqual(floorPins('3', 'shop').map(pin => pin.name), ['토리만쥬', '스킨밴드']);
  assert.equal(floorPins('2', 'baby').length, 1);
  assert.equal(floorPins('4', 'toilet').length, 0);
  assert.equal(floorPins('5').length, 0);
  assert.equal(floorPins('2', 'unknown').length, 0);
  for (const floor of stationMap.floors) assert.ok(floorPins(floor).every(pin => pin.floor === floor));
});

test('겹친 핀을 묶어도 표시 지점이 누락·중복되지 않고 확대하면 분리된다', () => {
  const pins = floorPins('2');
  for (const zoom of [1,2,3]) {
    const groups = clusterPins(pins, zoom);
    assert.deepEqual(groups.flatMap(group => group.pins).map(pin => pin.id).sort(), pins.map(pin => pin.id).sort());
    assert.ok(groups.every(group => group.pins.every(pin => Math.hypot(group.x-pin.x, group.y-pin.y) < 70/zoom)));
  }
  assert.ok(clusterPins(pins, 3).length > clusterPins(pins, 1).length);
  assert.deepEqual(clusterPins([]), []);
});

const record = (train, sheet, stations) => ({ kind: 'KTX', train, train_type: 'KTX', sheet, source: 'fixture',
  operating_note: '월화수목금', stops: stations.map((station, i) => ({ station, time_raw: `10:${String(i * 5).padStart(2, '0')}:00` })) });

test('정차 순서의 정방향만 직접 연결한다', () => {
  const net = createNetwork({ records: [record('1', '첫노선', ['A', 'B', 'C'])] });
  assert.deepEqual(findConnections(net, 'A', 'C').routes[0].stops, ['A', 'B', 'C']);
  assert.equal(findConnections(net, 'C', 'A').routes.length, 0);
});

test('최대 1회 환승하며 2회 환승은 반환하지 않는다', () => {
  const net = createNetwork({ records: [record('1', '첫노선', ['A', 'B']), record('2', '둘째노선', ['B', 'C']), record('3', '셋째노선', ['C', 'D'])] });
  const route = findConnections(net, 'A', 'C').routes[0];
  assert.equal(route.transfer, 'B');
  assert.equal(route.legs.length, 2);
  assert.equal(findConnections(net, 'A', 'D').routes.length, 0);
});

test('같은 열차가 여러 시트에 있어도 자기 자신으로 환승하지 않는다', () => {
  const net = createNetwork({ records: [record('1', '첫노선', ['A', 'B']), record('1', '둘째노선', ['B', 'C'])] });
  assert.equal(findConnections(net, 'A', 'C').routes.length, 0);
});

test('같은 노선의 서로 다른 열차끼리 환승할 수 있다', () => {
  const net = createNetwork({ records: [record('1', '첫노선', ['A', 'B']), record('2', '첫노선', ['B', 'C'])] });
  assert.equal(findConnections(net, 'A', 'C').routes[0].transfer, 'B');
});

test('열차·시트 중복은 같은 연결 후보를 늘리지 않는다', () => {
  const first = record('1', '첫노선', ['A', 'B']);
  const second = record('2', '둘째노선', ['B', 'C']);
  const net = createNetwork({ records: [first, first, second, { ...second, train: '3' }] });
  const routes = findConnections(net, 'A', 'C').routes;
  assert.equal(routes.length, 1);
  assert.equal(routes[0].legs[1].note, '월화수목금');
});

test('직통 후보를 우선하고 순환하는 환승을 제거한다', () => {
  const net = createNetwork({ records: [record('1', '첫노선', ['A', 'B', 'C']), record('2', '둘째노선', ['B', 'A', 'C'])] });
  const routes = findConnections(net, 'A', 'C').routes;
  assert.ok(routes.length > 0);
  assert.ok(routes[0].transfer === null);
  assert.ok(routes.every(r => new Set(r.stops).size === r.stops.length));
});

test('비정차 0 시각·누락·잘못된 시각을 역 목록과 경로에서 제외한다', () => {
  const row = record('1', '첫노선', ['A', 'B', 'C', 'D', 'E']);
  row.stops[1].time_raw = '00:00:00';
  row.stops[2].time_raw = null;
  row.stops[3].time_raw = '25:00:00';
  const net = createNetwork({ records: [row] });
  assert.deepEqual(net.stations, ['A', 'E']);
  assert.deepEqual(findConnections(net, 'A', 'E').routes[0].stops, ['A', 'E']);
});

test('잘못된 자료 형식을 명확한 오류로 처리한다', () => {
  assert.throws(() => createNetwork({}), /정차정보/);
  assert.throws(() => createNetwork({ records: [{}] }), /열차정보/);
});

test('동일역·없는역·미입력과 연결 없음 상태를 구분한다', () => {
  const net = createNetwork({ records: [record('1', '첫노선', ['A', 'B']), record('2', '둘째노선', ['C', 'D'])] });
  assert.match(findConnections(net, 'A', 'A').error, /다르게/);
  assert.match(findConnections(net, 'A', '없는역').error, /목록/);
  assert.match(findConnections(net, '', 'B').error, /모두/);
  assert.deepEqual(findConnections(net, 'A', 'D'), { error: '', routes: [] });
});

test('가상 정상·지연과 이동정보 4분·미제공을 독립적으로 계산한다', () => {
  for (const known of [false, true]) {
    assert.equal(demoState(false, known).gap, 15);
    assert.equal(demoState(true, known).gap, 5);
    assert.equal(demoState(true, known).movement, known ? 4 : null);
  }
  assert.equal(minutes('14:20:30'), 860.5);
  for (const invalid of [null, '', '25:00', '14:60', '14:20:60']) assert.equal(minutes(invalid), null);
});

test('실제 자료의 267개 역·역명 구분·대표 연결을 확인한다', () => {
  const data = JSON.parse(readFileSync(new URL('./data/timetable.json', import.meta.url), 'utf8'));
  const net = createNetwork(data);
  assert.equal(net.stations.length, 267);
  for (const station of ['김천', '김천구미', '천안', '천안아산', '아산', '울산', '태화강']) assert.ok(net.stations.includes(station));
  for (const [from, to, via] of [['목포', '울산', '오송'], ['강릉', '안동', '서원주'], ['춘천', '목포', '용산']]) {
    const routes = findConnections(net, from, to).routes;
    assert.ok(routes.some(r => r.transfer === via), `${from}→${via}→${to}`);
    assert.ok(routes.every(r => r.stops[0] === from && r.stops.at(-1) === to && r.legs.length <= 2));
    assert.equal(new Set(routes.map(r => JSON.stringify([r.transfer, ...r.legs.map(l => l.line)]))).size, routes.length);
    assert.ok(routes.every(r => r.legs.length === 1 || r.legs[0].service !== r.legs[1].service));
  }
  assert.equal(findConnections(net, '목포', '대곡').routes.length, 0);
  assert.ok(findConnections(net, '서울', '부산').routes.some(r => r.transfer === null));
});

test('가상 진행 위치는 시간에 비례하고 지연된 오송 도착을 반영한다', () => {
  for (const delayed of [false, true]) {
    const progress = demoProgress(delayed);
    assert.equal(progress.now, '13:59');
    assert.equal(progress.stops[0].percent, 0);
    assert.equal(progress.stops.at(-1).percent, 100);
    assert.equal(progress.stops.at(-1).time, demoState(delayed).arrival);
    assert.ok(progress.stops.every((s,i,a) => i === 0 || s.percent > a[i-1].percent));
    assert.ok(progress.percent > progress.stops[2].percent && progress.percent < 100);
    const duration = minutes(demoState(delayed).arrival) - minutes('12:00');
    assert.equal(progress.percent, (minutes(progress.now) - minutes('12:00')) / duration * 100);
  }
  assert.ok(demoProgress(true).percent < demoProgress(false).percent);
});

test('시설 종류·층 필터는 미확인 위치를 특정 층으로 배정하지 않는다', () => {
  assert.equal(filterFacilities().length, 8);
  assert.deepEqual(filterFacilities('access').map(f => f.id), ['toilet', 'elevator']);
  assert.equal(filterFacilities('access', '2').length, 0);
  assert.deepEqual(filterFacilities('food', '2').map(f => f.id), ['store']);
  assert.deepEqual(filterFacilities('food', '3').map(f => f.id), ['dunkin']);
  assert.ok(filterFacilities('all', '2').every(f => f.location && f.floor === '2'));
});

test('확인된 위치·사진은 공식 원문에 추적되고 미제공 운영시간을 생성하지 않는다', () => {
  const source = JSON.parse(readFileSync(new URL('./data/osong-source.json', import.meta.url), 'utf8'));
  assert.equal(new Set(osong.facilities.map(f => f.id)).size, osong.facilities.length);
  for (const facility of osong.facilities) {
    if (facility.location) {
      const original = source.floorResultList.find(row => row.seq === facility.sourceId);
      assert.ok(original, facility.name);
      assert.equal(original.floor, `지상 ${facility.floor}층`);
      assert.equal(facility.photoUrl, `https://www.korail.com/file/cubedata/COMMON/${original.imgFileName}`);
    } else {
      assert.equal(facility.floor, null);
      assert.equal(facility.photoUrl, null);
    }
    if (facility.id !== 'shelter') assert.equal(facility.hours, undefined);
    assert.equal(facility.walkingMinutes, undefined);
    assert.equal(facility.openNow, undefined);
  }
  assert.ok(osong.facilities.find(f => f.id === 'shelter').additionalSource.startsWith('https://fund.chungbuk.ac.kr/'));
});
