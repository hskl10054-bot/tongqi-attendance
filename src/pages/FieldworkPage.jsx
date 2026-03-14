import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { STORES } from '../utils/gpsUtils'
import { format } from 'date-fns'
import { Camera, MapPin, Send, CheckCircle, Clock, AlertCircle, Trash2, Plus, Eye } from 'lucide-react'

const STATUS_MAP = {
  pending:     { label: '待處理', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: '進行中', color: 'bg-blue-100 text-blue-700' },
  completed:   { label: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled:   { label: '已取消', color: 'bg-gray-100 text-gray-500' },
}

export default function FieldworkPage() {
  const { employees, fieldReports, saveFieldReport, currentUser } = useApp()
  const [view, setView] = useState('list') // 'list' | 'new' | 'detail'
  const [selected, setSelected] = useState(null)
  const [empFilter, setEmpFilter] = useState(currentUser?.id || 'all')

  const fieldWorkers = employees.filter((e) => e.isFieldWorker || e.role.includes('外勤'))

  const filteredReports = fieldReports
    .filter((r) => empFilter === 'all' || r.employeeId === empFilter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">外勤回報系統</h1>
          <p className="text-gray-500 text-sm">外勤人員任務進度與現場照片上傳</p>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('new')}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
          >
            <Plus size={14}/> 新增回報
          </button>
        )}
        {view !== 'list' && (
          <button onClick={() => { setView('list'); setSelected(null) }}
            className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">← 返回列表</button>
        )}
      </div>

      {view === 'list' && (
        <>
          {/* 篩選 */}
          <div className="flex gap-3">
            <select
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="all">所有外勤人員</option>
              {fieldWorkers.map((e) => (
                <option key={e.id} value={e.id}>{e.name}（{STORES[e.storeId]?.name}）</option>
              ))}
            </select>
          </div>

          {/* 報告列表 */}
          <div className="space-y-3">
            {filteredReports.length === 0 && (
              <div className="text-center py-16 text-gray-400">尚無外勤回報記錄</div>
            )}
            {filteredReports.map((r) => {
              const emp = employees.find((e) => e.id === r.employeeId)
              const si  = STATUS_MAP[r.status] || STATUS_MAP.pending
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition"
                  onClick={() => { setSelected(r); setView('detail') }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${si.color}`}>{si.label}</span>
                        <span className="text-xs text-gray-400">{r.date} {r.time}</span>
                      </div>
                      <h3 className="font-bold text-gray-800">{r.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><MapPin size={12}/>{r.location}</span>
                        <span>{emp?.name || '—'}</span>
                        {r.photos?.length > 0 && <span className="flex items-center gap-1"><Camera size={12}/>{r.photos.length} 張</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {view === 'new' && (
        <NewReportForm
          employees={fieldWorkers}
          currentUser={currentUser}
          onSave={(report) => { saveFieldReport(report); setView('list') }}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'detail' && selected && (
        <ReportDetail
          report={selected}
          employees={employees}
          onUpdateStatus={(status) => {
            const updated = { ...selected, status }
            saveFieldReport(updated)
            setSelected(updated)
          }}
        />
      )}
    </div>
  )
}

// ─── 新增回報表單 ──────────────────────────────────────────────────────────────
function NewReportForm({ employees, currentUser, onSave, onCancel }) {
  const [form, setForm] = useState({
    employeeId:  currentUser?.id || employees[0]?.id || '',
    date:        format(new Date(), 'yyyy-MM-dd'),
    time:        format(new Date(), 'HH:mm'),
    title:       '',
    description: '',
    location:    '',
    status:      'in_progress',
    photos:      [],
    followUp:    '',
    lat:         null,
    lng:         null,
  })
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()

  const getLocation = async () => {
    setLocating(true)
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      )
      setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }))
      alert(`✅ GPS 定位成功：${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`)
    } catch {
      alert('GPS 定位失敗，請確認已授權定位權限')
    }
    setLocating(false)
  }

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files)
    const readers = files.map((f) => new Promise((res) => {
      const r = new FileReader()
      r.onload = () => res({ name: f.name, size: f.size, dataUrl: r.result, type: f.type })
      r.readAsDataURL(f)
    }))
    Promise.all(readers).then((photos) => {
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...photos] }))
    })
  }

  const removePhoto = (idx) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) { alert('請填寫回報標題'); return }
    if (!form.employeeId)   { alert('請選擇回報人員'); return }
    setSubmitting(true)
    onSave({ ...form, createdAt: new Date().toISOString() })
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-gray-800 text-lg">新增外勤回報</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          回報人員
          <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300">
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          任務狀態
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300">
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          日期
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          時間
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-gray-600">
        回報標題 *
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="例：拜訪全家南屯店，確認設備安裝進度"
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-600">
        詳細說明
        <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="說明任務進度、遇到的問題、達成事項…"
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"/>
      </label>

      <div className="flex gap-2">
        <label className="flex-1 flex flex-col gap-1 text-sm text-gray-600">
          現場地址
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="例：台中市南屯區文心路一段"
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
        </label>
        <div className="flex flex-col gap-1 text-sm text-gray-600">
          &nbsp;
          <button type="button" onClick={getLocation} disabled={locating}
            className="flex items-center gap-1.5 border border-emerald-400 text-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-50 disabled:opacity-50">
            <MapPin size={14}/> {locating ? '定位中…' : 'GPS 定位'}
          </button>
        </div>
      </div>
      {form.lat && (
        <p className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
          ✅ GPS: {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
        </p>
      )}

      {/* 照片上傳 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-600">現場照片（最多 10 張）</label>
          <button type="button" onClick={() => fileRef.current.click()}
            className="flex items-center gap-1 text-emerald-600 text-sm hover:underline">
            <Camera size={14}/> 上傳照片
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden"/>
        </div>
        {form.photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {form.photos.map((p, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover"/>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={12}/>
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-1 py-0.5 truncate">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm text-gray-600">
        後續追蹤事項
        <input value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value })}
          placeholder="例：明日確認完工並拍照存檔"
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-300">
          <Send size={16}/> {submitting ? '提交中…' : '提交回報'}
        </button>
        <button type="button" onClick={onCancel} className="border px-6 py-2.5 rounded-lg text-sm hover:bg-gray-50">取消</button>
      </div>
    </form>
  )
}

// ─── 回報詳情 ─────────────────────────────────────────────────────────────────
function ReportDetail({ report, employees, onUpdateStatus }) {
  const emp = employees.find((e) => e.id === report.employeeId)
  const si  = STATUS_MAP[report.status] || STATUS_MAP.pending
  const [lightbox, setLightbox] = useState(null)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${si.color}`}>{si.label}</span>
          <h2 className="text-xl font-bold text-gray-800 mt-2">{report.title}</h2>
        </div>
        <select
          value={report.status}
          onChange={(e) => onUpdateStatus(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <InfoRow label="回報人員" value={emp?.name || '—'}/>
        <InfoRow label="日期時間" value={`${report.date} ${report.time}`}/>
        <InfoRow label="現場地址" value={report.location || '—'}/>
        {report.lat && <InfoRow label="GPS 座標" value={`${report.lat?.toFixed(5)}, ${report.lng?.toFixed(5)}`}/>}
      </div>

      {report.description && (
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">詳細說明</p>
          <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-3 leading-relaxed">{report.description}</p>
        </div>
      )}

      {report.followUp && (
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">後續追蹤</p>
          <p className="text-gray-700 text-sm bg-amber-50 rounded-lg p-3">{report.followUp}</p>
        </div>
      )}

      {report.photos?.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">現場照片（{report.photos.length} 張）</p>
          <div className="grid grid-cols-3 gap-2">
            {report.photos.map((p, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90"
                onClick={() => setLightbox(p)}>
                <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover"/>
              </div>
            ))}
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox.dataUrl} alt={lightbox.name} className="max-w-full max-h-full rounded-lg"/>
          <button className="absolute top-4 right-4 text-white text-2xl font-bold" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-700">{value}</p>
    </div>
  )
}
