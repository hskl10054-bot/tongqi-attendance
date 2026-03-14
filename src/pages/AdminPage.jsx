import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { STORES, STORE_LIST } from '../utils/gpsUtils'
import { STATUS_LABELS, dailyAttendanceScan, calcMonthlyStats } from '../utils/scheduleUtils'
import { exportCSV } from '../utils/storageUtils'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import {
  Users, AlertTriangle, CheckCircle, Clock, Download, TrendingUp,
  Building2, Calendar, Search, Filter, RefreshCw,
} from 'lucide-react'

export default function AdminPage() {
  const { employees, attendance, reloadAttendance } = useApp()
  const [activeTab, setActiveTab]   = useState('dashboard')
  const [filterStore, setFilterStore] = useState('all')
  const [filterDate,  setFilterDate]  = useState(format(new Date(), 'yyyy-MM-dd'))
  const [searchQ,     setSearchQ]     = useState('')
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))

  // ── 今日掃描 ────────────────────────────────────────────────────────────
  const todayScan = useMemo(
    () => dailyAttendanceScan(employees, attendance, filterDate),
    [employees, attendance, filterDate]
  )

  const anomalies  = todayScan.filter((r) => ['late', 'very_late', 'absent'].includes(r.status))
  const normals    = todayScan.filter((r) => r.status === 'normal' || r.status === 'slight_late')
  const clocked    = todayScan.filter((r) => r.clockIn)

  // ── 統計卡 ────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    employees.filter((e) => e.active).length,
    clocked:  clocked.length,
    anomaly:  anomalies.length,
    normal:   normals.length,
  }), [employees, clocked, anomalies, normals])

  // ── 月度工時 ────────────────────────────────────────────────────────────
  const monthlyStats = useMemo(() => {
    return employees.filter((e) => e.active).map((e) => ({
      ...e,
      stats: calcMonthlyStats(e.id, attendance, filterMonth),
    }))
  }, [employees, attendance, filterMonth])

  // ── 篩選 ────────────────────────────────────────────────────────────────
  const filteredScan = useMemo(() => {
    return todayScan.filter((r) => {
      const storeOk  = filterStore === 'all' || r.storeId === filterStore
      const searchOk = !searchQ || r.name?.includes(searchQ)
      return storeOk && searchOk
    })
  }, [todayScan, filterStore, searchQ])

  // ── 匯出 CSV ────────────────────────────────────────────────────────────
  const exportAttendance = () => {
    const headers = ['姓名', '分店', '日期', '上班時間', '下班時間', '狀態', '驗證方式', 'IP位址', '備注']
    const rows = filteredScan.map((r) => [
      r.name, STORES[r.storeId]?.name || '', r.date,
      r.clockIn || '', r.clockOut || '',
      STATUS_LABELS[r.status]?.label || r.status,
      r.record?.method || '', r.record?.ip || '', r.record?.note || '',
    ])
    exportCSV(headers, rows, `出勤紀錄_${filterDate}.csv`)
  }

  const tabs = [
    { id: 'dashboard', label: '概覽', icon: <TrendingUp size={16}/> },
    { id: 'attendance', label: '出勤清單', icon: <Calendar size={16}/> },
    { id: 'monthly', label: '月度統計', icon: <Clock size={16}/> },
    { id: 'employees', label: '員工管理', icon: <Users size={16}/> },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="text-xl font-bold italic">裕綸集團</div>
          <div className="text-slate-400 text-xs mt-1">Admin Dashboard</div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${activeTab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
          <hr className="border-slate-700 my-2"/>
          <a href="#/" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
            ← 員工打卡頁
          </a>
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
          v1.0.0 · 裕綸集團系統
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{format(new Date(), 'yyyy/MM/dd HH:mm')}</span>
            <button onClick={reloadAttendance} className="p-1 hover:text-emerald-600" title="重新整理">
              <RefreshCw size={16}/>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* ── 概覽 ── */}
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="應到人數" value={stats.total} icon={<Users size={20}/>} color="blue"/>
                <StatCard label="已打卡" value={stats.clocked} icon={<CheckCircle size={20}/>} color="green"/>
                <StatCard label="異常/遲到" value={stats.anomaly} icon={<AlertTriangle size={20}/>} color="amber"/>
                <StatCard label="準時出勤" value={stats.normal} icon={<Clock size={20}/>} color="emerald"/>
              </div>

              {/* 各分店狀況 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {STORE_LIST.map((s) => {
                  const storeScan = todayScan.filter((r) => r.storeId === s.id)
                  const ok = storeScan.filter((r) => ['normal', 'slight_late'].includes(r.status))
                  const bad = storeScan.filter((r) => ['late', 'very_late', 'absent'].includes(r.status))
                  return (
                    <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4" style={{ borderColor: s.color }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 size={16} style={{ color: s.color }}/>
                        <span className="font-bold text-gray-800">{s.name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <div className="text-lg font-bold text-gray-800">{storeScan.length}</div>
                          <div className="text-gray-400 text-xs">應到</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">{ok.length}</div>
                          <div className="text-gray-400 text-xs">正常</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-red-600">{bad.length}</div>
                          <div className="text-gray-400 text-xs">異常</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 異常看板 */}
              {anomalies.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500"/>
                    今日異常出勤（{filterDate}）
                  </h3>
                  <div className="space-y-2">
                    {anomalies.map((r) => {
                      const si = STATUS_LABELS[r.status]
                      return (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                          <div>
                            <span className="font-medium text-gray-800">{r.name}</span>
                            <span className="text-gray-400 text-sm ml-2">{STORES[r.storeId]?.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono text-gray-600">{r.clockIn || '未打卡'}</span>
                            {si && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${si.bg} ${si.color}`}>{si.label}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── 出勤清單 ── */}
          {activeTab === 'attendance' && (
            <div className="bg-white rounded-xl shadow-sm">
              {/* Filters */}
              <div className="p-4 border-b flex flex-wrap gap-3">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <select
                  value={filterStore}
                  onChange={(e) => setFilterStore(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="all">所有分店</option>
                  {STORE_LIST.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input
                    placeholder="搜尋員工名稱"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    className="border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <button
                  onClick={exportAttendance}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 ml-auto"
                >
                  <Download size={14}/> 匯出 CSV
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      {['姓名','職位','分店','上班','下班','工時','狀態','驗證','IP位址'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredScan.map((r) => {
                      const si = STATUS_LABELS[r.status]
                      const mins = r.workMinutes || 0
                      const h = Math.floor(mins / 60), m = mins % 60
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                          <td className="px-4 py-3 text-gray-500">{r.role}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {STORES[r.storeId]?.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">{r.clockIn || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 font-mono">{r.clockOut || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 font-mono text-emerald-700">{r.clockIn ? `${h}h${m.toString().padStart(2,'0')}m` : '—'}</td>
                          <td className="px-4 py-3">
                            {si && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${si.bg} ${si.color}`}>{si.label}</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-blue-600 font-medium">{r.record?.method || '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.record?.ip || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredScan.length === 0 && (
                  <div className="text-center py-12 text-gray-400">無符合條件的出勤紀錄</div>
                )}
              </div>
            </div>
          )}

          {/* ── 月度統計 ── */}
          {activeTab === 'monthly' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  onClick={() => {
                    const headers = ['姓名', '類型', '工作天', '總工時(h)', '加班(h)', '遲到次', '曠職次']
                    const rows = monthlyStats.map((e) => [
                      e.name,
                      e.type === 'full_time' ? '全職' : e.type === 'part_time' ? '兼職' : '計時',
                      e.stats.workDays,
                      e.stats.totalWorkHours,
                      e.stats.totalOvertimeHours,
                      e.stats.lateCount,
                      e.stats.absentCount,
                    ])
                    exportCSV(headers, rows, `月度統計_${filterMonth}.csv`)
                  }}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
                >
                  <Download size={14}/> 匯出 CSV
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      {['姓名','類型','分店','工作天','總工時(h)','加班(h)','遲到次','曠職次'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {monthlyStats.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{e.name}</td>
                        <td className="px-4 py-3">
                          <TypeBadge type={e.type}/>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{STORES[e.storeId]?.name}</td>
                        <td className="px-4 py-3 font-mono">{e.stats.workDays}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-700">{e.stats.totalWorkHours}</td>
                        <td className="px-4 py-3 font-mono text-orange-600">{e.stats.totalOvertimeHours}</td>
                        <td className="px-4 py-3">
                          {e.stats.lateCount > 0
                            ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">{e.stats.lateCount}次</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {e.stats.absentCount > 0
                            ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{e.stats.absentCount}次</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 員工管理 ── */}
          {activeTab === 'employees' && <EmployeeManagement/>}
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue:    'bg-blue-50 text-blue-600 border-blue-200',
    green:   'bg-green-50 text-green-600 border-green-200',
    amber:   'bg-amber-50 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  }
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <span className={colors[color].split(' ')[1]}>{icon}</span>
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
    </div>
  )
}

function TypeBadge({ type }) {
  const map = {
    full_time: { label: '全職', cls: 'bg-blue-100 text-blue-700' },
    part_time: { label: '兼職', cls: 'bg-purple-100 text-purple-700' },
    hourly:    { label: '計時', cls: 'bg-amber-100 text-amber-700' },
  }
  const t = map[type] || { label: type, cls: 'bg-gray-100 text-gray-700' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.cls}`}>{t.label}</span>
}

function EmployeeManagement() {
  const { employees, saveEmployee, removeEmployee } = useApp()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  const openNew = () => {
    setForm({ type: 'full_time', storeId: 'jingzhong', active: true, hourlyRate: 183, monthlySalary: 30000, schedule: { workDays: [1,2,3,4,5], startTime: '09:00', endTime: '18:00' } })
    setEditing('new')
  }
  const openEdit = (emp) => { setForm(emp); setEditing(emp.id) }
  const handleSave = () => {
    saveEmployee(form)
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-gray-600 text-sm">共 {employees.length} 名員工</span>
        <button onClick={openNew} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
          + 新增員工
        </button>
      </div>

      {editing && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3 border-2 border-emerald-200">
          <h3 className="font-bold text-gray-800">{editing === 'new' ? '新增員工' : '編輯員工'}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[['name','姓名'],['role','職位'],['phone','電話'],['startDate','入職日期']].map(([k, l]) => (
              <label key={k} className="flex flex-col gap-1 text-sm text-gray-600">
                {l}
                <input value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  type={k === 'startDate' ? 'date' : 'text'}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
              </label>
            ))}
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              分店
              <select value={form.storeId || 'jingzhong'} onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300">
                {STORE_LIST.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              雇用類型
              <select value={form.type || 'full_time'} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300">
                <option value="full_time">全職（月薪）</option>
                <option value="part_time">兼職（時薪）</option>
                <option value="hourly">計時</option>
              </select>
            </label>
            {(form.type === 'full_time') && (
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                月薪（元）
                <input type="number" value={form.monthlySalary || ''} onChange={(e) => setForm({ ...form, monthlySalary: +e.target.value })}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
              </label>
            )}
            {(form.type === 'part_time' || form.type === 'hourly') && (
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                時薪（元）
                <input type="number" value={form.hourlyRate || ''} onChange={(e) => setForm({ ...form, hourlyRate: +e.target.value })}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
              </label>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-emerald-700">儲存</button>
            <button onClick={() => setEditing(null)} className="border px-5 py-2 rounded-lg text-sm hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              {['姓名','職位','分店','類型','薪資','電話','狀態','操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.name}</td>
                <td className="px-4 py-3 text-gray-500">{e.role}</td>
                <td className="px-4 py-3">{STORES[e.storeId]?.name}</td>
                <td className="px-4 py-3"><TypeBadge type={e.type}/></td>
                <td className="px-4 py-3 font-mono text-sm">
                  {e.type === 'full_time' ? `${(e.monthlySalary || 0).toLocaleString()}/月` : `${e.hourlyRate || 183}/時`}
                </td>
                <td className="px-4 py-3 text-gray-400">{e.phone}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${e.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {e.active ? '在職' : '離職'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(e)} className="text-blue-600 hover:underline text-xs mr-3">編輯</button>
                  <button onClick={() => { if (confirm(`確定停用 ${e.name}？`)) saveEmployee({ ...e, active: !e.active }) }}
                    className="text-gray-400 hover:underline text-xs">
                    {e.active ? '停用' : '啟用'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
