import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule, trainPosition, routePlan } from './journey.mjs';

test('정상·지연의 간격은 15분·5분이고 다음 열차 출발은 같다', () => {
  assert.equal(schedule().gap, 15);
  assert.equal(schedule(true).gap, 5);
  assert.equal(schedule().departure, schedule(true).departure);
  assert.equal(trainPosition(830, true).first < trainPosition(830).first, true);
  assert.equal(trainPosition(900).first, 1);
  assert.equal(trainPosition(900).second > 0, true);
  assert.equal(trainPosition(1000).second, 1);
});

test('시설 양방향 이동·층간 이동·이용시간·준비시간을 합산한다', () => {
  const direct = routePlan();
  const toilet = routePlan({ facility:'toilet', wait:2 });
  const store = routePlan({ facility:'store', wait:2 });
  assert.equal(direct.meters, 150);
  assert.equal(direct.queue, 0);
  assert.equal(toilet.meters, 230);
  assert.equal(store.meters, 290);
  assert.ok(store.walking > toilet.walking);
  assert.equal(toilet.required, toilet.walking + 3 + 2 + 2);
  assert.equal(toilet.remaining, 15 - toilet.required);
  assert.ok(routePlan({facility:'store', available:5, wait:5}).remaining < 0);
});

test('현재 위치·보행속도 변경과 대기정보 누락을 구분한다', () => {
  const base = routePlan({facility:'toilet'});
  assert.equal(base.unknown, true);
  assert.equal(base.queue, null);
  const known = routePlan({facility:'toilet',wait:0});
  assert.equal(known.unknown, false);
  assert.equal(known.required, base.required);
  assert.ok(routePlan({facility:'toilet',location:'hall'}).required < base.required);
  assert.ok(routePlan({facility:'toilet',location:'facility'}).required < routePlan({facility:'toilet',location:'hall'}).required);
  assert.ok(routePlan({facility:'toilet',speed:.9}).required > base.required);
});

test('불명확한 입력과 비정상 수치는 계산하지 않는다', () => {
  for(const input of [{facility:'unknown'},{location:'unknown'},{location:'facility'}, {speed:0},{speed:NaN},{stay:-1},{stay:21},{wait:-1},{wait:NaN},{available:NaN}]) {
    assert.throws(()=>routePlan(input), RangeError);
  }
});

import {guideFloors, facilityFloor, stationGuide, boardSource} from './station-guide.mjs';
test('시설 층과 원본 출처를 유지하고 잘못된 지도 입력을 거절한다',()=>{
  assert.equal(facilityFloor('store'),'2');
  assert.equal(facilityFloor('toilet'),'3');
  assert.ok(boardSource.startsWith('https://hiosong.kr/'));
  for(const {id} of guideFloors) {
    assert.ok(stationGuide({floor:id,facility:'store'}).includes('<svg'));
  }
  for(const input of [{floor:'1'},{facility:'unknown'},{location:'GPS'}])assert.throws(()=>stationGuide(input),RangeError);
});

test('추가 시설의 층과 경유·복귀 구간을 모두 연결한다',()=>{
  for(const id of ['pharmacy','nursing','lockers','dunkin','shelter']) {
    const floor=facilityFloor(id),plan=routePlan({facility:id});
    assert.ok(['2','3'].includes(floor));
    assert.ok(Number.isFinite(plan.walking)&&plan.walking>0);
    assert.equal(plan.steps.length,4);
    assert.ok(routePlan({facility:id,location:'facility'}).walking<plan.walking);
    assert.ok(stationGuide({floor,facility:id}).includes(`data-facility="${id}"`));
  }
});

test('화살표는 이동 방향을 따르고 시설 앞에서는 복귀 경로만 표시한다',()=>{
  const going=stationGuide({floor:'2',facility:'store'});
  assert.ok(going.includes('route-outbound'));
  assert.ok(going.includes('route-return'));
  assert.ok(going.includes('route-chevron'));
  const returning=stationGuide({floor:'2',facility:'store',location:'facility'});
  assert.ok(!returning.includes('route-outbound'));
  assert.ok(returning.includes('route-return'));
  const platform=stationGuide({floor:'4'});
  assert.ok(platform.includes('rotate(0)'));
  assert.ok(platform.includes('rotate(180)'));
});
