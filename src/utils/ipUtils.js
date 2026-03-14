import { STORES, validateGPS } from './gpsUtils'

// ─── 取得客戶端 IP（透過公開服務）────────────────────────────────────────────
export async function getClientIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    return data.ip
  } catch {
    // 降級：模擬本地 IP（開發/離線環境）
    return simulateLocalIP()
  }
}

// ─── 模擬本地 IP（開發模式）─────────────────────────────────────────────────
function simulateLocalIP() {
  // 在開發環境中，依照 localStorage 儲存的 mockStore 回傳對應 IP
  const mockStore = localStorage.getItem('tq_mock_store')
  if (mockStore) {
    const store = STORES[mockStore]
    if (store) return `${store.ipRange}100`
  }
  return '127.0.0.1'
}

// ─── IP 白名單驗證 ───────────────────────────────────────────────────────────
export async function validateIP(storeId) {
  const store = STORES[storeId]
  if (!store) return { valid: false, ip: null, reason: '找不到分店資料' }

  const ip = await getClientIP()
  const valid = ip.startsWith(store.ipRange) || ip === '127.0.0.1'

  return {
    valid,
    ip,
    reason: valid
      ? null
      : `IP ${ip} 不在 ${store.name} 白名單範圍 (${store.ipRange}0/24)`,
  }
}

// ─── 雙重驗證（GPS + IP）──────────────────────────────────────────────────
export async function dualVerify(storeId, { requireBoth = false } = {}) {
  const [gpsResult, ipResult] = await Promise.allSettled([
    validateGPS(storeId),
    validateIP(storeId),
  ])

  const gps = gpsResult.status === 'fulfilled' ? gpsResult.value : { valid: false, reason: 'GPS 驗證失敗' }
  const ip  = ipResult.status  === 'fulfilled' ? ipResult.value  : { valid: false, reason: 'IP 驗證失敗' }

  const valid = requireBoth ? gps.valid && ip.valid : gps.valid || ip.valid
  const method = gps.valid && ip.valid ? 'GPS+IP' : gps.valid ? 'GPS' : ip.valid ? 'IP' : 'FAILED'

  return { valid, method, gps, ip }
}
