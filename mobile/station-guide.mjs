import { facilities } from './journey.mjs?v=20261111-detailed-10';
export const guideFloors = [
  {id:'4', name:'KTX 승강장'},
  {id:'3', name:'승강장 연결로'},
  {id:'2', name:'대합실·매장'},
];
export const boardSource = 'https://hiosong.kr/cheongju/place/?id=a3a72a21-c7ff-4a38-bfb8-7f477021faca';
export const boardPhoto = 'https://ixlgzuuipxwqgkbvyank.supabase.co/storage/v1/object/public/region-images/field/osong-station-20260923/braille-map.jpg';
export function facilityFloor(facility) { return facilities[facility]?.level ?? '3'; }
const text = (x,y,t,size=13) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}">${t}</text>`;
const box = (x,y,w,h,t) => `<g class="guide-room"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>${text(x+w/2,y+h/2+5,t)}</g>`;
const stair = (x,y,t) => `<g class="guide-escalator"><rect x="${x-20}" y="${y-18}" width="40" height="36" rx="4"/><path d="M${x-12} ${y+9}h8v-8h8v-8h8"/>${t?text(x,y-29,t,11):''}</g>`;
const pin = (x,y,id,selected) => `<g class="guide-pin ${selected?'selected':''}" data-facility="${id}" role="button" tabindex="0" aria-label="${facilities[id].name} 경유 선택" aria-pressed="${selected}"><rect x="${x-29}" y="${y-25}" width="58" height="50" rx="9"/>${text(x,y+5,facilities[id].pinLabel,facilities[id].pinLabel==='WC'?19:12)}</g>`;

const lift = (x,y) => `<g class="guide-lift"><rect x="${x-11}" y="${y-12}" width="22" height="24" rx="2"/><path d="M${x-6} ${y+7}V${y-6}l3 3m-3-3-3 3M${x+6} ${y-7}V${y+6}l3-3m-3 3-3-3"/></g>`;
const seats = (x,y,rows=3) => `<g class="guide-seats">${Array.from({length:rows},(_,i)=>`<path d="M${x} ${y+i*19}h50"/>${[0,18,36].map(dx=>`<rect x="${x+dx}" y="${y+i*19-7}" width="12" height="9" rx="2"/>`).join('')}`).join('')}</g>`;
const doorway = (x,y) => `<path class="guide-door" d="M${x} ${y}v-15m0 15a15 15 0 0 1 15-15"/>`;

export function directionArrows(points, returning=false) {
  const segments=points.slice(1).map(([x,y],i)=>{
    const [px,py]=points[i],length=Math.hypot(x-px,y-py);
    if(length<24)return '';
    const angle=Math.atan2(y-py,x-px)*180/Math.PI;
    return `<path class="route-chevron" d="M-5-5L0 0-5 5" transform="translate(${(px+x)/2} ${(py+y)/2}) rotate(${angle})"/>`;
  }).join('');
  return `<g class="directed-route ${returning?'route-return':'route-outbound'}"><polyline class="guide-route" points="${points.map(p=>p.join(',')).join(' ')}"/>${segments}</g>`;
}

function floorRoutes(floor,facility,location) {
  const f=facilities[facility],routes=[];
  if(floor==='4')return '';
  if(floor==='2') {
    if(facility==='none'||facilityFloor(facility)!=='2')return '';
    const edge=f.x<190?f.x+35:f.x-35;
    if(location!=='facility')routes.push(directionArrows([[215,169],[215,236],[190,236],[190,f.y-7],[edge,f.y-7]]));
    routes.push(directionArrows([[edge,f.y+7],[206,f.y+7],[206,228],[228,228],[228,169]],true));
  } else {
    const start=location==='hall'?[239,418]:[207,280];
    if(facility==='none')return directionArrows([start,[207,320],[231,320],[231,418],[309,418],[309,450]]);
    const downstairs=facilityFloor(facility)==='2';
    const edge=downstairs?175:f.x<150?f.x+35:f.x-35;
    const y=downstairs?548:f.y;
    if(location!=='facility')routes.push(directionArrows([start,[207,320],[231,320],[231,y-7],[edge,y-7]]));
    routes.push(directionArrows([[edge,y+7],[247,y+7],[247,430],[309,430],[309,450]],true));
  }
  return routes.join('');
}

// shortcut: 현장 점자 안내판의 외곽·공간 연결을 수동으로 옮긴 비축척 도식이다. 시설 핀과 승차홈 번호별 연결은 실측 대조 후 교체한다.
export function stationGuide({floor='3',facility='none',location='platform',playing=false}={}) {
  if(!guideFloors.some(f=>f.id===floor)||!Object.hasOwn(facilities,facility)||!['platform','hall','facility'].includes(location)) throw new RangeError('안내도 조건을 확인해 주세요.');
  let drawing='', position=null;
  if(floor==='4') {
    drawing=[90,190,290,390].map((y,i)=>`<g class="platform-row"><path class="guide-track" d="M25 ${y-18}H395 M25 ${y-12}H395"/>
      <rect class="platform-surface" x="25" y="${y}" width="370" height="76" rx="5"/>
      ${i===1||i===3?directionArrows(i===1?[[90,y+50],[312,y+50]]:[[312,y+50],[90,y+50]],i===3):''}
      ${text(150,y+23,`${i*2+1}·${i*2+2}번 승차홈`,14)}${text(337,y+22,'3층 연결',11)}${stair(337,y+50,'')}
      ${i===1?`<g class="platform-position"><circle cx="72" cy="${y+50}" r="10"/><circle cx="72" cy="${y+50}" r="17"/></g>`:i===3?`<g class="platform-target"><circle cx="72" cy="${y+50}" r="14"/>${text(72,y+55,'7',14)}</g>`:''}
      ${i===1?text(219,y+69,'하차 3번 · 예시',10):i===3?text(219,y+69,'다음 열차 7번 · 예시',10):''}</g>`).join('');
  } else if(floor==='3') {
    // 원본 우측: 서편의 긴 대기 구역 + 계단·승강기가 반복되는 꺾인 연결로.
    drawing=`<path class="guide-zone" d="M36 168H126V626H36Z"/>
      <path class="guide-zone" d="M146 164H170V143H205V120H249V91H369V616H388V658H265V635H212V604H148Z"/>
      <path class="guide-wall" d="M36 385H108M126 168V249M126 343V465M126 566V626
        M275 92V174H350M275 570H350V615M148 238H184V286H158M148 457H184V505H158
        M369 235H337V285H364M369 461H337V511H364"/>
      ${box(281,100,75,62,'')}${box(281,570,75,57,'WC')}
      ${text(81,201,'서편 대기 구역',11)}${text(82,408,'환승대기실',12)}
      ${text(239,355,'승강장 연결로',12)}${text(240,374,'타는 곳 안내 확인',10)}
      ${stair(207,256,'')}${stair(309,256,'')}${stair(207,477,'')}${stair(309,477,'')}
      ${text(207,223,'승차홈 연결',10)}${text(309,223,'승차홈 연결',10)}
      ${text(207,518,'승차홈 연결',10)}${text(309,518,'승차홈 연결',10)}
      ${lift(263,195)}${lift(349,308)}${lift(263,551)}${lift(154,548)}
      ${text(264,178,'EV',9)}${text(349,337,'EV',9)}
      ${doorway(126,263)}${doorway(126,480)}
      <path class="guide-connection" d="M126 319H157M126 546H145"/>
      ${seats(52,220,2)}${seats(52,440,2)}
      ${text(160,596,'↓ 2층',10)}${text(319,646,'연결 통로',10)}`;
    const f=facilities[facility];
    position=location==='hall'?[239,418]:location==='facility'&&facilityFloor(facility)==='3'?[f.x<150?145:266,f.y]:null;
  } else {
    // 원본 중앙: 위아래의 이동 설비, 왼쪽 역무실과 오른쪽의 긴 대합실.
    drawing=`<path class="guide-zone" d="M82 90H244V115H277V90H328V646H82Z"/>
      <path class="guide-wall" d="M82 205H176V536H82M82 555H176V646M82 90V188H176
        M177 90V122M176 195V205M82 205H116M153 205H176"/>
      ${box(94,104,70,32,'WC')}${text(133,313,'역무실',14)}${text(133,336,'안내·문의',10)}
      ${text(264,268,'대합실',15)}${text(264,288,'맞이방',10)}
      ${stair(215,147,'')}${stair(215,589,'')}${lift(301,125)}${lift(301,615)}
      ${stair(292,201,'')}${stair(292,568,'')}
      ${text(215,115,'3층 연결',10)}${text(215,632,'3층 연결',10)}
      ${text(301,76,'EV',9)}${text(301,668,'EV',9)}
      ${doorway(176,370)}${doorway(176,487)}
      ${seats(243,319,3)}
      <path class="guide-connection" d="M197 235V552"/>
      ${text(132,557,'보관 구역',10)}${text(292,402,'동편 매장',10)}
      ${box(256,412,72,62,'')}${box(256,500,72,62,'')}`;

    if(location==='facility'&&facilityFloor(facility)==='2')position=[197,facilities[facility].y];
  }
  const zones=(drawing.match(/<path class="guide-zone"[^>]*\/>/g)??[]).join('');
  drawing=drawing.replace(/<path class="guide-zone"[^>]*\/>/g,'');
  const pins=Object.entries(facilities).filter(([id,f])=>id!=='none'&&f.level===floor).map(([id,f])=>pin(f.x,f.y,id,id===facility)).join('');
  return `<svg class="station-board ${playing?'route-playing':''}" viewBox="0 0 420 ${floor==='4'?510:720}" role="group" aria-label="오송역 ${floor}층 재구성 안내도. 선택 경로는 가상 예시이며 실제 거리와 출입 조건은 미검증입니다." xmlns="http://www.w3.org/2000/svg"><rect width="420" height="${floor==='4'?510:720}" rx="9" fill="#102f47"/>${text(210,33,`오송역 · ${guideFloors.find(f=>f.id===floor).name}`,17)}<text x="24" y="${floor==='4'?490:698}" class="guide-sub">안내판 기반 재구성 · 시설 핀·거리는 예시</text>${zones}${floorRoutes(floor,facility,location)}${drawing}${pins}${position?`<g class="guide-marker"><circle cx="${position[0]}" cy="${position[1]}" r="11"/><circle cx="${position[0]}" cy="${position[1]}" r="18"/></g>`:''}</svg>`;
}

export function guideScreen({floor,facility,location,zoom,playing}) {
  const viaSecond = facility !== 'none' && facilityFloor(facility) === '2';
  const floorLinks = [];
  if (floor === '4' && location === 'platform') floorLinks.push(['3','하차 후 3층 연결로 보기']);
  if (floor === '3' && viaSecond && location !== 'facility') floorLinks.push(['2','시설로 내려가기 · 2층 경로 보기']);
  if (floor === '2' && viaSecond) floorLinks.push(['3','시설에서 나와 3층 연결로 보기']);
  if (floor === '3') floorLinks.push(['4','7번 승차홈으로 올라가는 경로 보기']);
  return `<div class="board-heading"><div><span class="eyebrow">오송역 시설 안내</span><h2 class="card-title">층별로 경로를 확인해요</h2></div><span class="pill">층별 안내</span></div>
    <div class="floor-tabs" aria-label="안내도 층 선택">${guideFloors.map(f=>`<button data-floor="${f.id}" aria-pressed="${f.id===floor}"><strong>${f.id==='4'?'승강장':f.id+'층'}</strong><span>${f.name}</span></button>`).join('')}</div>
    <p class="board-summary">${facility==='none'?'승차홈 → 3층 연결로 → 다음 승차홈':`${facilityFloor(facility)}층 ${facilities[facility].name} 경유 → 다음 승차홈`}</p>
    <div class="board-tools"><span>시설 핀을 눌러 선택해요</span><div><button data-zoom="out" aria-label="안내도 축소" ${zoom===1?'disabled':''}>−</button><button data-zoom="reset" aria-label="안내도 원래 크기">${Math.round(zoom*100)}%</button><button data-zoom="in" aria-label="안내도 확대" ${zoom===2?'disabled':''}>＋</button></div></div>
    <div class="board-viewport" tabindex="0" aria-label="확대 시 좌우로 스크롤할 수 있는 층별 안내도"><div class="board-canvas" style="width:${zoom*100}%">${stationGuide({floor,facility,location,playing})}</div></div>
    ${floorLinks.map(([id,label])=>`<button class="secondary floor-link" data-floor="${id}">${label} →</button>`).join('')}
    <div class="board-legend"><span><i class="legend-route"></i>${facility==='none'?'하차 후 이동':'시설로 이동'}</span><span><i class="legend-return"></i>다음 승차홈으로</span><span><i class="legend-position"></i>선택한 위치</span><span><i class="legend-lift"></i>승강기</span></div>
    <p class="map-caption">오송역사 점자안내도의 공간 연결을 참고했어요. 화살표는 이동 방향을 보여주는 경로 예시예요. 매장 위치·승차홈 연결·거리와 무장애 경로는 미검증이에요.</p>
`;
}
