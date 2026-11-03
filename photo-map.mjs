import { osong } from './facilities.mjs';
import { stationMap, mapCategories, mapPins, floorPins, pinPosition, clusterPins, stationSchematic } from './station-map.mjs';

const state = { floor: '2', category: 'all', selected: 'f2-pharmacy', zoom: 1 };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = category => ({ toilet: 'WC', elevator: '↕', shop: '▣', baby: '♡' }[category]);

function contents() {
  const pins = floorPins(state.floor, state.category);
  const groups = clusterPins(pins, state.zoom);
  const selected = pins.find(pin => pin.id === state.selected);
  const selectedGroup = selected && groups.find(group => group.pins.some(pin => pin.id === selected.id));
  const facility = selected?.facility && osong.facilities.find(item => item.id === selected.facility);
  const unplaced = osong.facilities.filter(item => item.floor === state.floor && !mapPins.some(pin => pin.facility === item.id));
  return `<div class="map-heading"><div><p class="eyebrow">OSONG · STATION GUIDE</p><h2 id="map-title">오송역만, 간단하게.</h2></div><span class="badge badge-neutral">직접 그린 개략도</span></div>
    <div class="map-floor-tabs" role="group" aria-label="지도 층 선택">${stationMap.floors.map(floor => `<button id="map-floor-${floor}" data-map-floor="${floor}" aria-pressed="${state.floor === floor}">${floor}층</button>`).join('')}</div>
    <div class="map-category-tabs" role="group" aria-label="지도 시설 종류">${mapCategories.map(category => `<button id="map-category-${category.id}" data-map-category="${category.id}" aria-pressed="${state.category === category.id}">${category.label}</button>`).join('')}</div>
    <div class="map-toolbar"><p><strong>${state.floor}층</strong> · 표시 지점 ${pins.length}개</p><div role="group" aria-label="지도 확대 조절"><button id="map-zoom-out" data-map-action="out" aria-label="지도 축소" ${state.zoom === 1 ? 'disabled' : ''}>−</button><span>${state.zoom}배</span><button id="map-zoom-in" data-map-action="in" aria-label="지도 확대" ${state.zoom === 3 ? 'disabled' : ''}>+</button><button id="map-zoom-reset" data-map-action="reset">원래 크기</button></div></div>
    <div class="photo-map-layout"><div><div class="photo-map-viewport" tabindex="0" role="region" aria-label="오송역 ${state.floor}층 시설 안내도. 확대 후 스크롤이나 방향키로 이동할 수 있습니다."><div class="photo-map-canvas" style="width:${state.zoom * 100}%">${stationSchematic(state.floor)}${groups.map(group => {
      const position = pinPosition(group);
      const active = group.pins.some(pin => pin.id === selected?.id);
      const label = group.pins.length > 1 ? `가까운 시설 ${group.pins.length}개: ${group.pins.map(pin => pin.name).join(', ')}` : group.pins[0].name;
      return `<button id="map-pin-${group.pins[0].id}" class="map-pin ${group.pins.length > 1 ? 'is-cluster' : ''}" data-map-pin="${group.pins[0].id}" style="left:${position.left}%;top:${position.top}%" aria-label="${state.floor}층 ${escape(label)}" aria-pressed="${active}"><span aria-hidden="true">${group.pins.length > 1 ? group.pins.length : icon(group.pins[0].category)}</span>${active ? `<small class="map-pin-label" style="${position.left > 70 ? 'left:auto;right:0;transform:none' : position.left < 30 ? 'left:0;transform:none' : ''}">${escape(selected.name)}</small>` : ''}</button>`;
    }).join('')}</div></div><p class="map-caption">핀은 선택한 층의 시설 표시 지점, 숫자는 가까운 시설 수예요. 역 주변 건물·버스·주차장과 원본 지도 표식은 생략했어요. 외곽은 층별 시설을 비교하기 위한 공통 개략도이며 실제 평면도·이동 경로가 아닙니다.</p></div>
    <aside class="map-selection" aria-labelledby="map-selection-title">${selected ? `<span class="badge badge-blue">${selected.floor}층 · ${escape(mapCategories.find(category => category.id === selected.category).label)}</span><h3 id="map-selection-title">${escape(selected.name)}</h3>${selectedGroup.pins.length > 1 ? `<p class="map-nearby-label">겹쳐 보이는 지점에서 선택</p><div class="map-nearby">${selectedGroup.pins.map(pin => `<button id="map-choice-${pin.id}" data-map-member="${pin.id}" aria-pressed="${pin.id === selected.id}">${escape(pin.name)}</button>`).join('')}</div>` : ''}<p>${selected.category === 'toilet' ? '화장실 아이콘이 모인 구역입니다. 개별 출입구·남녀 구분은 확인하지 않았어요.' : selected.category === 'elevator' ? '카카오맵의 엘리베이터 표시 지점입니다. 연결 층·개별 호기·현재 가동 여부는 미확인입니다.' : selected.category === 'baby' ? '카카오맵에서 유아시설로 표시한 지점입니다. 코레일 수유방과 동일한 시설인지 대조하지 않았어요.' : '선택한 층 지도에 표시된 매장 위치입니다. 현재 영업 여부는 확인하지 않았어요.'}</p>${facility?.photoUrl ? `<button class="button primary" data-photo="${facility.id}">시설 사진 보기 <span aria-hidden="true">↗</span></button>` : '<p class="map-no-photo">별도로 확인한 시설 사진 없음</p>'}<a class="text-link" href="assets/osong/${selected.evidence}" target="_blank" rel="noopener noreferrer">위치 확인에 사용한 캡처 ↗</a><p class="map-selection-note">사진에서 읽은 대략적인 위치예요. 실제 동선·이동시간·시설 이용 가능 여부는 미확인입니다.</p>` : `<span class="map-empty-icon" aria-hidden="true">⌖</span><h3 id="map-selection-title">${pins.length ? '핀을 눌러보세요.' : '이 조건으로 확인한 핀이 없어요.'}</h3><p>${pins.length ? '지도나 아래 목록에서 선택하면 시설 정보가 여기에 표시돼요.' : '해당 시설이 없다는 뜻은 아닙니다. 다른 종류나 층을 선택해 보세요.'}</p>`}</aside></div>
    <details class="map-point-list"><summary>이 층의 표시 지점 목록 (${pins.length}개)</summary><div>${pins.map(pin => `<button id="map-list-${pin.id}" data-map-member="${pin.id}" aria-pressed="${pin.id === selected?.id}"><span aria-hidden="true">${icon(pin.category)}</span>${escape(pin.name)}</button>`).join('') || '<p>현재 조건의 확인 자료가 없습니다.</p>'}</div></details>
    ${unplaced.length ? `<section class="map-unplaced" aria-label="층만 확인한 추가 시설"><h3>${state.floor}층 추가 시설 <span>세부 위치 미확인 · 지도 핀 미배치</span></h3><div>${unplaced.map(item => `<article><strong>${escape(item.name)}</strong><p>${escape(item.location)}</p><button class="text-link" data-photo="${item.id}">시설 사진 보기 ↗</button></article>`).join('')}</div></section>` : ''}
    <p class="map-source">Codex가 직접 그린 벡터 안내도 · 위치 참고: <a href="${stationMap.sourceUrl}" target="_blank" rel="noopener noreferrer">카카오맵 오송역 ↗</a> · ${stationMap.capturedAt} 확인<br>시설 핀은 캡처의 상대 위치를 대조했어요. 지점 번호는 구분용이며 공식 시설 번호가 아닙니다. 원본의 모든 시설을 담지는 않습니다.</p>`;
}

export function photoMap() {
  return `<section id="station-map" class="card station-photo-map" aria-labelledby="map-title">${contents()}</section>`;
}

export function handleMapClick(event) {
  const button = event.target.closest('[data-map-floor], [data-map-category], [data-map-action], [data-map-pin], [data-map-member], [data-open-map]');
  if (!button || button.disabled) return false;
  const root = document.querySelector('#station-map');
  if (!root) return false;
  const oldViewport = root.querySelector('.photo-map-viewport');
  const scroll = { left: oldViewport.scrollLeft, top: oldViewport.scrollTop };
  const listOpen = root.querySelector('.map-point-list').open;
  const { mapFloor, mapCategory, mapAction, mapPin, mapMember, openMap } = button.dataset;
  let focusId = button.id;
  let centerPin = null;
  let reset = false;
  if (mapFloor && stationMap.floors.includes(mapFloor)) { state.floor = mapFloor; state.selected = null; state.zoom = 1; reset = true; }
  if (mapCategory && mapCategories.some(category => category.id === mapCategory)) { state.category = mapCategory; state.selected = null; reset = true; }
  if (openMap && ['toilet', 'elevator'].includes(openMap)) {
    state.category = openMap;
    if (!floorPins(state.floor, openMap).length) state.floor = '2';
    state.selected = floorPins(state.floor, openMap)[0]?.id || null;
    state.zoom = 1; reset = true; focusId = `map-category-${openMap}`;
  }
  if (mapPin || mapMember) {
    const pin = floorPins(state.floor, state.category).find(item => item.id === (mapPin || mapMember));
    if (!pin) return false;
    state.selected = pin.id;
    if (mapMember) centerPin = pin;
  }
  if (mapAction) {
    state.zoom = mapAction === 'in' ? Math.min(3, state.zoom + 1) : mapAction === 'out' ? Math.max(1, state.zoom - 1) : mapAction === 'reset' ? 1 : state.zoom;
    centerPin = mapPins.find(pin => pin.id === state.selected);
    reset = !centerPin;
    if (mapAction === 'in' && state.zoom === 3 || mapAction === 'out' && state.zoom === 1) focusId = 'map-zoom-reset';
  }
  root.innerHTML = contents();
  root.querySelector('.map-point-list').open = listOpen;
  const viewport = root.querySelector('.photo-map-viewport');
  if (centerPin) {
    const position = pinPosition(centerPin);
    const canvas = root.querySelector('.photo-map-canvas');
    viewport.scrollTo({ left: canvas.offsetWidth * position.left / 100 - viewport.clientWidth / 2, top: canvas.offsetHeight * position.top / 100 - viewport.clientHeight / 2 });
  } else if (!reset) viewport.scrollTo(scroll);
  document.getElementById(focusId)?.focus({ preventScroll: true });
  const selected = mapPins.find(pin => pin.id === state.selected);
  document.querySelector('#announcements').textContent = `${state.floor}층, 표시 지점 ${floorPins(state.floor, state.category).length}개. ${selected ? `${selected.name} 선택. ` : ''}지도 ${state.zoom}배.`;
  if (openMap) root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  if ((mapPin || mapMember) && matchMedia('(max-width:900px)').matches) {
    root.querySelector('.map-selection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
  }
  return true;
}
