import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { STORES } from '../utils/gpsUtils'
import { calcMonthlyStats } from '../utils/scheduleUtils'
import { calcMonthlyPayroll, OVERTIME_RATES } from '../utils/payrollUtils'
import { exportCSV } from '../utils/storageUtils'
import { format } from 'date-fns'
import { DollarSign, Download, ChevronDown, ChevronRight, Calculator, Info } from 'lucide-react'

const TYPE_LABELS = { full_time: '全職', part_time: '兼職', hourly: '計時' }

export default function PayrollPage() {
  const { employees, attendance } = useApp()
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [expanded, setExpanded] = useState(null)
  const [storeFilter, setStoreFilter] = useState('all')

  const payrollData = useMemo(() => {
    return employees
      .filter((e) => e.active)
      .filter((e) => storeFilter === 'all' || e.storeId === storeFilter)
      .map((e) => {
        const stats  = calcMonthlyStats(e.id, attendance, month)
        const result = calcMonthlyPayroll(e, stats)
        return { ...result, employee: e, stats }
      })
  }, [employees, attendance, month, storeFilter])

  const totals = useMemo(() => ({
    regularPay:  payrollData.reduce((s, r) => s + r.regularPay,  0),
    overtimePay: payrollData.reduce((s, r) => s + r.overtimePay, 0),
    deductions:  payrollData.reduce((s, r) => s + r.deductions,  0),
    totalPay:    payrollData.reduce((s, r) => s + r.totalPay,    0),
  }), [payrollData])

  const handleExport = () => {
    const headers = ['姓名', '類型', '分店', '工作天', '正常工時(h)', '加班工時(h)',
      '底薪/基本薪(元)', '加班費(元)', '扣款(元)', '實領薪資(元)', '遲到次', '曠職次']
    const rows = payrollData.map((r) => [
      r.employeeName,
      TYPE_LABELS[r.employeeType] || r.employeeType,
      STORES[r.employee.storeId]?.name,
      r.stats.workDays,
      r.stats.totalWorkHours,
      r.stats.totalOvertimeHours,
      r.regularPay,
      r.overtimePay,
      Math.round(r.deductions),
      r.totalPay,
      r.stats.lateCount,
      r.stats.absentCount,
    ])
    exportCSV(headers, rows, `薪資計算_${month}.csv`)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">自動計薪系統</h1>
          <p className="text-gray-500 text-sm mt-0.5">依據勞基法計算正職、兼職、計時員工薪資及加班費</p>
        </div>
        <div className="flex gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">所有分店</option>
            {Object.values(STORES).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
          >
            <Download size={14}/> 匯出 Excel
          </button>
        </div>
      </div>

      {/* 加班費說明 */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <div className="flex items-center gap-2 font-bold mb-2"><Info size={14}/> 加班費計算規則（依勞基法）</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: '前2小時加班', rate: `×${(OVERTIME_RATES.first2Hours).toFixed(3)}` },
            { label: '3-4小時加班', rate: `×${(OVERTIME_RATES.next2Hours).toFixed(3)}` },
            { label: '假日(前8h)', rate: `×${OVERTIME_RATES.holidayFirst}` },
            { label: '假日(8h以上)', rate: `×${OVERTIME_RATES.holidayExtra}` },
          ].map((r) => (
            <div key={r.label} className="bg-white rounded-lg p-2 border border-blue-100">
              <div className="text-xs text-blue-500">{r.label}</div>
              <div className="font-bold text-blue-800 text-base">{r.rate}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 統計總覽 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '基本薪資總額', value: totals.regularPay,  color: 'blue'  },
          { label: '加班費總額',   value: totals.overtimePay, color: 'orange' },
          { label: '扣款總額',     value: totals.deductions,  color: 'red'   },
          { label: '實領總薪資',   value: totals.totalPay,    color: 'green' },
        ].map((s) => (
          <SummaryCard key={s.label} {...s}/>
        ))}
      </div>

      {/* 薪資明細表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">{month} 薪資計算明細</h2>
        </div>

        <div className="divide-y divide-gray-50">
          {payrollData.map((r) => {
            const isOpen = expanded === r.employeeId
            return (
              <div key={r.employeeId}>
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : r.employeeId)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown size={16} className="text-gray-400"/> : <ChevronRight size={16} className="text-gray-400"/>}
                    <div>
                      <div className="font-medium text-gray-800">{r.employeeName}</div>
                      <div className="text-xs text-gray-400">
                        {TYPE_LABELS[r.employeeType]} · {STORES[r.employee?.storeId]?.name} · {r.stats.workDays} 天
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <div className="text-xs text-gray-400">加班</div>
                      <div className="font-mono text-sm text-orange-600">
                        {r.stats.totalOvertimeHours > 0 ? `+${r.stats.totalOvertimeHours}h` : '—'}
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-xs text-gray-400">扣款</div>
                      <div className="font-mono text-sm text-red-600">
                        {r.deductions > 0 ? `-${Math.round(r.deductions).toLocaleString()}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">實領</div>
                      <div className="font-mono font-bold text-emerald-700 text-lg">
                        NT$ {r.totalPay.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <DetailBox label="正常工時" value={`${r.stats.totalWorkHours - r.stats.totalOvertimeHours} h`}/>
                      <DetailBox label="加班工時" value={`${r.stats.totalOvertimeHours} h`}/>
                      <DetailBox label="遲到次數" value={`${r.stats.lateCount} 次`}/>
                      <DetailBox label="曠職次數" value={`${r.stats.absentCount} 次`}/>
                    </div>

                    <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                      <h4 className="font-bold text-gray-700 flex items-center gap-1"><Calculator size={14}/> 計算明細</h4>
                      {r.employeeType === 'full_time' ? (
                        <>
                          <CalcRow label={`月薪底薪`} value={`NT$ ${r.breakdown.monthlySalary?.toLocaleString()}`}/>
                          <CalcRow label={`加班費 (${r.stats.totalOvertimeHours}h × ${r.breakdown.hourlyRate?.toFixed(0)}/h × 加班倍率)`} value={`+ NT$ ${r.overtimePay.toLocaleString()}`} color="orange"/>
                          <CalcRow label={`遲到扣款 (${r.stats.lateCount}次 × 200)`} value={`- NT$ ${(r.stats.lateCount * 200).toLocaleString()}`} color="red"/>
                          <CalcRow label={`曠職扣款 (${r.stats.absentCount}次 × ${r.breakdown.dailyRate?.toFixed(0)}/日)`} value={`- NT$ ${Math.round(r.stats.absentCount * (r.breakdown.dailyRate || 0)).toLocaleString()}`} color="red"/>
                        </>
                      ) : (
                        <>
                          <CalcRow label={`實際工時 ${r.stats.totalWorkHours - r.stats.totalOvertimeHours}h × ${r.breakdown.hourlyRate}/h`} value={`NT$ ${r.regularPay.toLocaleString()}`}/>
                          <CalcRow label={`加班費 (${r.stats.totalOvertimeHours}h × 加班倍率 × ${r.breakdown.hourlyRate}/h)`} value={`+ NT$ ${r.overtimePay.toLocaleString()}`} color="orange"/>
                        </>
                      )}
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>實領薪資</span>
                        <span className="text-emerald-700">NT$ {r.totalPay.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  const colors = {
    blue:   'border-blue-400   text-blue-700   bg-blue-50',
    orange: 'border-orange-400 text-orange-700 bg-orange-50',
    red:    'border-red-400    text-red-700    bg-red-50',
    green:  'border-emerald-400 text-emerald-700 bg-emerald-50',
  }
  return (
    <div className={`rounded-xl p-4 border-l-4 ${colors[color]}`}>
      <div className="text-xs mb-1 opacity-70">{label}</div>
      <div className="font-mono font-bold text-xl">NT$ {Math.round(value).toLocaleString()}</div>
    </div>
  )
}

function DetailBox({ label, value }) {
  return (
    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="font-bold text-gray-800 mt-0.5">{value}</div>
    </div>
  )
}

function CalcRow({ label, value, color }) {
  const colors = { orange: 'text-orange-600', red: 'text-red-600' }
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`font-mono font-medium ${colors[color] || 'text-gray-800'}`}>{value}</span>
    </div>
  )
}
