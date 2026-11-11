import { osong } from '../facilities.mjs';
import { demoState, minutes } from '../routes.mjs';

export const facilities = {
  none: { name: '바로 환승', floor: '3층 환승 통로', level:'3', distance: 0, vertical: 0, stay: 0 },
  toilet: { name: '화장실', floor: '3층 · 예시 위치', level:'3', x:326, y:126, pinLabel:'WC', distance: 40, vertical: 0, stay: 3 },
  store: { name: '편의점', floor: '2층 · 예시 위치', level:'2', x:292, y:442, pinLabel:'편의점', distance: 70, vertical: 45, stay: 4 },
};

// shortcut: 시설명·층은 기존 오송역 자료를 재사용하지만 핀 좌표·구간 길이는 시안용 가정이다. 실측 동선 확보 시 교체한다.
for(const [id,x,y,distance,pinLabel] of [
  ['pharmacy',292,530,65,'약국'], ['nursing',133,164,80,'수유실'],
  ['lockers',132,590,55,'보관함'], ['dunkin',86,300,35,'던킨'],
  ['shelter',86,523,85,'쉼터'],
]) {
  const source=osong.facilities.find(f=>f.id===id);
  facilities[id]={name:source.name, floor:source.floor+'층', level:source.floor, x,y,pinLabel,
    distance,vertical:source.floor==='2'?45:0,stay:0};
}

export function clock(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function schedule(delayed = false) {
  const demo = demoState(delayed);
  return { start: 720, arrival: minutes(demo.arrival), departure: minutes(demo.departure), end: 980, gap: demo.gap };
}

export function trainPosition(at, delayed = false) {
  const s = schedule(delayed);
  const fraction = (start, end) => Math.max(0, Math.min(1, (at - start) / (end - start)));
  return {
    first: fraction(s.start, s.arrival), second: fraction(s.departure, s.end),
    label: at < s.start ? '목포 출발 전' : at < s.arrival ? '오송으로 이동 중' : at < s.departure ? '오송역 환승 시간' : at < s.end ? '부산으로 이동 중' : '부산 도착',
  };
}

// shortcut: 동선과 구간 길이는 시안용 가정이며, 실측 도면을 확보하면 실제 보행 연결과 거리로 교체한다.
export function routePlan({ facility = 'none', location = 'platform', speed = 1.2, stay = facilities[facility]?.stay, wait = null, available = 15 } = {}) {
  if (!Object.hasOwn(facilities, facility) || !['platform', 'hall', 'facility'].includes(location) ||
      (facility === 'none' && location === 'facility') || !Number.isFinite(speed) || speed < .5 || speed > 2 ||
      !Number.isFinite(stay) || stay < 0 || stay > 20 || (wait !== null && (!Number.isFinite(wait) || wait < 0 || wait > 20)) || !Number.isFinite(available)) {
    throw new RangeError('경로 계산 조건을 확인해 주세요.');
  }
  const chosen = facilities[facility];
  const steps = [];
  if (location === 'platform') steps.push({ label: '3번 승차홈 → 3층 대합실', distance: 60, vertical: 45 });
  if (facility !== 'none') {
    if (location !== 'facility') steps.push({ label: `대합실 → ${chosen.name}`, distance: chosen.distance, vertical: chosen.vertical });
    steps.push({ label: `${chosen.name} → 3층 대합실`, distance: chosen.distance, vertical: chosen.vertical });
  }
  steps.push({ label: '대합실 → 7번 승차홈', distance: 90, vertical: 45 });
  const meters = steps.reduce((sum, s) => sum + s.distance, 0);
  const vertical = steps.reduce((sum, s) => sum + s.vertical, 0);
  const walking = meters / speed / 60 + vertical / 60;
  const dwell = facility === 'none' ? 0 : stay;
  const queue = facility === 'none' ? 0 : wait;
  const buffer = 2;
  const required = walking + dwell + (queue ?? 0) + buffer;
  return { steps, meters, walking, dwell, queue, buffer, required, remaining: available - required, unknown: queue === null };
}
