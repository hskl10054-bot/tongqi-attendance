import { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { STORES } from '../utils/gpsUtils'
import { calcAttendanceStatus } from '../utils/scheduleUtils'
import { exportCSV, genId } from '../utils/storageUtils'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Eye } from 'lucide-react'

// ─── 支援的硬體格式 ────────────────────────────────────────────────────────────
// 格式 A：姓名,日期,時間,類型  (常見指紋/刷卡機 CSV)
// 格式 B：員工編號,YYYY-MM-DD,HH:MM,IN/OUT
// 格式 C：工號,打卡日期,打卡時間  (無 IN/OUT，依奇偶配對)

function detectFormat(headers) {
  const h = headers.map((x) => x.trim().toLowerCase())
  if (h.includes('員工編號') || h.includes('工號'))   return 'B'
  if (h.includes('name') || h.includes('姓名'))        return 'A'
  return 'C'
}

function parseCSVLine(line) {
  const result = []
  let inQ = false, cell = ''
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { result.push(cell.trim()); cell = '' }
    else cell += ch
  }
  result.push(cell.trim())
  return result
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const headers = parseCSVLine(lines[0])
  return {
    headers,
    rows: lines.slice(1).map((l) => {
      const cells = parseCSVLine(l)
      return Object.fromEntries(headers.map((h, i) => [h.trim(), cells[i] ?? '']))
    }),
  }
}

// ─── 匹配員工：名字或工號 ─────────────────────────────────────────────────────
function matchEmployee(employees, identifier) {
  if (!identifier) return null
  const s = identifier.trim()
  return (
    employees.find((e) => e.id === s) ||
    employees.find((e) => e.name === s) ||
    employees.find((e) => e.phone === s) ||
    null
  )
}

export default function ImportPage() {
  const { employees, saveAttendance } = useApp()
  const [dragging, setDragging] = useState(false)
  const [parsed,   setParsed]   = useState(null)
  const [preview,  setPreview]  = useState([])
  const [results,  setResults]  = useState(null)
  const [importing, setImporting] = useState(false)
  const [storeOverride, setStoreOverride] = useState('auto')

  const processFile = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      try {
        const { headers, rows } = parseCSV(text)
        const fmt = detectFormat(headers)
        const mapped = mapRows(rows, fmt, employees, storeOverride)
        setParsed({ headers, rows, format: fmt, total: rows.length })
        setPreview(mapped)
        setResults(null)
      } catch (err) {
        alert('CSV 解析失敗：' + err.message)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }, [employees, storeOverride])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }, [processFile])

  const onFile = (e) => processFile(e.target.files[0])

  const handleImport = () => {
    if (!preview.length) return
    setImporting(true)
    let ok = 0, fail = 0, dup = 0
    const failedRows = []

    for (const row of preview) {
      if (!row.matched) { fail++; failedRows.push({ ...row, reason: '找不到員工' }); continue }
      if (row.isDuplicate) { dup++; continue }
      try {
        saveAttendance({
          id: genId(),
          employeeId: row.employeeId,
          date: row.date,
          clockIn:  row.type === 'out' ? undefined : row.time,
          clockOut: row.type === 'out' ? row.time : undefined,
          storeId:  row.storeId,
          status:   row.status,
          method:   'HARDWARE',
          note:     `硬體匯入 (${row.rawName || row.rawId})`,
        })
        ok++
      } catch {
        fail++; failedRows.push({ ...row, reason: '寫入失敗' })
      }
    }
    setResults({ ok, fail, dup, failedRows })
    setImporting(false)
  }

  const downloadTemplate = () => {
    const headers = ['姓名', '日期', '時間', '類型(IN/OUT)']
    const rows = [
      ['陳志明', '2026-03-14', '08:00', 'IN'],
      ['陳志明', '2026-03-14', '17:05', 'OUT'],
      ['林雅婷', '2026-03-14', '08:10', 'IN'],
    ]
    exportCSV(headers, rows, '硬體匯入範本.csv')
  }

  const matched   = preview.filter((r) => r.matched).length
  const unmatched = preview.filter((r) => !r.matched).length

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">外部硬體資料匯入</h1>
          <p className="text-gray-500 text-sm mt-1">支援指紋機、刷卡機、人臉辨識機匯出的 CSV 格式</p>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          <Download size={14}/> 下載範本 CSV
        </button>
      </div>

      {/* 分店覆寫 */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">分店指定（CSV 無分店欄位時）：</label>
        <select
          value={storeOverride}
          onChange={(e) => setStoreOverride(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="auto">自動依員工資料</option>
          {Object.values(STORES).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* 拖放區 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition cursor-pointer
          ${dragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'}`}
        onClick={() => document.getElementById('file-input').click()}
      >
        <Upload size={40} className="mx-auto mb-3 text-gray-400"/>
        <p className="text-gray-600 font-medium">拖放 CSV 檔案至此，或點擊選取</p>
        <p className="text-gray-400 text-sm mt-1">支援 UTF-8 編碼 CSV，最大 5MB</p>
        <input id="file-input" type="file" accept=".csv,.txt" onChange={onFile} className="hidden"/>
      </div>

      {/* 解析結果 */}
      {parsed && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-emerald-600"/>
              <span className="font-bold text-gray-800">解析結果（格式 {parsed.format}）</span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-green-600 font-medium">✅ 匹配 {matched} 筆</span>
              {unmatched > 0 && <span className="text-red-500 font-medium">❌ 未匹配 {unmatched} 筆</span>}
            </div>
          </div>

          {/* 預覽表格 */}
          <div className="overflow-x-auto max-h-80 overflow-y-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0 text-gray-500">
                <tr>
                  {['狀態','員工','日期','時間','類型','分店','出勤狀態'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((r, i) => (
                  <tr key={i} className={r.matched ? 'hover:bg-gray-50' : 'bg-red-50'}>
                    <td className="px-3 py-2">
                      {r.matched
                        ? <CheckCircle size={14} className="text-green-500"/>
                        : <XCircle    size={14} className="text-red-500"/>}
                    </td>
                    <td className="px-3 py-2 font-medium">{r.employeeName || r.rawName || r.rawId || '—'}</td>
                    <td className="px-3 py-2 font-mono">{r.date}</td>
                    <td className="px-3 py-2 font-mono">{r.time}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${r.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                        {r.type === 'in' ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{STORES[r.storeId]?.name || '—'}</td>
                    <td className="px-3 py-2">
                      {r.status
                        ? <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{r.status}</span>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing || matched === 0}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-300 transition"
            >
              {importing ? '匯入中…' : `確認匯入 ${matched} 筆`}
            </button>
            <button onClick={() => { setParsed(null); setPreview([]); setResults(null) }}
              className="border px-6 py-2.5 rounded-lg text-sm hover:bg-gray-50">
              清除
            </button>
          </div>
        </div>
      )}

      {/* 匯入結果 */}
      {results && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-gray-800">匯入完成</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{results.ok}</div>
              <div className="text-xs text-green-500">成功</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{results.dup}</div>
              <div className="text-xs text-amber-500">重複跳過</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{results.fail}</div>
              <div className="text-xs text-red-500">失敗</div>
            </div>
          </div>
          {results.failedRows.length > 0 && (
            <details className="text-sm">
              <summary className="text-red-600 cursor-pointer font-medium">查看失敗明細（{results.failedRows.length} 筆）</summary>
              <ul className="mt-2 space-y-1 text-gray-600">
                {results.failedRows.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-400">•</span>
                    <span>{r.rawName || r.rawId} / {r.date} / {r.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* 格式說明 */}
      <div className="bg-blue-50 rounded-xl p-5 text-sm text-blue-800 space-y-2">
        <h3 className="font-bold">支援的 CSV 格式說明</h3>
        <ul className="space-y-1 list-disc list-inside text-blue-700">
          <li><strong>格式 A：</strong>姓名, 日期, 時間, 類型(IN/OUT)</li>
          <li><strong>格式 B：</strong>員工編號, 打卡日期(YYYY-MM-DD), 打卡時間(HH:MM), 類型</li>
          <li><strong>格式 C：</strong>工號/姓名, 打卡日期, 打卡時間（奇數為上班、偶數為下班）</li>
          <li>日期格式支援：YYYY-MM-DD、YYYY/MM/DD、MM/DD/YYYY</li>
          <li>員工欄可使用姓名、員工 ID 或電話進行自動匹配</li>
        </ul>
      </div>
    </div>
  )
}

// ─── 列映射邏輯 ───────────────────────────────────────────────────────────────
function mapRows(rows, fmt, employees, storeOverride) {
  const pairMap = {} // 格式 C 用：每人每日配對

  return rows.map((row, idx) => {
    let rawName, rawId, dateStr, timeStr, typeStr

    if (fmt === 'A') {
      rawName = row['姓名'] || row['name'] || ''
      dateStr  = row['日期'] || row['date'] || ''
      timeStr  = row['時間'] || row['time'] || ''
      typeStr  = (row['類型'] || row['type'] || 'IN').toUpperCase()
    } else if (fmt === 'B') {
      rawId   = row['員工編號'] || row['工號'] || ''
      dateStr  = row['打卡日期'] || row['日期'] || ''
      timeStr  = row['打卡時間'] || row['時間'] || ''
      typeStr  = (row['類型'] || 'IN').toUpperCase()
    } else {
      rawName = row[Object.keys(row)[0]] || ''
      rawId   = rawName
      dateStr  = row[Object.keys(row)[1]] || ''
      timeStr  = row[Object.keys(row)[2]] || ''
      // 奇偶配對
      const key = `${rawName}_${dateStr}`
      pairMap[key] = (pairMap[key] || 0) + 1
      typeStr = pairMap[key] % 2 === 1 ? 'IN' : 'OUT'
    }

    // 日期標準化
    const date = normalizeDate(dateStr)
    const time = normalizeTime(timeStr)
    const type = typeStr.includes('OUT') || typeStr.includes('下班') ? 'out' : 'in'

    // 匹配員工
    const emp = matchEmployee(employees, rawName || rawId)

    const storeId = storeOverride !== 'auto' ? storeOverride : (emp?.storeId || 'jingzhong')
    const status  = type === 'in' ? calcAttendanceStatus(time, storeId, emp?.schedule?.startTime) : null

    return {
      rawName, rawId,
      date, time, type,
      matched: !!emp,
      isDuplicate: false,
      employeeId:   emp?.id,
      employeeName: emp?.name,
      storeId,
      status,
    }
  })
}

function normalizeDate(s = '') {
  const t = s.trim().replace(/\//g, '-')
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  // MM/DD/YYYY → YYYY-MM-DD
  const m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
  return t
}

function normalizeTime(s = '') {
  const t = s.trim()
  if (/^\d{2}:\d{2}$/.test(t)) return t
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t.slice(0, 5)
  if (/^\d{3,4}$/.test(t)) {
    const padded = t.padStart(4, '0')
    return `${padded.slice(0, 2)}:${padded.slice(2)}`
  }
  return t
}
