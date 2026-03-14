import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { format, differenceInDays, parseISO } from 'date-fns'
import { STORES } from '../utils/gpsUtils'
import { genId } from '../utils/storageUtils'
import {
  Calendar, Plus, CheckCircle, XCircle, Clock, Settings, ChevronRight, AlertTriangle,
} from 'lucide-react'

const LEAVE_STATUS = {
  pending:  { label: '待審核', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已核准', color: 'bg-green-100  text-green-700'  },
  rejected: { label: '已拒絕', color: 'bg-red-100   text-red-700'    },
}

export default function LeavePage() {
  const {
    employees, leaveTypes, leaveRecords, leaveQuotas,
    saveLeaveType, removeLeaveType, applyLeave, approveLeave,
  } = useApp()
  const [tab, setTab] = useState('quota')   // quota | apply | records | manage | types
  const [empId, setEmpId] = useState(employees[0]?.id || '')

  const tabs = [
    { id: 'quota',   label: '額度查詢',   icon: <Calendar  size={15}/> },
    { id: 'apply',   label: '申請假別',   icon: <Plus      size={15}/> },
    { id: 'records', label: '請假紀錄',   icon: <Clock     size={15}/> },
    { id: 'approve', label: '審核管理',   icon: <CheckCircle size={15}/> },
    { id: 'types',   label: '假別設定',   icon: <Settings  size={15}/> },
  ]

  const empQuotas = useMemo(() =>
    leaveQuotas
      .filter((q) => q.employeeId === empId && q.year === new Date().getFullYear())
      .map((q) => {
        const lt = leaveTypes.find((t) => t.id === q.leaveTypeId)
        return { ...q, leaveType: lt }
      })
      .filter((q) => q.leaveType)
  , [leaveQuotas, leaveTypes, empId])

  const pendingRecords = leaveRecords.filter((r) => r.status === 'pending')

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">假別管理系統</h1>
        <p className="text-gray-500 text-sm">自定義假別、額度管理、請假申請與審核</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition
              ${tab === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.id === 'approve' && pendingRecords.length > 0 && (
              <span className="bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                {pendingRecords.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 額度查詢 ── */}
      {tab === 'quota' && (
        <div className="space-y-4">
          <select
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {employees.filter((e) => e.active).map((e) => (
              <option key={e.id} value={e.id}>{e.name}（{STORES[e.storeId]?.name} · {e.role}）</option>
            ))}
          </select>

          <div className="grid gap-3">
            {empQuotas.length === 0 && (
              <div className="text-center py-10 text-gray-400">尚無假別額度資料</div>
            )}
            {empQuotas.map((q) => {
              const remaining = q.allotted - q.used - (q.pending || 0)
              const pct = Math.max(0, Math.min(100, ((q.allotted - q.used) / q.allotted) * 100))
              return (
                <div key={q.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: q.leaveType.color }}/>
                      <span className="font-bold text-gray-800">{q.leaveType.name}</span>
                      <span className="text-xs text-gray-400">{q.leaveType.description}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-emerald-700">{remaining}</span>
                      <span className="text-gray-400 text-sm"> / {q.allotted} 天</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: q.leaveType.color }}/>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>已使用 {q.used} 天</span>
                    {q.pending > 0 && <span className="text-yellow-600">審核中 {q.pending} 天</span>}
                    <span>剩餘 {remaining} 天</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 申請假別 ── */}
      {tab === 'apply' && (
        <ApplyLeaveForm
          employees={employees}
          leaveTypes={leaveTypes}
          leaveQuotas={leaveQuotas}
          onApply={applyLeave}
        />
      )}

      {/* ── 請假紀錄 ── */}
      {tab === 'records' && (
        <div className="space-y-3">
          <select
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">所有員工</option>
            {employees.filter((e) => e.active).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          {leaveRecords
            .filter((r) => !empId || r.employeeId === empId)
            .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
            .map((r) => {
              const emp = employees.find((e) => e.id === r.employeeId)
              const lt  = leaveTypes.find((t) => t.id === r.leaveTypeId)
              const si  = LEAVE_STATUS[r.status] || LEAVE_STATUS.pending
              return (
                <div key={r.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${si.color}`}>{si.label}</span>
                        <span className="text-xs text-gray-400">{lt?.name}</span>
                      </div>
                      <p className="font-medium text-gray-800">{emp?.name}</p>
                      <p className="text-sm text-gray-500">{r.startDate} ～ {r.endDate}（{r.days} 天）</p>
                      {r.reason && <p className="text-xs text-gray-400 mt-1">原因：{r.reason}</p>}
                      {r.approvalNote && <p className="text-xs text-orange-600 mt-1">審核備注：{r.approvalNote}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          {leaveRecords.filter((r) => !empId || r.employeeId === empId).length === 0 && (
            <div className="text-center py-10 text-gray-400">尚無請假紀錄</div>
          )}
        </div>
      )}

      {/* ── 審核管理 ── */}
      {tab === 'approve' && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-700">待審核申請（{pendingRecords.length} 筆）</h2>
          {pendingRecords.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <CheckCircle size={40} className="mx-auto mb-2 text-green-300"/>
              目前沒有待審核的請假申請
            </div>
          )}
          {pendingRecords.map((r) => {
            const emp = employees.find((e) => e.id === r.employeeId)
            const lt  = leaveTypes.find((t) => t.id === r.leaveTypeId)
            return (
              <ApprovalCard
                key={r.id}
                record={r}
                employee={emp}
                leaveType={lt}
                onApprove={(note) => approveLeave(r.id, true,  note)}
                onReject={(note)  => approveLeave(r.id, false, note)}
              />
            )
          })}

          <h2 className="font-bold text-gray-700 mt-4">已處理紀錄</h2>
          {leaveRecords.filter((r) => r.status !== 'pending').map((r) => {
            const emp = employees.find((e) => e.id === r.employeeId)
            const lt  = leaveTypes.find((t) => t.id === r.leaveTypeId)
            const si  = LEAVE_STATUS[r.status] || LEAVE_STATUS.pending
            return (
              <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700 text-sm">{emp?.name} · {lt?.name} · {r.days}天</p>
                  <p className="text-xs text-gray-400">{r.startDate} ～ {r.endDate}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${si.color}`}>{si.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 假別設定 ── */}
      {tab === 'types' && (
        <LeaveTypeManager
          leaveTypes={leaveTypes}
          onSave={saveLeaveType}
          onRemove={removeLeaveType}
        />
      )}
    </div>
  )
}

// ─── 申請假別表單 ─────────────────────────────────────────────────────────────
function ApplyLeaveForm({ employees, leaveTypes, leaveQuotas, onApply }) {
  const [form, setForm] = useState({
    employeeId: employees[0]?.id || '',
    leaveTypeId: leaveTypes[0]?.id || '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate:   format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const days = Math.max(1, differenceInDays(parseISO(form.endDate), parseISO(form.startDate)) + 1)

  const quota = leaveQuotas.find(
    (q) => q.employeeId === form.employeeId && q.leaveTypeId === form.leaveTypeId && q.year === new Date().getFullYear()
  )
  const remaining = quota ? quota.allotted - quota.used - (quota.pending || 0) : 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (days > remaining) { alert(`請假天數（${days}天）超過剩餘額度（${remaining}天）`); return }
    onApply({ ...form, days, year: new Date().getFullYear() })
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center space-y-3">
        <CheckCircle size={48} className="mx-auto text-green-500"/>
        <h3 className="text-xl font-bold text-gray-800">申請已送出！</h3>
        <p className="text-gray-500">等待主管審核，審核結果將顯示於「請假紀錄」頁面</p>
        <button onClick={() => setSubmitted(false)} className="bg-emerald-600 text-white px-6 py-2 rounded-lg mt-2 hover:bg-emerald-700">
          再次申請
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-gray-800 text-lg">請假申請</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          員工
          <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300">
            {employees.filter((e) => e.active).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          假別
          <select value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300">
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>{lt.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          開始日期
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          結束日期
          <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
        </label>
      </div>

      {/* 額度顯示 */}
      {quota && (
        <div className={`rounded-lg p-3 text-sm flex items-center justify-between
          ${days > remaining ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <span>申請 <strong>{days}</strong> 天 · 剩餘額度 <strong>{remaining}</strong> 天</span>
          {days > remaining && <AlertTriangle size={16}/>}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm text-gray-600">
        請假原因
        <textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
          placeholder="請填寫請假事由…"
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"/>
      </label>

      <button type="submit" disabled={days > remaining}
        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:bg-gray-300 transition">
        送出申請（{days} 天）
      </button>
    </form>
  )
}

// ─── 審核卡片 ─────────────────────────────────────────────────────────────────
function ApprovalCard({ record, employee, leaveType, onApprove, onReject }) {
  const [note, setNote] = useState('')
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-400">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-gray-800">{employee?.name}</span>
        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">{leaveType?.name}</span>
        <span className="text-sm text-gray-500">{record.days} 天</span>
      </div>
      <p className="text-sm text-gray-600">{record.startDate} ～ {record.endDate}</p>
      {record.reason && <p className="text-sm text-gray-400 mt-1">原因：{record.reason}</p>}
      <div className="mt-3 space-y-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="審核備注（選填）"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <div className="flex gap-2">
          <button onClick={() => onApprove(note)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            <CheckCircle size={14}/> 核准
          </button>
          <button onClick={() => onReject(note)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600">
            <XCircle size={14}/> 拒絕
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 假別設定管理 ─────────────────────────────────────────────────────────────
function LeaveTypeManager({ leaveTypes, onSave, onRemove }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  const openNew = () => { setForm({ color: '#16a34a', daysPerYear: 7 }); setEditing('new') }
  const openEdit = (lt) => { setForm(lt); setEditing(lt.id) }
  const handleSave = () => { onSave(form); setEditing(null) }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">共 {leaveTypes.length} 種假別</span>
        <button onClick={openNew} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
          + 新增假別
        </button>
      </div>

      {editing && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3 border-2 border-emerald-200">
          <h3 className="font-bold text-gray-800">{editing === 'new' ? '新增假別' : '編輯假別'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm text-gray-600 col-span-2">
              假別名稱 *
              <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例：特休假、病假、員工生日假…"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              每年可用天數
              <input type="number" min="0" value={form.daysPerYear || 0} onChange={(e) => setForm({ ...form, daysPerYear: +e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              顯示色彩
              <div className="flex gap-2 items-center">
                <input type="color" value={form.color || '#16a34a'} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-10 w-20 rounded border cursor-pointer"/>
                <span className="text-gray-400 text-xs">{form.color}</span>
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-600 col-span-2">
              說明
              <input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="假別用途、申請規定說明…"
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-emerald-700">儲存</button>
            <button onClick={() => setEditing(null)} className="border px-5 py-2 rounded-lg text-sm hover:bg-gray-50">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {leaveTypes.map((lt) => (
          <div key={lt.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: lt.color }}/>
              <div>
                <p className="font-bold text-gray-800">{lt.name}</p>
                <p className="text-xs text-gray-400">{lt.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-600">{lt.daysPerYear} 天/年</span>
              <button onClick={() => openEdit(lt)} className="text-blue-600 hover:underline text-xs">編輯</button>
              <button onClick={() => { if (confirm(`確定刪除「${lt.name}」假別？`)) onRemove(lt.id) }}
                className="text-red-400 hover:underline text-xs">刪除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
