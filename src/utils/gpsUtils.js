// ─── 三間分店 GPS 圍欄設定 ─────────────────────────────────────────────────
export const STORES = {
  jingzhong: {
    id: 'jingzhong',
    name: '精忠店',
    lat: 24.14878,
    lng: 120.66413,
    radius: 200, // 公尺
    ipRange: '192.168.10.',
    color: '#16a34a',
    address: '台中市西區精忠街36號',
    startTime: '08:00',
    lateMinutes: 10,
  },
  beitun: {
    id: 'beitun',
    name: '北屯店',
    lat: 24.16832,
    lng: 120.68824,
    radius: 200,
    ipRange: '192.168.20.',
    color: '#0ea5e9',
    address: '台中市北屯區熱河路二段226號',
    startTime: '08:30',
    lateMinutes: 10,
  },
  nanqu: {
    id: 'nanqu',
    name: '南區店',
    lat: 24.12198,
    lng: 120.66384,
    radius: 200,
    ipRange: '192.168.30.',
    color: '#f59e0b',
    address: '台中市南區忠明南路576號',
    startTime: '09:00',
    lateMinutes: 10,
  },
}

export const STORE_LIST = Object.values(STORES)

// ─── Haversine 距離計算（公尺）──────────────────────────────────────────────
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── 取得目前 GPS ────────────────────────────────────────────────────────────
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('此裝置不支援 GPS 定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        const msgs = {
          1: '使用者拒絕 GPS 授權，請至瀏覽器設定允許定位',
          2: 'GPS 訊號取得失敗，請確認裝置定位功能已開啟',
          3: 'GPS 定位逾時，請稍後再試',
        }
        reject(new Error(msgs[err.code] || 'GPS 定位失敗'))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  })
}

// ─── GPS 圍欄驗證 ─────────────────────────────────────────────────────────
export async function validateGPS(storeId) {
  const store = STORES[storeId]
  if (!store) return { valid: false, reason: '找不到分店資料' }

  try {
    const pos = await getCurrentPosition()
    const dist = haversineDistance(pos.lat, pos.lng, store.lat, store.lng)
    const valid = dist <= store.radius
    return {
      valid,
      distance: Math.round(dist),
      accuracy: Math.round(pos.accuracy),
      coords: pos,
      reason: valid ? null : `距離 ${store.name} 約 ${Math.round(dist)} 公尺，超出 ${store.radius} 公尺圍欄`,
    }
  } catch (err) {
    return { valid: false, reason: err.message }
  }
}

// ─── 判斷最近分店 ────────────────────────────────────────────────────────────
export function getNearestStore(lat, lng) {
  let nearest = null
  let minDist = Infinity
  for (const store of STORE_LIST) {
    const d = haversineDistance(lat, lng, store.lat, store.lng)
    if (d < minDist) { minDist = d; nearest = store }
  }
  return { store: nearest, distance: Math.round(minDist) }
}
