export const stationMap = {
  capturedAt: '2026-11-03',
  source: '카카오맵 앱 · iPhone 미러링 캡처',
  sourceUrl: 'https://map.kakao.com/link/map/9265313',
  crop: { x: 110, y: 350, width: 470, height: 500, imageWidth: 660, imageHeight: 1454 },
  floors: ['1', '2', '3', '4'],
};

export const mapCategories = [
  { id: 'all', label: '전체' }, { id: 'toilet', label: '화장실' },
  { id: 'elevator', label: '엘리베이터' }, { id: 'shop', label: '매장' }, { id: 'baby', label: '유아시설' },
];

// shortcut: 사진의 표시 지점을 수동 대조한 좌표이며, 지도 범위·방향을 바꾸면 다시 대조해야 한다.
export const mapPins = [
  { id: 'f1-wc-a', floor: '1', category: 'toilet', name: '화장실 표시 구역 A', x: 410, y: 510, evidence: 'evidence/floor-1-toilets.jpg' },
  ...[[179,491],[201,518],[368,481],[504,617],[319,779]].map(([x,y],i) => ({ id: `f1-lift-${i+1}`, floor: '1', category: 'elevator', name: `엘리베이터 표시 지점 ${i+1}`, x, y, evidence: 'evidence/floor-1-elevators.jpg' })),
  { id: 'f2-pharmacy', floor: '2', category: 'shop', name: '오송역약국', x: 236, y: 495, evidence: 'floor-2.jpg', facility: 'pharmacy' },
  { id: 'f2-store', floor: '2', category: 'shop', name: '스토리웨이 편의점', x: 448, y: 550, evidence: 'floor-2.jpg', facility: 'store' },
  { id: 'f2-wc-a', floor: '2', category: 'toilet', name: '화장실 표시 구역 A', x: 391, y: 564, evidence: 'evidence/floor-2-toilets.jpg' },
  { id: 'f2-wc-b', floor: '2', category: 'toilet', name: '화장실 표시 구역 B', x: 268, y: 723, evidence: 'evidence/floor-2-toilets.jpg' },
  ...[[507,377],[368,481],[395,600],[504,617],[318,669],[478,709],[475,756],[547,786],[319,780]].map(([x,y],i) => ({ id: `f2-lift-${i+1}`, floor: '2', category: 'elevator', name: `엘리베이터 표시 지점 ${i+1}`, x, y, evidence: 'evidence/floor-2-elevators.jpg' })),
  { id: 'f2-baby', floor: '2', category: 'baby', name: '유아시설 표시 지점', x: 398, y: 573, evidence: 'evidence/floor-2-baby.jpg' },
  { id: 'f3-tori', floor: '3', category: 'shop', name: '토리만쥬', x: 405, y: 536, evidence: 'floor-3.jpg' },
  { id: 'f3-skin', floor: '3', category: 'shop', name: '스킨밴드', x: 270, y: 641, evidence: 'floor-3.jpg' },
  { id: 'f3-wc-a', floor: '3', category: 'toilet', name: '화장실 표시 구역 A', x: 383, y: 515, evidence: 'evidence/floor-3-toilets.jpg' },
  { id: 'f3-wc-b', floor: '3', category: 'toilet', name: '화장실 표시 구역 B', x: 237, y: 650, evidence: 'evidence/floor-3-toilets.jpg' },
  ...[[179,491],[201,518],[368,481],[335,518],[314,537],[260,580],[237,598],[395,600],[318,670]].map(([x,y],i) => ({ id: `f3-lift-${i+1}`, floor: '3', category: 'elevator', name: `엘리베이터 표시 지점 ${i+1}`, x, y, evidence: 'evidence/floor-3-elevators.jpg' })),
  ...[[314,530],[337,517],[237,598],[260,579]].map(([x,y],i) => ({ id: `f4-lift-${i+1}`, floor: '4', category: 'elevator', name: `엘리베이터 표시 지점 ${i+1}`, x, y, evidence: 'evidence/floor-4-elevators.jpg' })),
];

export function floorPins(floor, category = 'all') {
  return mapPins.filter(pin => pin.floor === floor && (category === 'all' || pin.category === category));
}

export function pinPosition(pin) {
  const c = stationMap.crop;
  return { left: (pin.x - c.x) / c.width * 100, top: (pin.y - c.y) / c.height * 100 };
}

// shortcut: 캡처의 상대 배치를 단순화한 공통 외곽이며, 공식 평면도를 확보하면 층별 내부 구조와 대조한다.
export function stationSchematic(floor) {
  return `<svg class="station-schematic" viewBox="110 350 470 500" role="img" aria-label="오송역 ${floor}층 시설 상대 배치 개략도. 내부 구획과 실제 이동 경로는 생략했습니다." xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="station-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#e7edf6" stroke-width=".6"/></pattern></defs>
    <rect x="110" y="350" width="470" height="500" fill="#f7f9fd"/>
    <rect x="110" y="350" width="470" height="500" fill="url(#station-grid)"/>
    <text x="132" y="384" fill="#173c75" font-size="19" font-weight="750">오송역 <tspan fill="#245de0">${floor}F</tspan></text>
    <text x="132" y="404" fill="#627690" font-size="10">시설 위치 개략도 · 축척 없음</text>
    <path d="M126 526L341 350H411L170 573Z" fill="#e4ebf7" stroke="#b5c6e2" stroke-width="2"/>
    <path d="M142 537L367 350M156 551L389 360" stroke="#bdcce4" stroke-width="3"/>
    <path d="M168 665L139 541L214 479L259 461L299 508L335 510L341 493L327 477L334 462L351 480L364 484L378 474L409 497L449 461L464 445L450 426L479 398L507 370L568 423L545 445L563 464L527 497L492 519L520 544L478 580L491 595L512 614L484 637L563 724L547 743L568 765L551 783L530 761L493 795L471 818L446 790L423 808L395 776L374 796L351 772L319 797L290 766L277 778L255 759Z" fill="#fff" stroke="#7e9cc9" stroke-width="2.5" stroke-linejoin="round"/>
    <text x="317" y="621" fill="#b0bfd5" font-size="28" font-weight="750" text-anchor="middle" transform="rotate(-40 317 621)">OSONG</text>
    <rect x="129" y="815" width="154" height="20" rx="10" fill="#edf2fa"/>
    <text x="206" y="829" text-anchor="middle" fill="#607694" font-size="10">내부 구획·승차홈 번호 생략</text>
  </svg>`;
}

export function clusterPins(pins, zoom = 1) {
  const groups = [];
  for (const pin of pins) {
    const group = groups.find(g => Math.hypot(g.x - pin.x, g.y - pin.y) < 70 / zoom);
    if (group) group.pins.push(pin);
    else groups.push({ x: pin.x, y: pin.y, pins: [pin] });
  }
  return groups;
}
