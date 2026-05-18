// sampleGpxData.ts — 유성구청 → 서울시청 GPX 샘플 (일반국도, 고속도로 미사용)
// buildGpxXml 과 동일한 포맷으로 생성

const BASE = new Date('2026-05-18T06:30:00.000Z').getTime()
const STEP = 180_000 // 3분 간격

// [위도, 경도] — 세종시 · 천안 · 평택 · 오산 · 수원 · 안양 · 영등포 경유
const RAW: [number, number][] = [
  [36.3622, 127.3563], // 유성구청
  [36.3780, 127.3480],
  [36.3960, 127.3360],
  [36.4120, 127.3200],
  [36.4280, 127.3080],
  [36.4480, 127.3000],
  [36.4800, 127.2890], // 세종시청
  [36.5100, 127.2900],
  [36.5400, 127.2880],
  [36.5700, 127.2910],
  [36.5990, 127.2970], // 조치원
  [36.6190, 127.2740],
  [36.6370, 127.2480],
  [36.6540, 127.2190],
  [36.6720, 127.1930],
  [36.6900, 127.1700],
  [36.7100, 127.1550],
  [36.7300, 127.1450],
  [36.7530, 127.1420],
  [36.7760, 127.1400],
  [36.8000, 127.1390], // 천안
  [36.8220, 127.1350],
  [36.8440, 127.1170],
  [36.8650, 127.0980],
  [36.8860, 127.0850],
  [36.9070, 127.0820], // 성환
  [36.9270, 127.0780],
  [36.9470, 127.0700],
  [36.9650, 127.0590],
  [36.9840, 127.0450],
  [37.0030, 127.0330], // 평택
  [37.0200, 127.0180],
  [37.0380, 127.0060],
  [37.0540, 126.9980],
  [37.0710, 127.0050],
  [37.0890, 127.0170],
  [37.1100, 127.0380],
  [37.1290, 127.0560],
  [37.1520, 127.0770], // 오산
  [37.1690, 127.0640],
  [37.1870, 127.0420],
  [37.2060, 127.0210],
  [37.2250, 126.9990],
  [37.2430, 126.9820],
  [37.2620, 126.9750],
  [37.2870, 126.9890], // 수원 북부
  [37.3050, 126.9870],
  [37.3230, 126.9780],
  [37.3420, 126.9680],
  [37.3620, 126.9590],
  [37.3840, 126.9550],
  [37.3940, 126.9530], // 안양
  [37.4010, 126.9390],
  [37.4190, 126.9210],
  [37.4400, 126.9070],
  [37.4560, 126.9010], // 금천
  [37.4720, 126.8970],
  [37.4900, 126.8960],
  [37.5090, 126.8960],
  [37.5265, 126.8960], // 영등포
  [37.5360, 126.9080],
  [37.5450, 126.9250],
  [37.5540, 126.9460],
  [37.5610, 126.9620],
  [37.5665, 126.9780], // 서울시청
]

export type GpxPoint = { lat: number; lng: number; timestamp: number }

export const YUSONG_SEOUL_POINTS: GpxPoint[] = RAW.map(([lat, lng], i) => ({
  lat, lng, timestamp: BASE + i * STEP,
}))

// GPX XML 문자열 → GpxPoint[] 파서
export function parseGpxPoints(xml: string): GpxPoint[] {
  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(xml, 'application/xml')
    const trkpts = Array.from(doc.querySelectorAll('trkpt'))
    return trkpts.map((el, i) => ({
      lat:       parseFloat(el.getAttribute('lat') ?? '0'),
      lng:       parseFloat(el.getAttribute('lon') ?? '0'),
      timestamp: new Date(el.querySelector('time')?.textContent ?? '').getTime() || i * 180_000,
    })).filter(p => !isNaN(p.lat) && !isNaN(p.lng))
  } catch {
    return []
  }
}

export const YUSONG_SEOUL_GPX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Moto-Log" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>유성구청 → 서울시청</name><trkseg>
${YUSONG_SEOUL_POINTS.map(p =>
  `    <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><time>${new Date(p.timestamp).toISOString()}</time></trkpt>`
).join('\n')}
  </trkseg></trk>
</gpx>`
