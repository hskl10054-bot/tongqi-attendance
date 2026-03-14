import { genId } from '../utils/storageUtils'
import { format } from 'date-fns'

const today = format(new Date(), 'yyyy-MM-dd')
const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')

// ─── 初始員工資料 ─────────────────────────────────────────────────────────────
export const INITIAL_EMPLOYEES = [
  {
    id: 'emp001', name: '陳志明', storeId: 'jingzhong', role: '店長',
    type: 'full_time', monthlySalary: 42000, hourlyRate: null,
    active: true, phone: '0912-345-678', startDate: '2022-03-01',
    schedule: { workDays: [1,2,3,4,5], startTime: '08:00', endTime: '17:00' },
    isFieldWorker: false,
  },
  {
    id: 'emp002', name: '林雅婷', storeId: 'jingzhong', role: '咖啡師',
    type: 'full_time', monthlySalary: 32000, hourlyRate: null,
    active: true, phone: '0923-456-789', startDate: '2023-01-15',
    schedule: { workDays: [1,2,3,4,5], startTime: '08:00', endTime: '17:00' },
    isFieldWorker: false,
  },
  {
    id: 'emp003', name: '王小明', storeId: 'beitun', role: '店長',
    type: 'full_time', monthlySalary: 40000, hourlyRate: null,
    active: true, phone: '0934-567-890', startDate: '2021-06-01',
    schedule: { workDays: [1,2,3,4,5], startTime: '08:30', endTime: '17:30' },
    isFieldWorker: false,
  },
  {
    id: 'emp004', name: '張美玲', storeId: 'beitun', role: '服務員',
    type: 'part_time', monthlySalary: null, hourlyRate: 200,
    active: true, phone: '0945-678-901', startDate: '2024-02-01',
    schedule: { workDays: [1,3,5], startTime: '10:00', endTime: '18:00' },
    isFieldWorker: false,
  },
  {
    id: 'emp005', name: '李家豪', storeId: 'nanqu', role: '店長',
    type: 'full_time', monthlySalary: 39000, hourlyRate: null,
    active: true, phone: '0956-789-012', startDate: '2022-09-01',
    schedule: { workDays: [1,2,3,4,5], startTime: '09:00', endTime: '18:00' },
    isFieldWorker: false,
  },
  {
    id: 'emp006', name: '吳彥廷', storeId: 'nanqu', role: '外勤業務',
    type: 'full_time', monthlySalary: 35000, hourlyRate: null,
    active: true, phone: '0967-890-123', startDate: '2023-05-15',
    schedule: { workDays: [1,2,3,4,5], startTime: '09:00', endTime: '18:00' },
    isFieldWorker: true,
  },
  {
    id: 'emp007', name: '劉依芳', storeId: 'jingzhong', role: '計時員工',
    type: 'hourly', monthlySalary: null, hourlyRate: 183,
    active: true, phone: '0978-901-234', startDate: '2024-08-01',
    schedule: { workDays: [2,4,6], startTime: '12:00', endTime: '20:00' },
    isFieldWorker: false,
  },
]

// ─── 初始出勤紀錄 ─────────────────────────────────────────────────────────────
export const INITIAL_ATTENDANCE = [
  { id: 'att001', employeeId: 'emp001', date: today, clockIn: '07:58', clockOut: null, storeId: 'jingzhong', status: 'normal', method: 'GPS+IP', gpsAccuracy: 12, lat: 24.1535, lng: 120.6834, ip: '192.168.10.45', note: '' },
  { id: 'att002', employeeId: 'emp002', date: today, clockIn: '08:15', clockOut: null, storeId: 'jingzhong', status: 'late',   method: 'GPS',    gpsAccuracy: 8,  lat: 24.1537, lng: 120.6831, ip: '192.168.10.46', note: '塞車遲到' },
  { id: 'att003', employeeId: 'emp003', date: today, clockIn: '08:28', clockOut: null, storeId: 'beitun',    status: 'normal', method: 'IP',     gpsAccuracy: null, lat: null, lng: null, ip: '192.168.20.10', note: '' },
  { id: 'att004', employeeId: 'emp005', date: today, clockIn: '09:02', clockOut: null, storeId: 'nanqu',     status: 'slight_late', method: 'GPS+IP', gpsAccuracy: 15, lat: 24.1108, lng: 120.6762, ip: '192.168.30.22', note: '' },
  { id: 'att005', employeeId: 'emp001', date: yesterday, clockIn: '07:55', clockOut: '17:05', storeId: 'jingzhong', status: 'normal', method: 'GPS+IP', gpsAccuracy: 10, lat: 24.1535, lng: 120.6834, ip: '192.168.10.45', note: '' },
  { id: 'att006', employeeId: 'emp002', date: yesterday, clockIn: '08:05', clockOut: '17:15', storeId: 'jingzhong', status: 'normal', method: 'GPS',    gpsAccuracy: 9,  lat: 24.1536, lng: 120.6835, ip: '192.168.10.46', note: '' },
  { id: 'att007', employeeId: 'emp003', date: yesterday, clockIn: '08:30', clockOut: '17:30', storeId: 'beitun',    status: 'normal', method: 'IP',     gpsAccuracy: null, lat: null, lng: null, ip: '192.168.20.10', note: '' },
  { id: 'att008', employeeId: 'emp007', date: yesterday, clockIn: '12:00', clockOut: '20:15', storeId: 'jingzhong', status: 'normal', method: 'GPS+IP', gpsAccuracy: 11, lat: 24.1534, lng: 120.6833, ip: '192.168.10.47', note: '' },
]

// ─── 初始假別設定 ─────────────────────────────────────────────────────────────
export const INITIAL_LEAVE_TYPES = [
  { id: 'lt001', name: '特休假', daysPerYear: 7,  color: '#16a34a', description: '依年資累積，未休可遞延' },
  { id: 'lt002', name: '病假',   daysPerYear: 30, color: '#ef4444', description: '有診斷書可請，前3天全薪' },
  { id: 'lt003', name: '事假',   daysPerYear: 14, color: '#f59e0b', description: '不給薪，需提前申請' },
  { id: 'lt004', name: '婚假',   daysPerYear: 8,  color: '#ec4899', description: '結婚前後 30 天內申請' },
  { id: 'lt005', name: '喪假',   daysPerYear: 8,  color: '#6b7280', description: '依親疏關係 3-8 天' },
  { id: 'lt006', name: '產假',   daysPerYear: 56, color: '#8b5cf6', description: '生產前後，全薪' },
  { id: 'lt007', name: '陪產假', daysPerYear: 7,  color: '#0ea5e9', description: '配偶分娩後 6 個月內' },
  { id: 'lt008', name: '員工福利假', daysPerYear: 3, color: '#10b981', description: '公司自訂：生日當月可請' },
]

// ─── 初始假別額度 ─────────────────────────────────────────────────────────────
export function generateInitialQuotas(employees, leaveTypes) {
  const quotas = []
  for (const emp of employees) {
    for (const lt of leaveTypes) {
      // 年資加成特休
      let allotted = lt.daysPerYear
      if (lt.id === 'lt001') {
        const years = Math.floor((Date.now() - new Date(emp.startDate)) / (365.25 * 86400000))
        if (years >= 3) allotted = 10
        if (years >= 5) allotted = 14
        if (years >= 10) allotted = 21
      }
      quotas.push({
        id: `q_${emp.id}_${lt.id}`,
        employeeId: emp.id,
        leaveTypeId: lt.id,
        year: new Date().getFullYear(),
        allotted,
        used: Math.floor(Math.random() * 3), // demo 隨機已用
        pending: 0,
      })
    }
  }
  return quotas
}

// ─── 初始外勤回報 ─────────────────────────────────────────────────────────────
export const INITIAL_FIELD_REPORTS = [
  {
    id: 'fr001',
    employeeId: 'emp006',
    date: today,
    time: '10:30',
    title: '客戶拜訪－全家便利超商南屯店',
    description: '確認咖啡機設備安裝進度，已完成80%，預計明日完工',
    location: '台中市南屯區文心路',
    lat: 24.1350,
    lng: 120.6540,
    status: 'in_progress',
    photos: [],
    followUp: '明日確認完工並拍照存檔',
  },
]

// ─── 初始化所有資料到 localStorage ──────────────────────────────────────────
export function initializeData() {
  const keys = {
    tq_employees:     INITIAL_EMPLOYEES,
    tq_attendance:    INITIAL_ATTENDANCE,
    tq_leave_types:   INITIAL_LEAVE_TYPES,
    tq_leave_records: [],
    tq_field_reports: INITIAL_FIELD_REPORTS,
    tq_payroll:       [],
  }
  for (const [key, val] of Object.entries(keys)) {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(val))
    }
  }
  // 假別額度需依員工與假別動態產生
  if (!localStorage.getItem('tq_leave_quota')) {
    const quotas = generateInitialQuotas(INITIAL_EMPLOYEES, INITIAL_LEAVE_TYPES)
    localStorage.setItem('tq_leave_quota', JSON.stringify(quotas))
  }
}
