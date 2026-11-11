import { facilities, clock, schedule, trainPosition, routePlan } from './journey.mjs?v=20261111-detailed-10';
import { guideScreen, facilityFloor } from './station-guide.mjs?v=20261112-compare-14';

const main = document.querySelector('#main');
const state = { tab: 'tickets', delayed: false, at: 835, alighted: false, facility: 'none', location: 'platform', floor: '3', zoom: 1, step: -1, playing: false };
const arrow = '<span aria-hidden="true">→</span>';
const icons = {
  train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 10h14M9 3v7M15 3v7M8 18l-3 4m11-4 3 4M8 21h8"/><circle cx="8.5" cy="14" r=".8"/><circle cx="15.5" cy="14" r=".8"/></svg>',
  toilet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="7" cy="5" r="2"/><circle cx="17" cy="5" r="2"/><path d="M4 10h6v6H4zm2 6v6m3-6v6m6-12h4l2 8h-8zm1 8v4m3-4v4"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 10l2-6h14l2 6M4 11v10h16V11M9 21v-7h6v7M3 10q2 5 5 0 4 5 8 0 3 5 5 0"/></svg>',
};
const facilityPhotos = {
  toilet:{file:'real/restroom-west.jpg',alt:'오송역 화장실 표지와 주변 휠체어 보관함',caption:'화장실 주변 참고 사진'},
  store:{file:'official/store.jpg',alt:'오송역 스토리웨이 편의점 입구',caption:'스토리웨이 편의점'},
  pharmacy:{file:'real/store-and-pharmacy-2f.jpg',alt:'오송역약국 간판과 오른쪽 스토리웨이 편의점 입구',caption:'왼쪽 약국 · 오른쪽 편의점'},
  nursing:{file:'real/nursing-room-2f.jpg',alt:'오송역 수유방 출입문과 수유방 안내 표지',caption:'수유방 입구'},
  lockers:{file:'official/lockers.jpg',alt:'오송역 물품보관함과 무인 결제기',caption:'물품보관함 · 작은 원본 사진',small:true},
  dunkin:{file:'official/dunkin.jpg',alt:'오송역 던킨 매장 입구와 내부 좌석',caption:'던킨 매장 입구'},
  shelter:{file:'official/shelter.jpg',alt:'열린쉼터 충북대학교 간판과 출입문',caption:'충북대학교 열린쉼터 입구'},
};
function facilityChoices() {
  const atFacility = state.location === 'facility';
  const origin = atFacility ? 'hall' : state.location;
  const directMinutes = Math.ceil(routePlan({location:origin}).walking);
  return Object.entries(facilities).map(([id,f])=>{
    const photo=facilityPhotos[id],selected=state.facility===id;
    const minutes = Math.ceil(routePlan({facility:id, location:origin}).walking);
    const estimate = atFacility
      ? (id === 'none' ? '대합실 출발 기준' : '이 시설 앞에서 출발')
      : (id === 'none' ? `도보 약 ${minutes}분` : `약 ${minutes - directMinutes}분 더`);
    return `<article class="facility-option ${selected?'is-selected':''} ${id==='none'?'direct-option':''}"><button class="facility-select" data-facility="${id}" aria-pressed="${selected}">
      ${photo?`<span class="facility-thumbnail"><img src="../assets/osong/${photo.file}" alt="${photo.alt}" class="${photo.small?'small-original':''}" loading="lazy" decoding="async"><span class="photo-fallback" hidden>사진 준비 중</span></span>`:`<span class="direct-icon">${icons.train}</span>`}
      <span class="facility-label"><strong>${f.name}</strong><small>${id==='none'?'':f.level+'층 · '}${estimate}</small></span><span class="selected-check" aria-hidden="true">✓</span></button>
      ${photo?`<button class="photo-expand" data-photo="${id}" aria-label="${f.name} 사진 크게 보기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/></svg></button>`:''}</article>`;
  }).join('');
}

const min = n => `${Math.ceil(n)}분`;
const announce = text => { document.querySelector('#announcements').textContent = text; };
const page = () => ['transfer', 'facilities'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'tickets';
const date = () => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());

function ticket({ next = false } = {}) {
  const s = schedule(state.delayed);
  return `<article class="ticket" aria-label="${next ? '다음' : '현재'} 열차 가상 승차권">
    <div class="ticket-band"><span>${date()} · 체험용</span><span>스마트티켓 1매</span></div>
    <div class="ticket-journey"><div><span>${next ? '환승역' : '출발역'}</span><h2>${next ? '오송' : '목포'}</h2><strong>${clock(next ? s.departure : s.start)}</strong></div>${arrow}<div><span>${next ? '도착역' : '하차역'}</span><h2>${next ? '부산' : '오송'}</h2><strong>${clock(next ? s.end : s.arrival)}</strong></div></div>
    <div class="train-line"><strong>${icons.train} 예시 KTX ${next ? '201' : '101'}</strong><span>일반실 · 순방향</span></div>
    <dl class="seat-grid"><div><dt>타는 곳</dt><dd>${next ? '7' : '3'}번<small>가상 승차홈</small></dd></div><div><dt>호차번호</dt><dd>${next ? '6' : '7'}호차</dd></div><div><dt>좌석번호</dt><dd>${next ? '3D' : '5A'}</dd></div><div><dt>승차권</dt><dd class="sample-stamp">SAMPLE<small>발권 불가</small></dd></div></dl>
    <div class="ticket-note"><span>성인 1명 · 예시 승차권</span><strong>목포 → 오송 → 부산</strong></div>
  </article>`;
}

function transferCard(detailed = false) {
  const s = schedule(state.delayed);
  return `<section class="transfer-card"><div class="transfer-card-heading"><span class="connection-icon">${icons.train}</span><div><span class="eyebrow">연결된 여정</span><h2>오송에서 갈아타요</h2></div><span class="pill">환승 1회</span></div>
    ${state.delayed ? '<p class="delay-note">첫 열차 10분 지연 예시 · 도착 예정시각이 바뀌었어요</p>' : ''}
    <div class="connection-times"><div><span>오송 도착 예정</span><strong>${clock(s.arrival)}</strong></div>${arrow}<div><span>다음 열차 출발</span><strong>${clock(s.departure)}</strong></div></div>
    <div class="gap-line"><span>환승 간격</span><strong>${s.gap}분</strong><span class="hint">이동·대기시간 별도</span></div>
    <div class="platform-line"><span>하차 <b>3번</b> ${arrow} 다음 승차홈 <b>7번</b></span><small>가상 예시</small></div>
    ${detailed ? '' : `<a class="primary" href="#transfer">환승 안내 보기 ${arrow}</a>`}</section>`;
}

function tickets() {
  return `<nav class="ticket-tabs" aria-label="티켓 종류">${[['tickets','승차권 (2)'],['vouchers','이용권'],['passes','정기권·패스']].map(([id,label]) => `<button data-tab="${id}" aria-current="${state.tab === id ? 'page' : 'false'}">${label}</button>`).join('')}</nav>
    ${state.tab !== 'tickets' ? '<section class="empty"><h2>등록된 티켓이 없어요</h2><p>이 시안에서는 승차권의 환승 안내를 체험할 수 있어요.</p><button class="primary" data-tab="tickets">승차권으로 돌아가기</button></section>' : `<div class="screen-content"><p class="section-label">나의 연결 승차권 <span>전체 가상 예시</span></p>${ticket()}${transferCard()}<section class="next-ticket-expanded" aria-label="다음 열차 승차권"><h2 class="section-label">다음 열차 승차권 <span>오송 → 부산 · 14:25</span></h2>${ticket({next:true})}</section>
    <section class="services"><h2>이런 서비스는 어떠세요?</h2><div><a href="#transfer">${icons.train}<span>환승 안내</span></a><a href="#facilities" data-alight>${icons.toilet}<span>시설 경유</span></a><button data-help>ⓘ<span>이용 안내</span></button></div></section>
    <div class="ticket-actions" aria-label="발권 기능은 제공하지 않는 시안입니다"><button disabled>전달하기</button><button disabled>반환하기</button><button disabled>여행변경</button></div><p class="fine-print">전달·반환·여행변경은 실제 코레일 앱에서 이용해 주세요.</p></div>`}`;
}

function trainBar(name, start, end, fraction) {
  return `<div class="train-stage"><div class="train-stage-title"><strong>${name}</strong><span>${fraction === 1 ? '구간 도착' : fraction === 0 ? '출발 전' : '시간표 기준 이동 중'}</span></div><div class="rail-labels"><span>${start}</span><span>${end}</span></div><div class="rail" role="img" aria-label="${name} 구간 진행 ${Math.round(fraction*100)}퍼센트"><div style="width:${fraction*100}%"></div><img src="../assets/train.svg" alt="" style="left:${fraction*100}%" width="62" height="24"></div></div>`;
}

function settings() {
  const s = schedule(state.delayed);
  return `<details class="experience"><summary>체험 설정 <span>실시간 운행과 무관해요</span></summary><fieldset><legend>운행 상황</legend><div class="segmented"><button data-delay="normal" aria-pressed="${!state.delayed}">시간표대로</button><button data-delay="late" aria-pressed="${state.delayed}">10분 지연 예시</button></div></fieldset><label for="time">여정 미리보기 <strong>${clock(state.at)}</strong></label><input id="time" type="range" min="${s.start}" max="${s.end}" step="1" value="${state.at}" aria-valuetext="${clock(state.at)}"><p>도착 예정시각과 진행은 체험용 설정이에요.</p></details>`;
}

function transfer() {
  const s = schedule(state.delayed), p = trainPosition(state.at, state.delayed);
  const remaining = state.at < s.arrival ? s.gap : s.departure-state.at;
  return `<div class="screen-content"><div class="journey-heading"><span class="eyebrow">목포 → 오송 → 부산</span><h2>환승도 한눈에, 편안하게.</h2><p>${p.label} <span class="pill">${clock(state.at)} · 미리보기</span></p></div>${transferCard(true)}
    <section class="card"><h2 class="card-title">지금 열차, 다음 열차</h2>${trainBar('예시 KTX 101', '목포 12:00', `오송 ${clock(s.arrival)}`, p.first)}<div class="transfer-divider">오송에서 환승 · ${s.gap}분 간격</div>${trainBar('예시 KTX 201', '오송 14:25', '부산 16:20', p.second)}<p class="fine-print">정차시각 비율에 따른 예시예요. 실제 위치·탑승 확인 정보가 아니에요.</p></section>
    <section class="card movement"><h2 class="card-title">내린 뒤 어디로 가나요?</h2><div class="platform-steps"><div><small>내리는 곳</small><strong>3번</strong><span>승차홈</span></div>${arrow}<div><small>다음 열차</small><strong>7번</strong><span>승차홈</span></div></div><p>승차홈과 경로는 가상 예시예요. 시설에 들르는 경로와 예상시간을 비교해볼 수 있어요.</p><a class="primary" href="#facilities" data-alight>하차 후 시설 경유 확인 ${arrow}</a>${remaining <= 0 ? '<p class="delay-note">다음 열차 출발시각이 지났어요. 체험 시각을 다시 선택해 주세요.</p>' : ''}</section>${settings()}</div>`;
}

let playbackTimer;
function stopPlayback() { clearTimeout(playbackTimer); state.playing=false; }
function previewSteps() {
  return routePlan({...state}).steps.map((step,i,steps)=>({...step, floor:i===steps.length-1?'4':i===(state.location==='platform'?1:0)&&state.location!=='facility'&&state.facility!=='none'?facilityFloor(state.facility):'3'}));
}
function showStep(index) {
  const steps=previewSteps();
  state.step=Math.max(0,Math.min(index,steps.length-1));
  state.floor=steps[state.step].floor;
  const focused=document.activeElement?.closest('[data-play],[data-next],[data-step]');
  const focusKey=focused?.hasAttribute('data-play')?'[data-play]':focused?.hasAttribute('data-next')?'[data-next]':focused?.hasAttribute('data-step')?`[data-step="${focused.dataset.step}"]`:null;
  render();
  if(focusKey)main.querySelector(focusKey)?.focus({preventScroll:true});
  announce(`경로 ${state.step+1}단계. ${steps[state.step].label}. 압축 재생이며 실제 이동 시간이 아니에요.`);
}
function playNext() {
  playbackTimer=setTimeout(()=>{
    if(page()!=='facilities') { stopPlayback(); return; }
    if(state.step>=previewSteps().length-1) { stopPlayback(); render(); main.querySelector('[data-play]')?.focus({preventScroll:true}); announce('경로 미리보기를 마쳤어요. 실제 이동 위치는 바뀌지 않아요.'); return; }
    showStep(state.step+1); playNext();
  },2200);
}

function facilityScreen() {
  const s = schedule(state.delayed), available = s.departure - state.at;
  const plan = routePlan({...state, available});
  return `<div class="screen-content"><div class="journey-heading"><span class="eyebrow">오송역 · 하차 후</span><h2>어디에 들르실 건가요?</h2><p>시설을 거쳐 다음 승차홈까지, 함께 확인해요.</p></div>
    <div class="countdown"><span>다음 열차 ${clock(s.departure)} 출발</span><strong>${available < 0 ? '출발시각 지남' : `${available}분 남음`}</strong></div>
    ${state.delayed ? `<aside class="delay-explanation" role="note"><strong>첫 열차 지연으로 환승 시간이 줄었어요</strong><p>오송 도착이 14:10에서 14:20으로 10분 늦어져, 환승 간격이 <b>15분 → 5분</b>으로 줄었어요. 다음 열차는 14:25에 출발해요.</p>${available > 0 && plan.walking >= available && state.facility !== 'none' && state.location !== 'facility' ? `<p><b>${facilities[state.facility].name} 경유 도보만 약 ${min(plan.walking)}</b></p><button class="secondary" data-direct-route>바로 환승 경로 보기</button>` : ''}<small>10분 지연을 가정한 시연 상황이에요.</small></aside>` : ''}
    <section class="card facility-picker"><h2 class="card-title">방문할 시설</h2><p class="fine-print">${state.location==='facility'?'시설을 바꾸면 출발 위치도 바뀌어요.':'현재 위치 기준 · 바로 환승할 때와 도보 시간을 비교해요.'}</p><div class="facility-options">${facilityChoices()}</div><label for="location">현재 위치</label><select id="location"><option value="platform" ${state.location === 'platform' ? 'selected' : ''}>3번 승차홈 · 하차 지점</option><option value="hall" ${state.location === 'hall' ? 'selected' : ''}>3층 대합실</option>${state.facility !== 'none' ? `<option value="facility" ${state.location === 'facility' ? 'selected' : ''}>선택한 시설 앞</option>` : ''}</select><p class="fine-print">현재 위치는 직접 선택하는 예시예요. GPS로 추적하지 않아요.</p></section>
    <section class="card walking-summary"><h2 class="card-title">도보 이동 예상시간</h2>
    <p class="walking-route">${state.facility==='none'?'현재 위치에서 7번 승차홈까지':`${state.location==='facility'?'':'현재 위치에서 '}${facilities[state.facility].name}${state.location==='facility'?' 앞에서':' 경유 후'} 7번 승차홈까지`}</p>
    <div class="walking-total"><span>도보 이동 · 층간 이동 포함</span><strong>약 ${min(plan.walking)}</strong></div>
    <p class="fine-print">시설 이용·대기시간은 포함하지 않아요.</p><p class="fine-print">보통 걸음 기준의 예시 추정값이에요. 실제 이동 상황에 따라 달라질 수 있어요.</p></section>
    <section class="card map-card">${guideScreen({...state})}
    <div class="route-controls"><button class="primary" data-play>${state.playing?'일시정지':state.step===plan.steps.length-1?'처음부터 경로 보기':'경로 재생'}</button><button class="secondary" data-next>다음 단계 →</button></div>
    <p class="fine-print">단계별 압축 미리보기 · 실제 보행·위치 추적과 무관해요. 도보 경로를 순서대로 보여줘요.</p>
    <ol class="route-steps">${plan.steps.map((step,i)=>`<li class="${state.step===i?'active':''}"><button data-step="${i}" ${state.step===i?'aria-current="step"':''}><span>${step.label}</span><small>예시 ${step.distance}m${step.vertical ? ' · 층간 이동 포함' : ''}</small></button></li>`).join('')}</ol></section>
${settings()}<a class="secondary" href="#tickets">승차권으로 돌아가기</a></div>`;
}

function render(focus = false) {
  const current = page();
  document.querySelector('#title').textContent = {tickets:'나의 티켓',transfer:'환승 안내',facilities:'시설 경유 안내'}[current];
  document.querySelector('#back').hidden = current === 'tickets';
  main.innerHTML = current === 'tickets' ? tickets() : current === 'transfer' ? transfer() : facilityScreen();
  if (focus) { main.focus(); window.scrollTo({top:0,behavior:'instant'}); }
}

document.querySelector('#help').addEventListener('click',()=>document.querySelector('#guide').showModal());
document.querySelector('#back').addEventListener('click',()=>{ location.hash = page() === 'facilities' ? 'transfer' : 'tickets'; });
main.addEventListener('click', event => {
  const photoButton=event.target.closest('[data-photo]');
  if(photoButton) {
    const id=photoButton.dataset.photo,photo=facilityPhotos[id],dialog=document.querySelector('#facility-photo-dialog');
    dialog.querySelector('h2').textContent=facilities[id].name;
    const img=dialog.querySelector('img'); img.src=`../assets/osong/${photo.file}`; img.alt=photo.alt;
    dialog.showModal();
    return;
  }
  const tab = event.target.closest('[data-tab]');
  if (tab) { state.tab=tab.dataset.tab; render(); main.querySelector(`[data-tab="${state.tab}"]`).focus(); }
  if (event.target.closest('[data-help]')) document.querySelector('#guide').showModal();
  if (event.target.closest('[data-alight]')) { state.alighted=true; state.at=schedule(state.delayed).arrival; }
  const floor = event.target.closest('[data-floor]');
  if(floor) { stopPlayback(); state.floor=floor.dataset.floor; render(); main.querySelector(`[data-floor="${state.floor}"]`).focus(); }
  const zoom = event.target.closest('[data-zoom]');
  if(zoom) { state.zoom=Math.max(1,Math.min(2,zoom.dataset.zoom==='reset'?1:state.zoom+(zoom.dataset.zoom==='in'?.25:-.25))); render(); main.querySelector(`[data-zoom="${zoom.dataset.zoom}"]:not(:disabled)`)?.focus(); }
  const step = event.target.closest('[data-step]');
  if(step) { stopPlayback(); showStep(Number(step.dataset.step)); main.querySelector(`[data-step="${state.step}"]`).focus(); }
  if(event.target.closest('[data-next]')) { stopPlayback(); showStep(state.step>=previewSteps().length-1?0:state.step+1); main.querySelector('[data-next]').focus(); }
  if(event.target.closest('[data-play]')) {
    if(state.playing) { stopPlayback(); render(); }
    else { state.playing=true; showStep(state.step<0||state.step>=previewSteps().length-1?0:state.step); playNext(); }
    main.querySelector('[data-play]').focus();
  }
  if (event.target.closest('[data-direct-route]')) { main.querySelector('.facility-select[data-facility="none"]').click(); return; }
  const facility = event.target.closest('[data-facility]');
  if (facility) { stopPlayback(); state.step=-1; state.floor=facilityFloor(facility.dataset.facility); state.facility=facility.dataset.facility; if(state.facility==='none' && state.location==='facility')state.location='hall'; render(); main.querySelector(`[data-facility="${state.facility}"]`).focus(); announce(`${facilities[state.facility].name} 경로와 도보 이동 예상시간을 갱신했어요.`); }
  const delay = event.target.closest('[data-delay]');
  if (delay) { stopPlayback(); state.step=-1; state.delayed=delay.dataset.delay==='late'; if(state.alighted)state.at=schedule(state.delayed).arrival; render(); const panel=main.querySelector('.experience'); panel.open=true; panel.querySelector(`[data-delay="${delay.dataset.delay}"]`).focus(); announce(`도착 예정 ${clock(schedule(state.delayed).arrival)}, 환승 간격 ${schedule(state.delayed).gap}분.`); }
});
main.addEventListener('error',event=>{ if(event.target.matches('.facility-thumbnail img')){event.target.hidden=true;event.target.nextElementSibling.hidden=false;} },true);
main.addEventListener('change', event => {
  stopPlayback(); state.step=-1;
  const {id,value}=event.target;
  if(id==='time')state.at=Number(value);
  else if(id==='location')state.location=value;
  else return;
  if(id==='location')state.floor=value==='platform'?'4':value==='facility'?facilityFloor(state.facility):'3';
  render();
  const input=main.querySelector(`#${id}`);
  if(id==='time')main.querySelector('.experience').open=true;
  input?.focus(); announce('선택한 위치로 경로와 도보 이동 예상시간을 갱신했어요.');
});
main.addEventListener('keydown',event=>{ if(event.target.matches('.guide-pin') && ['Enter',' '].includes(event.key)) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click',{bubbles:true})); } });
window.addEventListener('hashchange',()=>{ stopPlayback(); if(page()==='facilities' && !state.alighted){state.alighted=true;state.at=schedule(state.delayed).arrival;} render(true); });
if(page()==='facilities'){state.alighted=true;state.at=schedule(state.delayed).arrival;}
render();
