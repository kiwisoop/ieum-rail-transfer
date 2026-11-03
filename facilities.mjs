const official = 'https://www.korail.com/ticket/train/stationGuide/station/view?stationSeq=10280979';
const photo = name => `https://www.korail.com/file/cubedata/COMMON/floor/${name}`;

export const facilityGroups = [
  { id: 'all', label: '전체' },
  { id: 'access', label: '화장실·이동' },
  { id: 'food', label: '먹거리' },
  { id: 'amenity', label: '편의·휴식' },
];

export const osong = {
  name: '오송', checkedAt: '2026-10-30', sourceUrl: official,
  facilities: [
    { id: 'store', name: '스토리웨이 편의점', sourceId: 15073326, group: 'food', icon: '▣', floor: '2',
      location: '지상 2층 동편', photoUrl: photo('f20260826OVEi.jpg'), updatedAt: '2026-08-26' },
    { id: 'toilet', name: '화장실', group: 'access', icon: 'WC', floor: null, location: null, photoUrl: null },
    { id: 'elevator', name: '엘리베이터', group: 'access', icon: '↕', floor: null, location: null, photoUrl: null },
    { id: 'nursing', name: '수유방', sourceId: 15072842, group: 'amenity', icon: '♡', floor: '2',
      location: '지상 2층 동편', photoUrl: photo('osong_2.jpg'), updatedAt: '2026-07-27' },
    { id: 'lockers', name: '물품보관함', sourceId: 15033879, group: 'amenity', icon: '▤', floor: '2',
      location: '지상 2층 맞이방 내', photoUrl: photo('osong_1.jpg') },
    { id: 'pharmacy', name: '오송역약국', sourceId: 15073041, group: 'amenity', icon: '+', floor: '2',
      location: '지상 2층 동편', photoUrl: photo('osong_yak.jpg') },
    { id: 'dunkin', name: '던킨도넛', sourceId: 15073330, group: 'food', icon: '◉', floor: '3',
      location: '지상 3층 맞이방 내', photoUrl: photo('f202608261skP.jpg') },
    { id: 'shelter', name: '충북대학교 열린쉼터', sourceId: 15073331, group: 'amenity', icon: '⌂', floor: '3',
      location: '지상 3층 서편 대합실', photoUrl: photo('f20260826tDLO.jpg'),
      hours: '월~토 08:00~20:00 · 일요일·공휴일 휴무',
      note: '휴대폰 충전기 무료 이용 안내가 있습니다. 회의실 대관·내부 사정에 따라 이용이 제한되거나 시간이 바뀔 수 있습니다.',
      additionalSource: 'https://fund.chungbuk.ac.kr/www/contents.do?key=1176' },
  ],
};

export function filterFacilities(group = 'all', floor = 'all') {
  return osong.facilities.filter(item => (group === 'all' || item.group === group) && (floor === 'all' || item.floor === floor));
}
