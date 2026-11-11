import { createNetwork, demoState, demoProgress } from './routes.mjs';
import { osong, facilityGroups, filterFacilities } from './facilities.mjs';
import { photoMap, handleMapClick } from './photo-map.mjs';
import { clockTime, todayKST, findJourneys, journeyStatus } from './booking.mjs';
import { bookingScreen, selectedJourneyScreen, journeyLive } from './booking-ui.mjs?v=20261111-unslop';
import { bookingSnapshot, restoreBooking } from './booking-session.mjs';

const main = document.querySelector('#main');
const state = { delayed: false, movementKnown: false, network: null, loading: true, loadError: false,
  facilityGroup: 'all', facilityFloor: 'all' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const arrow = '<span aria-hidden="true">↗</span>';
const heading = (number, title, description) => `<div class="page-heading"><p class="eyebrow">${number} / 환승 안내</p><h1>${title}</h1><p>${description}</p></div>`;
const demoBadge = '<span class="badge badge-blue">가상 여정 체험</span>';
const booking = { origin: '목포', destination: '울산', date: todayKST(), after: '06:00', routes: null, error: '', visible: 8,
  selected: null, mode: 'live', speed: 1, simAt: null, running: false, delayed: false, activeDemo: false, excludeShort: false };
const journeyTime = () => booking.mode === 'live' ? Date.now() : booking.simAt;

function scenarioControls() {
  return `<section class="scenario-bar" aria-label="가상 운행 상황 선택"><div><span class="scenario-dot" aria-hidden="true"></span><strong>운행 상황 바꿔보기</strong><span class="scenario-help">선택하면 시간 정보가 바뀝니다</span></div><div class="segmented"><button data-action="normal" aria-pressed="${!state.delayed}">정상 운행</button><button data-action="delay" aria-pressed="${state.delayed}">10분 지연</button></div></section>`;
}

function timeComparison() {
  const { arrival, departure, gap } = demoState(state.delayed, state.movementKnown);
  return `<div class="time-comparison"><div><span class="small-label">오송 도착 예정</span><strong class="time ${state.delayed ? 'changed' : ''}">${arrival}</strong>${state.delayed ? '<span class="change-label">기존 14:10에서 10분 변경</span>' : '<span class="time-caption">현재 열차 · 가상열차 A</span>'}</div><span class="time-divider" aria-hidden="true">→</span><div><span class="small-label">다음 열차 출발</span><strong class="time">${departure}</strong><span class="time-caption">다음 열차 · 가상열차 B</span></div></div>
    <div class="gap-panel"><div><span>도착·출발 시각 차이</span><p>이동·대기시간이 포함된 여유시간은 아니에요.</p></div><strong>${gap}<small>분</small></strong></div>`;
}

function demoJourney() {
  const { arrival, gap, movement } = demoState(state.delayed, state.movementKnown);
  const progress = demoProgress(state.delayed);
  return `${heading('01', '내 환승, 한눈에', '다음 열차와 이동 조건을 한곳에서 확인하세요.')}
    <section class="card transfer-summary" aria-labelledby="summary-title"><div class="card-top"><h2 id="summary-title">오송역 환승 요약</h2>${demoBadge}</div>
      ${timeComparison()}
      <dl class="summary-facts"><div><dt>다음 열차</dt><dd>가상열차 B · 울산 방면</dd></div><div><dt>다음 승차홈</dt><dd>7번 <small>가상 예시</small></dd></div><div><dt>승차홈 간 이동</dt><dd>${movement === null ? '정보 없음 · 확인 필요' : '예시 약 4분 · 실제 시간 미확인'}</dd></div></dl>
      <div class="summary-notice ${state.delayed ? 'is-delayed' : ''}"><strong>${state.delayed ? '시각 차이가 10분 줄었어요 · 15분 → 5분' : '실제 환승 가능 여부는 추가 확인이 필요해요'}</strong><p>${state.delayed ? '다음 열차 출발은 14:25로 같아요. 승차홈과 이동 동선을 다시 확인하세요.' : '시각 차이 전체를 시설 방문시간으로 볼 수는 없어요. 실제 이동·대기시간은 미확인입니다.'}</p></div>
      <a class="button primary wide" href="#transfer">승차홈·이동정보 확인 ${arrow}</a>
    </section>
    ${scenarioControls()}
    <div class="journey-layout"><section class="card journey-card" aria-labelledby="journey-title"><div class="card-top"><span class="small-label">전체 여정</span><span class="muted small">편도 · 환승 1회</span></div>
      <div class="journey-title"><h2 id="journey-title">목포 <span aria-hidden="true">→</span> 오송 <span aria-hidden="true">→</span> 울산</h2><p>체험 시작: 예매를 마치고 첫 열차에 탑승한 상황이에요. 승차권은 가상 설정입니다.</p></div>
      <div class="journey-leg-label"><strong>현재 열차 · 가상열차 A</strong><span>목포 → 오송</span></div>
      <div class="rail-progress time-scaled" aria-label="가상 현재 시각 ${progress.now}, 가상열차 A는 공주와 오송 사이를 이동 중입니다."><div class="rail-track"></div><div class="rail-complete" style="width:calc((100% - 2 * var(--rail-inset)) * ${progress.percent / 100})"></div>${progress.stops.map((stop,i) => `<div class="rail-stop ${i < 3 ? 'done' : ''}" style="left:calc(var(--rail-inset) + (100% - 2 * var(--rail-inset)) * ${stop.percent / 100})"><span>${stop.time}</span><i></i><strong>${stop.station}</strong></div>`).join('')}<span class="moving-train" style="left:calc(var(--rail-inset) + (100% - 2 * var(--rail-inset)) * ${progress.percent / 100})" aria-hidden="true"><img class="train-icon" src="assets/train.svg" alt="" width="70" height="22"></span></div>
      <div class="current-position"><span class="pulse" aria-hidden="true"></span>공주 → 오송 이동 중 <span>가상 현재 ${progress.now}</span></div>
      <div class="journey-transfer"><span aria-hidden="true">↓</span><div><strong>오송에서 갈아타기</strong><p>도착 ${arrival} → 출발 14:25 · 시각 차이 ${gap}분</p></div><a href="#transfer" class="text-link">이동정보 확인 →</a></div>
      <div class="journey-leg-label next-leg-label"><strong>다음 열차 · 가상열차 B</strong><span>탑승 전</span></div>
      <div class="rail-progress time-scaled next-rail" role="img" aria-label="다음 열차 가상열차 B, 오송에서 14시 25분 출발하여 울산까지 가는 구간입니다. 탑승 전이며 울산 도착시각과 중간 정차역은 미설정입니다."><div class="rail-track"></div><div class="rail-stop" style="left:var(--rail-inset)"><span>14:25 출발</span><i></i><strong>오송</strong></div><div class="rail-stop" style="left:calc(100% - var(--rail-inset))"><span>도착시각 미설정</span><i></i><strong>울산</strong></div><span class="next-train-status">가상열차 B · 탑승 전</span></div>
      <p class="data-note">열차·현재 시각·진행상태·승차홈은 과제용 가상 설정입니다. 울산 도착시각은 설정하지 않았습니다.</p>
    </section>
    <aside class="journey-aside"><section class="card"><span class="small-label">오송역에서 필요한 곳</span><h2 class="aside-title">시설 위치와 사진도<br>함께 확인하세요</h2><p class="muted small">편의점·약국·수유방 등의 공식 안내를 모았어요. 방문에 필요한 왕복 이동·대기시간은 미확인입니다.</p><a class="button outline wide" href="#facilities">오송역 편의시설·사진 ${arrow}</a></section>
    <section class="explore-card"><span class="small-label">다른 구간 찾기</span><h2>다른 여정은<br>어떻게 연결될까요?</h2><p>실제 시간표의 전국 정차정보로 연결 후보를 찾아보세요.</p><a href="#search" class="button outline">여정 찾기 ${arrow}</a></section></aside></div>
    <p class="sr-only" role="status">${state.delayed ? '시각 차이가 10분 줄었습니다.' : '정상 상황입니다.'} 오송 도착 예정 ${arrival}, 다음 열차 출발 14:25, 시각 차이 ${gap}분. 이동시간 ${movement === null ? '정보 없음' : '예시 4분'}.</p>`;
}

function transfer() {
  if (booking.selected && !booking.activeDemo) {
    const route = booking.selected, status = journeyStatus(route, journeyTime(), booking.delayed);
    return `<a class="back-link" href="#journey">← 내 여정으로 돌아가기</a>${heading('02', route.transfer ? `${escape(route.transfer)}에서 갈아타요.` : '직통 여정이에요.', '선택한 열차의 정보와 확인해야 할 이동 조건입니다.')}<section class="card selected-transfer-detail"><span class="badge badge-blue">선택한 여정 · 시간표 기준</span>${route.transfer ? `<div class="scheduled-transfer"><div><span>첫 열차 시간표 시각</span><strong>${clockTime(status.legs[0].end)}</strong></div><span>→</span><div><span>다음 열차 시간표 시각</span><strong>${clockTime(status.legs[1].start)}</strong></div><div><span>환승 간격 (약)</span><strong>${Math.round(status.gap)}분</strong></div></div><p>${escape(route.legs[0].type)} ${escape(route.legs[0].train)} → ${escape(route.legs[1].type)} ${escape(route.legs[1].train)}</p><p class="${status.missed ? 'form-error' : 'muted small'}">${status.missed ? '다음 열차가 먼저 출발합니다. 연결을 다시 확인하세요.' : '시간표 정차시각의 차이이며 실제 환승 가능 여부는 미확인입니다.'}</p><dl class="summary-facts"><div><dt>승차홈 · 가상 예시</dt><dd>3번 → 7번</dd></div><div><dt>이동시간 · 가상 예시</dt><dd>약 4분</dd></div></dl><p class="muted small">아래 승차홈·이동시간·경로는 체험용 가상 설정입니다. 실제 역 구조나 선택한 열차의 승차홈을 확인한 정보는 아닙니다.</p><div class="platform-path" aria-label="가상 환승 이동 경로"><div><span>01</span><strong>3번 승차홈</strong><small>첫 열차에서 내리기</small></div><span class="path-arrow" aria-hidden="true">↓</span><div><span>02</span><strong>환승 통로로 이동</strong><small>7번 승차홈 방향으로 이동하기</small></div><span class="path-arrow" aria-hidden="true">↓</span><div><span>03</span><strong>7번 승차홈</strong><small>다음 열차 번호 확인 후 탑승하기</small></div></div>` : '<p>선택한 열차로 도착역까지 이어집니다.</p>'}${route.transfer === '오송' ? '<a class="button outline wide" href="#facilities">오송역 편의시설·사진 →</a>' : ''}<a class="button primary wide" href="#journey">내 여정으로 돌아가기 →</a></section>`;
  }
  const { gap } = demoState(state.delayed);
  return `<a class="back-link" href="${booking.activeDemo ? '#demo' : '#journey'}">← 여정으로 돌아가기</a>${heading('02', '갈아타기 전 확인', '시간 차이와 이동에 필요한 정보를 나누어 살펴보세요.')}${scenarioControls()}
    <div class="detail-layout"><section class="card"><div class="card-top">${demoBadge}<span class="muted small">오송역 환승</span></div><h2 class="detail-title">3번 승차홈 <span aria-hidden="true">→</span> 7번 승차홈</h2><p class="muted small">승차홈 번호와 아래 이동 순서는 가상 예시입니다.</p>
    <div class="platform-path"><div><span>01</span><strong>3번 승차홈</strong><small>현재 열차에서 내리기</small></div><span class="path-arrow" aria-hidden="true">↓</span><div><span>02</span><strong>통로로 이동</strong><small>역 안내판에서 방향 확인</small></div><span class="path-arrow" aria-hidden="true">↓</span><div><span>03</span><strong>7번 승차홈</strong><small>다음 열차 정보 재확인</small></div></div>
    <div class="movement-heading"><h3>예상 이동시간</h3><span class="badge badge-neutral">체험 조건</span></div><div class="segmented movement-options"><button data-action="unknown" aria-pressed="${!state.movementKnown}">정보 없음</button><button data-action="known" aria-pressed="${state.movementKnown}">예시 4분 제공</button></div>
    <div class="movement-panel ${state.movementKnown ? 'known' : ''}"><span class="movement-symbol" aria-hidden="true">${state.movementKnown ? '↗' : '?'}</span><div><strong>${state.movementKnown ? '예상 이동시간 약 4분' : '이동시간 정보 없음'}</strong><p>${state.movementKnown ? '일반 보행을 가정한 가상 값입니다. 이동속도·동선·혼잡에 따라 달라질 수 있어요.' : '추가 확인이 필요해요. 역 안내판이나 역 직원에게 승차홈과 이동 동선을 확인해 보세요.'}</p></div></div>
    <a class="button outline wide facility-entry" href="#facilities">오송역 편의시설·사진 보기 ${arrow}</a><a class="button primary wide" href="${booking.activeDemo ? '#demo' : '#journey'}">여정으로 돌아가기 ${arrow}</a></section>
    <aside><section class="card compact-time"><h2>현재 시간 조건</h2>${timeComparison()}</section><section class="card facility-card"><span class="small-label">시설 이용 전 확인</span><h2>화장실·편의점에<br>들르고 싶다면?</h2><p>시각 차이 ${gap}분 외에도 다음 정보가 필요해요.</p><ul class="checklist"><li>다음 승차홈까지 이동시간</li><li>시설의 위치와 왕복 이동시간</li><li>예상 대기시간과 이용시간</li></ul><p class="facility-note">일부 시설의 위치·사진을 확인할 수 있어요. 왕복 이동·대기시간은 미확인입니다.</p></section></aside></div><p class="sr-only" role="status">${state.movementKnown ? '이동시간 예시 4분이 제공됩니다. 실제 이동시간은 다를 수 있습니다.' : '이동시간 정보 없음. 추가 확인이 필요합니다.'}</p>`;
}

function facilityCard(item) {
  return `<article class="card station-facility ${item.location ? '' : 'location-unknown'}"><div class="facility-top"><span class="facility-icon" aria-hidden="true">${escape(item.icon)}</span><span class="badge ${item.location ? 'badge-blue' : 'badge-neutral'}">${item.location ? '공식 위치 안내' : '역 안내도 참고'}</span></div><h2>${escape(item.name)}</h2><p class="facility-location">${item.location ? escape(item.location) : '위 역 안내도에서 카카오맵의 층별 표시 지점을 확인하세요.'}</p><details class="facility-detail"><summary>운영시간·이용정보</summary><dl class="facility-facts"><div><dt>운영시간</dt><dd>${item.hours ? escape(item.hours) : '자료 미제공 · 현재 영업 여부 미확인'}</dd></div><div><dt>왕복 이동·대기</dt><dd>소요시간 미확인</dd></div></dl>${item.note ? `<p class="facility-extra">${escape(item.note)}</p>` : ''}${!item.location ? '<p class="facility-extra">코레일 확보 자료에는 구체적인 위치가 없습니다. 위 역 안내도는 별도로 확인한 카카오맵 표시를 사용합니다.</p>' : ''}</details><div class="facility-actions">${item.photoUrl ? `<button class="button outline" data-photo="${escape(item.id)}">시설 사진 보기 <span aria-hidden="true">↗</span></button>` : `<button class="button outline" data-open-map="${item.id}">역 안내도에서 위치 보기</button>`}<a class="text-link" href="${escape(osong.sourceUrl)}" target="_blank" rel="noopener noreferrer">코레일 안내 ↗</a></div>${item.additionalSource ? `<a class="text-link additional-source" href="${escape(item.additionalSource)}" target="_blank" rel="noopener noreferrer">열린쉼터 운영기관 안내 ↗</a>` : ''}<p class="facility-checked">자료 확인 ${osong.checkedAt}${item.updatedAt ? ` · 원문 수정 ${item.updatedAt}` : ''}</p></article>`;
}

function facilities() {
  const items = filterFacilities(state.facilityGroup, state.facilityFloor);
  const selectedAtOsong = booking.selected?.transfer === '오송' && !booking.activeDemo;
  const gap = selectedAtOsong ? Math.round(journeyStatus(booking.selected, journeyTime(), booking.delayed).gap) : booking.selected && !booking.activeDemo ? null : demoState(state.delayed).gap;
  return `<a class="back-link" href="#transfer">← 환승 상세로 돌아가기</a>${heading('04', '오송역에서 필요한 곳', '층별 안내도에서 필요한 시설을 찾아보세요.')}
    ${photoMap()}
    <section class="station-context"><div><span class="badge badge-blue">오송역 · 시설 안내</span><p>안내도 위치 참고 2026-11-03 · 공식 자료 ${osong.checkedAt} · 현장 운영상태는 다를 수 있어요.</p></div><div class="context-time"><span>${selectedAtOsong ? '선택한 여정의 시각 차이 (약)' : '고정 예시의 시각 차이'}</span><strong>${gap === null ? '—' : gap}<small>${gap === null ? '다른 역 여정' : '분'}</small></strong><a href="#transfer">시간 조건 확인 →</a></div></section>
    <div class="inline-info facility-intro"><span aria-hidden="true">ⓘ</span><p>역 안내도는 카카오맵을 참고해 직접 그린 개략도, 아래 시설 자료는 코레일 안내를 바탕으로 했어요. 승차홈에서의 실제 경로·왕복 이동시간·대기시간은 확인되지 않아 방문 가능 여부는 판단하지 않아요.</p></div>
    <section class="facility-controls" aria-label="편의시설 필터"><div class="facility-tabs" aria-label="시설 종류">${facilityGroups.map(group => `<button data-facility-group="${group.id}" aria-pressed="${state.facilityGroup === group.id}">${group.label}</button>`).join('')}</div><div class="floor-field"><label for="facility-floor">층</label><select id="facility-floor" name="facility-floor"><option value="all" ${state.facilityFloor === 'all' ? 'selected' : ''}>모든 층</option><option value="2" ${state.facilityFloor === '2' ? 'selected' : ''}>2층</option><option value="3" ${state.facilityFloor === '3' ? 'selected' : ''}>3층</option></select></div></section>
    <div class="facility-results-header"><h2>코레일 시설 자료 <span>${items.length}</span></h2><span>사진은 선택할 때 원본을 불러와요.</span></div><div class="facility-grid">${items.length ? items.map(facilityCard).join('') : '<div class="card facility-no-results"><h2>이 조건으로 확인된 자료가 없어요.</h2><p>시설이 없다는 뜻은 아닙니다. 다른 종류나 모든 층을 선택해 보세요.</p></div>'}</div>
    <details class="source-info"><summary>시설 자료의 출처와 확인 범위</summary><div><p>코레일 오송역 ‘층별 시설안내’를 ${osong.checkedAt}에 확인했습니다. 현장 조사나 실시간 영업·시설 가동 확인을 한 것은 아닙니다. 코레일 확보 자료에는 화장실·엘리베이터의 구체적 위치가 없습니다. 역 안내도에는 2026-11-03 카카오맵 앱에서 별도로 확인한 층별 표시 지점을 선별했습니다. 시설의 실제 가동·출입 가능 여부는 미확인입니다.</p><p>열린쉼터의 위치·운영시간·이용 제한은 충북대학교 운영기관 안내를 함께 대조했습니다. 개찰구 안팎, 실제 승차홈과 시설 사이 이동 동선은 확인되지 않았습니다.</p><p>사진은 코레일 공식 서버의 원본 링크로 제공하며 촬영일은 확인되지 않았습니다. 시설 확인용 사진이며 연속된 환승 경로 사진이나 로드뷰는 아닙니다. 현재 모습과 다를 수 있고 외부 연결에 따라 열리지 않을 수 있습니다.</p><a href="${osong.sourceUrl}" target="_blank" rel="noopener noreferrer">코레일 오송역 공식 안내 ↗</a><a href="https://fund.chungbuk.ac.kr/www/contents.do?key=1176" target="_blank" rel="noopener noreferrer">충북대학교 열린쉼터 공식 안내 ↗</a><a href="https://map.kakao.com/link/map/9265313" target="_blank" rel="noopener noreferrer">카카오맵에서 오송역 보기 ↗</a></div></details>
    <dialog id="facility-photo" aria-labelledby="photo-title"><form method="dialog"><button class="photo-close" aria-label="사진 닫기" autofocus>×</button></form><div id="photo-content"></div></dialog>`;
}

function sourceInfo() {
  return `<details class="source-info"><summary>데이터 출처와 연결 후보의 범위</summary><div><p>KTX·일반열차: 2026.11.01 시행 시간표 / ITX-청춘: 2026.09.01 평일·휴일 시간표. 최신 확인일: 2026.11.03.</p><p>원본 시트별 정차구간을 사용합니다. 서로 다른 시트에 나뉜 동일 열차의 구간을 합치지 않아 일부 직통 연결은 누락될 수 있습니다. 시간·운행일·좌석·환승승차권 발권 가능 여부는 검증하지 않습니다. 선택한 날짜의 명확한 운행 요일을 대조하고 시간표 시각순으로 최대 120개를 표시합니다. 공휴일·임시 운행은 미확인입니다.</p><p>전철·관광열차, 역이 다른 환승 연결은 제외합니다. 천안아산↔아산은 별도 역간 연결이며 이 탐색에서는 합치지 않습니다.</p><p>발권 시간 기준은 역·열차·적용일에 따라 다르며 실제 보행시간과도 다릅니다. 모든 역에 일괄 15분을 적용하지 않습니다.</p><a href="https://www.korail.com/ticket/reserve/train-timeTable" target="_blank" rel="noopener noreferrer">코레일 공식 시간표 ↗</a> · <a href="https://www.korail.com/ticket/guest/notice/26341" target="_blank" rel="noopener noreferrer">환승승차권 시간 조정 안내 ↗</a></div></details>`;
}

function render({ focus = false } = {}) {
  const clockOpen = !focus && document.querySelector('#clock-settings')?.open;
  const hash = location.hash.slice(1) || 'search';
  const rawView = hash.split('/')[0];
  const view = ['booking', 'review', 'candidate'].includes(rawView) ? 'search' : rawView;
  if (view === 'demo') booking.activeDemo = true;
  if (view === 'journey') booking.activeDemo = false;
  main.innerHTML = view === 'search' ? bookingScreen(booking, state.network, state.loading, state.loadError) + sourceInfo() : view === 'transfer' ? transfer() : view === 'facilities' ? facilities() : view === 'demo' ? demoJourney() : selectedJourneyScreen(booking, journeyTime());
  if (clockOpen && document.querySelector('#clock-settings')) document.querySelector('#clock-settings').open = true;
  main.querySelectorAll('.scheduled-leg.is-current .scheduled-rail-viewport').forEach(viewport => {
    viewport.scrollLeft = viewport.querySelector('.scheduled-train').offsetLeft - viewport.clientWidth / 2;
  });
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === (view === 'search' ? 'search' : 'journey');
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.title = `${view === 'search' ? '여정 찾기' : view === 'transfer' ? '환승 상세' : view === 'facilities' ? '오송역 편의시설' : '내 여정'} · 이음`;
  if (focus) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
  if (state.network && !state.loading && !state.loadError) {
    try { sessionStorage.setItem('ieum-booking', bookingSnapshot(booking)); } catch { /* 저장이 제한된 환경에서도 조회는 계속합니다. */ }
  }
}

function runSearch() {
  if (!state.network) return;
  const result = findJourneys(state.network, booking);
  booking.error = result.error; booking.routes = result.error ? null : result.routes; booking.visible = 8;
  render();
  const count = result.routes.filter(route => !booking.excludeShort || !route.transfer || route.gap >= 10).length;
  document.querySelector('#announcements').textContent = result.error || `열차편 ${count}개를 표시합니다. 실제 발권과 승차일 운행은 별도 확인이 필요합니다.`;
  if (result.error) document.querySelector('#book-destination').focus();
  else document.querySelector('#booking-results')?.scrollIntoView({block:'start'});
}

main.addEventListener('change', event => {
  if (event.target.id === 'exclude-short') {
    booking.excludeShort = event.target.checked; booking.visible = 8;
    render(); document.querySelector('#exclude-short').focus();
    document.querySelector('#announcements').textContent = booking.excludeShort ? '시각 차이 10분 미만인 환승 후보를 제외했습니다.' : '짧은 간격의 환승 후보도 표시합니다.';
    return;
  }
  if (event.target.id === 'clock-mode') {
    booking.mode = event.target.value === 'simulation' ? 'simulation' : 'live';
    booking.running = false;
    if (booking.mode === 'simulation' && booking.simAt === null) booking.simAt = booking.selected.start;
    render(); document.querySelector('#clock-mode').focus(); return;
  }
  if (event.target.id === 'clock-rate') {
    booking.speed = event.target.value === '60' ? 60 : 1;
    render(); document.querySelector('#clock-rate').focus(); return;
  }
  const field = event.target.dataset.bookField;
  if (['origin', 'destination', 'date', 'after'].includes(field)) {
    booking[field] = event.target.value; booking.routes = null; booking.error = '';
    const id = event.target.id; render(); document.getElementById(id)?.focus(); return;
  }
  if (event.target.name === 'facility-floor') {
    state.facilityFloor = event.target.value;
    render();
    document.querySelector('#facility-floor').focus();
    document.querySelector('#announcements').textContent = `시설 안내 ${filterFacilities(state.facilityGroup, state.facilityFloor).length}개`;
    return;
  }

});
main.addEventListener('submit', event => {
  if (event.target.id === 'booking-form') { event.preventDefault(); runSearch(); }
});
main.addEventListener('click', event => {
  if (handleMapClick(event)) return;
  const confirm = event.target.closest('[data-book-confirm]');
  if (confirm) { const route = booking.routes?.[Number(confirm.dataset.bookConfirm)]; if (route) startJourney(route); return; }
  const actionButton = event.target.closest('[data-book-action], [data-book-delay]');
  if (actionButton) {
    const { bookAction, bookDelay } = actionButton.dataset;
    if (bookAction === 'swap') { [booking.origin, booking.destination] = [booking.destination, booking.origin]; booking.routes = null; }
    if (bookAction === 'more') booking.visible += 8;
    if (bookAction === 'play' && booking.selected) {
      if (booking.mode === 'live' || booking.simAt >= booking.selected.end + 10 * 60000) booking.simAt = booking.selected.start;
      booking.mode = 'simulation'; booking.running = !booking.running;
      lastTick = Date.now();
    }
    if (bookDelay) booking.delayed = bookDelay === 'delay';
    render();
    const selector = bookAction ? `[data-book-action="${bookAction}"]` : `[data-book-delay="${bookDelay}"]`;
    document.querySelector(selector)?.focus({ preventScroll: true }); return;
  }
  const groupButton = event.target.closest('[data-facility-group]');
  if (groupButton) {
    state.facilityGroup = groupButton.dataset.facilityGroup;
    render();
    document.querySelector(`[data-facility-group="${state.facilityGroup}"]`).focus({ preventScroll: true });
    document.querySelector('#announcements').textContent = `시설 안내 ${filterFacilities(state.facilityGroup, state.facilityFloor).length}개`;
    return;
  }
  const photoButton = event.target.closest('[data-photo]');
  if (photoButton) {
    const item = osong.facilities.find(f => f.id === photoButton.dataset.photo);
    if (!item?.photoUrl) return;
    document.querySelector('#photo-content').innerHTML = `<p class="eyebrow">오송역 · 공식 시설 사진</p><h2 id="photo-title">${escape(item.name)}</h2><p class="photo-location">${escape(item.location)}</p><div class="facility-photo-image"><img src="${escape(item.photoUrl)}" alt="코레일 오송역 공식 안내에 수록된 ${escape(item.name)} 시설 사진" referrerpolicy="no-referrer"><p class="photo-fallback" hidden>사진을 불러오지 못했어요. 아래 원본 링크에서 확인해 주세요.</p></div><p class="photo-caption">출처: 코레일 오송역 층별 시설안내 · 촬영일 미제공<br>시설 확인용 사진이며 승차홈부터의 연속 이동경로 사진은 아닙니다. 일부 원본은 저해상도입니다.</p><a class="text-link" href="${escape(item.photoUrl)}" target="_blank" rel="noopener noreferrer">공식 사진 원본 열기 ↗</a>`;
    document.querySelector('#facility-photo').showModal();
    return;
  }
  const preset = event.target.closest('[data-preset]');
  if (preset && !preset.disabled) {
    [booking.origin, booking.destination] = preset.dataset.preset.split('|');
    runSearch();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'retry') { loadData(); return; }
  if (action === 'normal' || action === 'delay') state.delayed = action === 'delay';
  if (action === 'unknown' || action === 'known') state.movementKnown = action === 'known';
  render();
  const demo = demoState(state.delayed, state.movementKnown);
  if (['normal', 'delay', 'unknown', 'known'].includes(action)) {
    document.querySelector('#announcements').textContent = `${state.delayed ? '시각 차이가 10분 줄었습니다. ' : ''}오송 도착 예정 ${demo.arrival}, 다음 열차 출발 ${demo.departure}, 시각 차이 ${demo.gap}분. ${demo.movement === null ? '이동시간 정보 없음. 추가 확인이 필요합니다.' : '이동시간 예시 4분이 제공됩니다. 실제 이동시간은 다를 수 있습니다.'}`;
  }
  document.querySelector(`[data-action="${action}"]`)?.focus({ preventScroll: true });
});
main.addEventListener('error', event => {
  if (event.target.matches('.facility-photo-image img')) {
    event.target.hidden = true;
    event.target.nextElementSibling.hidden = false;
  }
}, true);

async function loadData() {
  state.loading = true; state.loadError = false; render();
  try {
    const response = await fetch('./data/timetable.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.network = createNetwork(data);
    try {
      Object.assign(booking, restoreBooking(state.network, sessionStorage.getItem('ieum-booking')));
      if (booking.selected) booking.simAt = booking.selected.start;
    } catch { /* 저장을 사용할 수 없으면 새 여정으로 시작합니다. */ }
  } catch (error) {
    console.error('정차정보를 불러오지 못했습니다.', error);
    state.loadError = true;
  } finally {
    state.loading = false;
    render();
  }
}
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
});
window.addEventListener('hashchange', () => render({ focus: true }));
render();
loadData();

function startJourney(route) {
  booking.selected = route; booking.mode = 'live'; booking.running = false; booking.delayed = false; booking.activeDemo = false;
  booking.simAt = route.start;
  location.hash = '#journey';
  document.querySelector('#announcements').textContent = route.transfer ? `선택한 여정은 ${route.transfer}에서 환승이 필요합니다. 열차편 정보를 내 여정으로 가져왔습니다.` : '선택한 직통 여정의 열차편 정보를 가져왔습니다.';
}
function updateJourneyClock(animate = true) {
  if (!booking.selected || location.hash !== '#journey') return;
  const at = journeyTime(), live = document.querySelector('#journey-live');
  if (!live) return;
  if (!animate) { live.classList.add('is-seeking'); void live.offsetWidth; }
  const template = document.createElement('template');
  template.innerHTML = journeyLive(booking.selected, at, booking.delayed);
  const next = template.content;
  for (const selector of ['.scheduled-summary h2', '.scheduled-summary > p', '.scheduled-transfer strong', '.scheduled-leg .badge', '.scheduled-position']) {
    const targets = [...live.querySelectorAll(selector)];
    next.querySelectorAll(selector).forEach((el, i) => { targets[i].textContent = el.textContent; targets[i].className = el.className; });
  }
  for (const selector of ['.scheduled-complete', '.scheduled-train']) {
    const targets = [...live.querySelectorAll(selector)];
    next.querySelectorAll(selector).forEach((el, i) => { targets[i].style.cssText = el.style.cssText; });
  }
  const rails = [...live.querySelectorAll('.scheduled-rail')];
  next.querySelectorAll('.scheduled-rail').forEach((el, i) => rails[i].setAttribute('aria-label', el.getAttribute('aria-label')));
  for (const selector of ['.scheduled-station', '.scheduled-leg']) {
    const targets = [...live.querySelectorAll(selector)];
    next.querySelectorAll(selector).forEach((el, i) => { targets[i].className = el.className; });
  }
  document.querySelector('#clock-label').textContent = `${booking.mode === 'live' ? '현재 시각' : '미리보기'} · ${new Date(at + 9 * 3600000).toISOString().slice(0, 10)} ${clockTime(at)}`;
  const slider = document.querySelector('#journey-clock');
  if (document.activeElement !== slider) slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), at));
  slider.setAttribute('aria-valuetext', clockTime(at));
  if (!animate) { void live.offsetWidth; live.classList.remove('is-seeking'); }
}
main.addEventListener('input', event => {
  if (event.target.id !== 'journey-clock' || !booking.selected) return;
  const at = Number(event.target.value);
  if (!Number.isFinite(at)) return;
  booking.simAt = Math.max(Number(event.target.min), Math.min(Number(event.target.max), at));
  booking.mode = 'simulation'; booking.running = false;
  lastTick = Date.now();
  updateJourneyClock(false);
  document.querySelector('[data-book-action="play"]').textContent = '이 시각부터 재생';
  document.querySelector('#clock-mode').value = 'simulation';
});
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now(), elapsed = Math.max(0, now - lastTick); lastTick = now;
  const wasRunning = booking.running;
  if (booking.mode === 'simulation' && booking.running && booking.selected) {
    booking.simAt = Math.min(booking.selected.end + 10 * 60000, booking.simAt + elapsed * booking.speed);
    if (booking.simAt >= booking.selected.end + 10 * 60000) booking.running = false;
  }
  if (booking.mode === 'live' || wasRunning) updateJourneyClock();
  if (wasRunning && !booking.running && location.hash === '#journey') document.querySelector('[data-book-action="play"]').textContent = '출발부터 다시 재생';
}, 1000);
