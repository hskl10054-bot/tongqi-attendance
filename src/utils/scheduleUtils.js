import { STORES } from './gpsUtils'
import { format, parseISO, differenceInMinutes, isWeekend, addDays } from 'date-fns'

// ─── 判斷出勤狀態 ─────────────────────────────────────────────────────────────
export function calcAttendanceStatus(clockInTime, storeId, scheduledStart) {
  if (!clockInTime) return 'absent' // 無打卡 → 曠職
  const store = STORES[storeId]
  const startStr = scheduledStart || store?.startTime || '09:00'

  const [sh, sm] = startStr.split(':').map(Number)
  const [ch, cm] = clockInTime.split(':').map(Number)
  const scheduledMins = sh * 60 + sm
  const clockedMins   = ch * 60 + cm
  const diff = clockedMins - scheduledMins
  const lateLimit = store?.lateMinutes ?? 10

  if (diff <= 0)          return 'normal'   // 準時或提早
  if (diff <= lateLimit)  return 'slight_late' // 輕微遲到（寬容期）
  if (diff <= 30)         return 'late'     // 遲到
  if (diff <= 60)         return 'very_late' // 嚴重遲到
  return 'absent'                           // 超過 60 分鐘視為曠職
}

// ─── 計算工時（分鐘）────────────────────────────────────────────────────────
export function calcWorkMinutes(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0
  const [ih, im] = clockIn.split(':').map(Number)
  const [oh, om] = clockOut.split(':').map(Number)
  const inMins  = ih * 60 + im
  const outMins = oh * 60 + om
  return Math.max(0, outMins - inMins)
}

// ─── 判斷是否為加班 ──────────────────────────────────────────────────────────
export function calcOvertimeMinutes(workMinutes, regularHours = 8) {
  const regularMins = regularHours * 60
  return Math.max(0, workMinutes - regularMins)
}

// ─── 每日出勤排程掃描 ─────────────────────────────────────────────────────────
// records: 今日出勤記錄陣列, employees: 員工陣列
export function dailyAttendanceScan(employees, records, dateStr) {
  const date = dateStr || format(new Date(), 'yyyy-MM-dd')
  const todayRecords = records.filter((r) => r.date === date)

  return employees
    .filter((emp) => emp.active !== false)
    .map((emp) => {
      const rec = todayRecords.find((r) => r.employeeId === emp.id)
      const store = STORES[emp.storeId]
      const scheduledStart = emp.schedule?.startTime || store?.startTime || '09:00'

      // 跳過假日（若員工 schedule 未指定輪班）
      const dayOfWeek = new Date(date).getDay()
      const workDays = emp.schedule?.workDays || [1, 2, 3, 4, 5]
      if (!workDays.includes(dayOfWeek)) {
        return { ...emp, date, record: rec || null, status: 'day_off', workMinutes: 0, overtimeMinutes: 0 }
      }

      const status = calcAttendanceStatus(rec?.clockIn || null, emp.storeId, scheduledStart)
      const workMins = rec ? calcWorkMinutes(rec.clockIn, rec.clockOut) : 0
      const overtimeMins = calcOvertimeMinutes(workMins)

      return {
        ...emp,
        date,
        record: rec || null,
        status,
        scheduledStart,
        clockIn:  rec?.clockIn  || null,
        clockOut: rec?.clockOut || null,
        workMinutes: workMins,
        overtimeMinutes: overtimeMins,
      }
    })
}

// ─── 月工時統計 ──────────────────────────────────────────────────────────────
export function calcMonthlyStats(employeeId, records, yearMonth) {
  const filtered = records.filter(
    (r) => r.employeeId === employeeId && r.date.startsWith(yearMonth)
  )
  let totalWork = 0, totalOvertime = 0, lateCount = 0, absentCount = 0

  for (const r of filtered) {
    const mins = calcWorkMinutes(r.clockIn, r.clockOut)
    const ot   = calcOvertimeMinutes(mins)
    totalWork    += mins
    totalOvertime += ot
    if (['late', 'very_late'].includes(r.status)) lateCount++
    if (r.status === 'absent') absentCount++
  }

  return {
    workDays: filtered.filter((r) => r.clockIn).length,
    totalWorkHours: +(totalWork / 60).toFixed(2),
    totalOvertimeHours: +(totalOvertime / 60).toFixed(2),
    lateCount,
    absentCount,
  }
}

// ─── 取得出勤狀態標籤 ────────────────────────────────────────────────────────
export const STATUS_LABELS = {
  normal:      { label: '正常', color: 'text-green-600',  bg: 'bg-green-100'  },
  slight_late: { label: '輕微遲到', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  late:        { label: '遲到', color: 'text-orange-600', bg: 'bg-orange-100' },
  very_late:   { label: '嚴重遲到', color: 'text-red-600',    bg: 'bg-red-100'    },
  absent:      { label: '曠職', color: 'text-red-800',    bg: 'bg-red-200'    },
  day_off:     { label: '休假日', color: 'text-gray-500',   bg: 'bg-gray-100'   },
  leave:       { label: '請假中', color: 'text-blue-600',   bg: 'bg-blue-100'   },
  field:       { label: '外勤', color: 'text-purple-600', bg: 'bg-purple-100' },
}
