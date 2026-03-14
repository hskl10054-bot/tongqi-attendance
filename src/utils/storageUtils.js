// ─── localStorage CRUD 工廠 ──────────────────────────────────────────────────
function makeStore(key, defaultVal = []) {
  const get = () => {
    try { return JSON.parse(localStorage.getItem(key)) ?? defaultVal }
    catch { return defaultVal }
  }
  const set = (data) => localStorage.setItem(key, JSON.stringify(data))
  const getAll = () => get()
  const findById = (id) => get().find((item) => item.id === id) || null
  const save = (item) => {
    const list = get()
    const idx = list.findIndex((i) => i.id === item.id)
    if (idx >= 0) list[idx] = item
    else list.push(item)
    set(list)
    return item
  }
  const remove = (id) => {
    const list = get().filter((i) => i.id !== id)
    set(list)
  }
  const clear = () => set(defaultVal)
  return { getAll, findById, save, remove, clear, _raw: get, _set: set }
}

// ─── 各資料集 Store ───────────────────────────────────────────────────────────
export const EmployeeStore    = makeStore('tq_employees',    [])
export const AttendanceStore  = makeStore('tq_attendance',   [])
export const LeaveTypeStore   = makeStore('tq_leave_types',  [])
export const LeaveRecordStore = makeStore('tq_leave_records',[])
export const LeaveQuotaStore  = makeStore('tq_leave_quota',  [])
export const FieldReportStore = makeStore('tq_field_reports',[])
export const PayrollStore     = makeStore('tq_payroll',      [])

// ─── UUID 產生器 ─────────────────────────────────────────────────────────────
export const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ─── 匯出 CSV ────────────────────────────────────────────────────────────────
export function exportCSV(headers, rows, filename = 'export.csv') {
  const BOM = '\uFEFF'
  const headerRow = headers.join(',')
  const dataRows  = rows.map((r) =>
    r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  )
  const csv = BOM + [headerRow, ...dataRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
