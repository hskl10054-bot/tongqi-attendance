import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { validateGPS } from '../utils/gpsUtils'
import { validateIP }  from '../utils/ipUtils'
import { STORES, STORE_LIST } from '../utils/gpsUtils'
import { STATUS_LABELS } from '../utils/scheduleUtils'
import { format } from 'date-fns'
import { MapPin, Wifi, Clock, CheckCircle, XCircle, AlertCircle, LogIn, LogOut } from 'lucide-react'

export default function StaffPage() {
  const { employees, attendance, clockIn: doClockIn, clockOut: doClockOut, currentUser, login } = useApp()

  const [time, setTime]         = useState(new Date())
  const [selectedEmp, setSelectedEmp] = useState(currentUser?.id || '')
  const [selectedStore, setSelectedStore] = useState(currentUser?.storeId || 'jingzhong')
  const [verifying, setVerifying]   = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [clockResult,  setClockResult]  = useState(null)
  const [gpsStatus,    setGpsStatus]    = useState(null)
  const [ipStatus,     setIpStatus]     = useState(null)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const today     = format(new Date(), 'yyyy-MM-dd')
  const todayRecs = attendance.filter((r) => r.date === today)

  const empRecord = todayRecs.find((r) => r.employeeId === selectedEmp)
  const employee  = employees.find((e) => e.id === selectedEmp)
  const store     = STORES[selectedStore]

  // 雙重驗證
  const runVerify = async () => {
    setVerifying(true)
    setVerifyResult(null)
    setGpsStatus(null)
    setIpStatus(null)

    // GPS 驗證
    setGpsStatus('checking')
    const gps = await validateGPS(selectedStore)
    setGpsStatus(gps.valid ? 'ok' : 'fail')

    // IP 驗證
    setIpStatus('checking')
    const ip = await validateIP(selectedStore)
    setIpStatus(ip.valid ? 'ok' : 'fail')

    const passed = gps.valid || ip.valid
    setVerifyResult({ passed, gps, ip, method: gps.valid && ip.valid ? 'GPS+IP' : gps.valid ? 'GPS' : ip.valid ? 'IP' : 'FAILED' })
    setVerifying(false)
    return { passed, gps, ip }
  }

  const handleClockIn = async () => {
    if (!selectedEmp) { alert('請先選擇員工'); return }
    const { passed, gps, ip } = await runVerify()
    if (!passed) { setClockResult({ error: '位置驗證失敗，無法打卡' }); return }

    const extra = {
      method: gps.valid && ip.valid ? 'GPS+IP' : gps.valid ? 'GPS' : 'IP',
      ip:     ip.ip || '',
      lat:    gps.coords?.lat || null,
      lng:    gps.coords?.lng || null,
      gpsAccuracy: gps.accuracy || null,
    }
    const res = doClockIn(selectedEmp, selectedStore, extra)
    setClockResult(res)
  }

  const handleClockOut = async () => {
    if (!selectedEmp) { alert('請先選擇員工'); return }
    const { passed, gps, ip } = await runVerify()
    if (!passed) { setClockResult({ error: '位置驗證失敗，無法打卡' }); return }

    const extra = {
      method: gps.valid && ip.valid ? 'GPS+IP' : gps.valid ? 'GPS' : 'IP',
      ip: ip.ip || '',
      lat: gps.coords?.lat || null,
      lng: gps.coords?.lng || null,
    }
    const res = doClockOut(selectedEmp, extra)
    setClockResult(res)
  }

  const statusInfo = empRecord ? STATUS_LABELS[empRecord.status] || STATUS_LABELS.normal : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <nav className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">同齊咖吡</span>
          <span className="text-emerald-200 text-sm">智慧打卡系統</span>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold">{format(time, 'HH:mm:ss')}</div>
          <div className="text-emerald-200 text-xs">{format(time, 'yyyy/MM/dd EEEE', { locale: undefined })}</div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto p-4 space-y-4 pt-6">
        {/* 員工選擇 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
            選擇員工與分店
          </h2>
          <select
            value={selectedEmp}
            onChange={(e) => {
              setSelectedEmp(e.target.value)
              const emp = employees.find((em) => em.id === e.target.value)
              if (emp) setSelectedStore(emp.storeId)
              setVerifyResult(null); setClockResult(null)
            }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">-- 請選擇員工 --</option>
            {employees.filter((e) => e.active).map((e) => (
              <option key={e.id} value={e.id}>{e.name}（{STORES[e.storeId]?.name} · {e.role}）</option>
            ))}
          </select>
          <select
            value={selectedStore}
            onChange={(e) => { setSelectedStore(e.target.value); setVerifyResult(null); setClockResult(null) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {STORE_LIST.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.address}</option>
            ))}
          </select>
        </div>

        {/* 今日狀態 */}
        {employee && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-gray-700 mb-3">今日出勤狀態</h2>
            {empRecord ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">上班打卡</span>
                  <span className="font-mono font-bold text-gray-800">{empRecord.clockIn || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">下班打卡</span>
                  <span className="font-mono font-bold text-gray-800">{empRecord.clockOut || '尚未打卡'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">驗證方式</span>
                  <span className="font-bold text-emerald-600">{empRecord.method || '—'}</span>
                </div>
                {statusInfo && (
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.label}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">尚無今日打卡紀錄</p>
            )}
          </div>
        )}

        {/* 位置驗證 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
            位置驗證（GPS + IP）
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <VerifyBadge label="GPS 圍欄" icon={<MapPin size={14}/>} status={gpsStatus} />
            <VerifyBadge label="IP 白名單" icon={<Wifi size={14}/>} status={ipStatus} />
          </div>

          {verifyResult && (
            <div className={`p-3 rounded-xl text-sm ${verifyResult.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {verifyResult.passed
                ? `✅ 位置驗證通過（${verifyResult.method}）${verifyResult.gps.distance ? ` · 距門市 ${verifyResult.gps.distance}m` : ''}`
                : `❌ 驗證失敗：${verifyResult.gps.reason || verifyResult.ip.reason}`}
            </div>
          )}

          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
            <strong>開發提示：</strong>於 <code>localStorage</code> 設定 <code>tq_mock_store=jingzhong</code> 可模擬分店 IP 通過驗證
          </div>
        </div>

        {/* 打卡按鈕 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleClockIn}
            disabled={verifying || !!empRecord?.clockIn}
            className="flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-5 rounded-2xl font-bold shadow-lg transition"
          >
            <LogIn size={28} />
            <span className="text-lg">上班打卡</span>
            <span className="text-xs opacity-80">{store?.startTime} 上班</span>
          </button>
          <button
            onClick={handleClockOut}
            disabled={verifying || !empRecord?.clockIn || !!empRecord?.clockOut}
            className="flex flex-col items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 disabled:bg-gray-300 text-white py-5 rounded-2xl font-bold shadow-lg transition"
          >
            <LogOut size={28} />
            <span className="text-lg">下班打卡</span>
            <span className="text-xs opacity-80">記錄離場時間</span>
          </button>
        </div>

        {verifying && (
          <div className="bg-blue-50 text-blue-700 rounded-xl p-3 text-center text-sm animate-pulse">
            正在進行 GPS 與 IP 位置驗證，請稍候…
          </div>
        )}

        {clockResult && (
          <div className={`rounded-xl p-4 text-center font-bold ${clockResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {clockResult.error
              ? `❌ ${clockResult.error}`
              : `✅ 打卡成功！記錄時間 ${clockResult.record?.clockIn || clockResult.record?.clockOut}`}
          </div>
        )}

        {/* 今日全體狀況 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-3">今日全體出勤（{today}）</h2>
          <div className="space-y-2">
            {employees.filter((e) => e.active).map((e) => {
              const rec = todayRecs.find((r) => r.employeeId === e.id)
              const si  = rec ? STATUS_LABELS[rec.status] || STATUS_LABELS.normal : null
              return (
                <div key={e.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                  <div>
                    <span className="font-medium text-gray-800">{e.name}</span>
                    <span className="text-gray-400 ml-2">{STORES[e.storeId]?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {rec ? (
                      <>
                        <span className="font-mono text-gray-600">{rec.clockIn}</span>
                        {si && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${si.bg} ${si.color}`}>{si.label}</span>}
                      </>
                    ) : (
                      <span className="text-gray-300 text-xs">未打卡</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function VerifyBadge({ label, icon, status }) {
  const colors = {
    null:     'bg-gray-100 text-gray-400',
    checking: 'bg-blue-100 text-blue-600 animate-pulse',
    ok:       'bg-green-100 text-green-600',
    fail:     'bg-red-100 text-red-600',
  }
  const icons = {
    null:     <Clock size={14}/>,
    checking: icon,
    ok:       <CheckCircle size={14}/>,
    fail:     <XCircle size={14}/>,
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${colors[status]}`}>
      {icons[status]} {label}
    </div>
  )
}
