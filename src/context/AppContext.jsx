import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  EmployeeStore, AttendanceStore, LeaveTypeStore,
  LeaveRecordStore, LeaveQuotaStore, FieldReportStore, PayrollStore, genId,
} from '../utils/storageUtils'
import { initializeData } from '../data/initialData'
import { calcAttendanceStatus } from '../utils/scheduleUtils'
import { format } from 'date-fns'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  useEffect(() => { initializeData() }, [])

  const [employees,    setEmployees]    = useState(() => EmployeeStore.getAll())
  const [attendance,   setAttendance]   = useState(() => AttendanceStore.getAll())
  const [leaveTypes,   setLeaveTypes]   = useState(() => LeaveTypeStore.getAll())
  const [leaveRecords, setLeaveRecords] = useState(() => LeaveRecordStore.getAll())
  const [leaveQuotas,  setLeaveQuotas]  = useState(() => LeaveQuotaStore.getAll())
  const [fieldReports, setFieldReports] = useState(() => FieldReportStore.getAll())
  const [payrolls,     setPayrolls]     = useState(() => PayrollStore.getAll())
  const [currentUser,  setCurrentUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('tq_current_user')) } catch { return null }
  })

  // ── 員工 ──────────────────────────────────────────────────────────────────
  const saveEmployee = useCallback((emp) => {
    const item = { ...emp, id: emp.id || genId() }
    EmployeeStore.save(item)
    setEmployees(EmployeeStore.getAll())
    return item
  }, [])

  const removeEmployee = useCallback((id) => {
    EmployeeStore.remove(id)
    setEmployees(EmployeeStore.getAll())
  }, [])

  // ── 打卡 ──────────────────────────────────────────────────────────────────
  const clockIn = useCallback((employeeId, storeId, extra = {}) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const time  = format(new Date(), 'HH:mm')
    const existing = AttendanceStore.getAll().find(
      (r) => r.employeeId === employeeId && r.date === today
    )
    if (existing?.clockIn) return { error: '今日已打上班卡' }

    const emp    = EmployeeStore.findById(employeeId)
    const status = calcAttendanceStatus(time, storeId, emp?.schedule?.startTime)
    const record = { id: genId(), employeeId, date: today, clockIn: time, clockOut: null, storeId, status, ...extra }
    AttendanceStore.save(record)
    setAttendance(AttendanceStore.getAll())
    return { success: true, record }
  }, [])

  const clockOut = useCallback((employeeId, extra = {}) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const time  = format(new Date(), 'HH:mm')
    const rec   = AttendanceStore.getAll().find((r) => r.employeeId === employeeId && r.date === today)
    if (!rec)        return { error: '尚未打上班卡' }
    if (rec.clockOut) return { error: '今日已打下班卡' }
    const updated = { ...rec, clockOut: time, ...extra }
    AttendanceStore.save(updated)
    setAttendance(AttendanceStore.getAll())
    return { success: true, record: updated }
  }, [])

  const saveAttendance = useCallback((record) => {
    const item = { ...record, id: record.id || genId() }
    AttendanceStore.save(item)
    setAttendance(AttendanceStore.getAll())
    return item
  }, [])

  // ── 假別 ──────────────────────────────────────────────────────────────────
  const saveLeaveType = useCallback((lt) => {
    const item = { ...lt, id: lt.id || genId() }
    LeaveTypeStore.save(item)
    setLeaveTypes(LeaveTypeStore.getAll())
    return item
  }, [])

  const removeLeaveType = useCallback((id) => {
    LeaveTypeStore.remove(id)
    setLeaveTypes(LeaveTypeStore.getAll())
  }, [])

  const applyLeave = useCallback((record) => {
    const item = { ...record, id: record.id || genId(), appliedAt: new Date().toISOString(), status: 'pending' }
    LeaveRecordStore.save(item)
    // 設定 pending 額度
    const quotaId = `q_${record.employeeId}_${record.leaveTypeId}`
    const quota   = LeaveQuotaStore.findById(quotaId)
    if (quota) {
      LeaveQuotaStore.save({ ...quota, pending: (quota.pending || 0) + record.days })
      setLeaveQuotas(LeaveQuotaStore.getAll())
    }
    setLeaveRecords(LeaveRecordStore.getAll())
    return item
  }, [])

  const approveLeave = useCallback((recordId, approved, note = '') => {
    const rec = LeaveRecordStore.findById(recordId)
    if (!rec) return
    const updated = { ...rec, status: approved ? 'approved' : 'rejected', approvalNote: note, approvedAt: new Date().toISOString() }
    LeaveRecordStore.save(updated)
    const quotaId = `q_${rec.employeeId}_${rec.leaveTypeId}`
    const quota   = LeaveQuotaStore.findById(quotaId)
    if (quota) {
      const pendingDelta = Math.min(quota.pending || 0, rec.days)
      LeaveQuotaStore.save({
        ...quota,
        pending: quota.pending - pendingDelta,
        used: approved ? quota.used + rec.days : quota.used,
      })
      setLeaveQuotas(LeaveQuotaStore.getAll())
    }
    setLeaveRecords(LeaveRecordStore.getAll())
  }, [])

  // ── 外勤 ──────────────────────────────────────────────────────────────────
  const saveFieldReport = useCallback((report) => {
    const item = { ...report, id: report.id || genId(), createdAt: report.createdAt || new Date().toISOString() }
    FieldReportStore.save(item)
    setFieldReports(FieldReportStore.getAll())
    return item
  }, [])

  // ── 薪資 ──────────────────────────────────────────────────────────────────
  const savePayroll = useCallback((record) => {
    const item = { ...record, id: record.id || genId() }
    PayrollStore.save(item)
    setPayrolls(PayrollStore.getAll())
    return item
  }, [])

  // ── 身份 ──────────────────────────────────────────────────────────────────
  const login = useCallback((employeeId, sessionRole = 'staff') => {
    const emp = EmployeeStore.findById(employeeId)
    if (!emp) return { error: '找不到員工資料' }
    const user = { ...emp, sessionRole }
    localStorage.setItem('tq_current_user', JSON.stringify(user))
    setCurrentUser(user)
    return { success: true, user }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('tq_current_user')
    setCurrentUser(null)
  }, [])

  const value = {
    employees, attendance, leaveTypes, leaveRecords, leaveQuotas, fieldReports, payrolls, currentUser,
    saveEmployee, removeEmployee,
    clockIn, clockOut, saveAttendance,
    saveLeaveType, removeLeaveType, applyLeave, approveLeave,
    saveFieldReport,
    savePayroll,
    login, logout,
    reloadAttendance:   () => setAttendance(AttendanceStore.getAll()),
    reloadEmployees:    () => setEmployees(EmployeeStore.getAll()),
    reloadFieldReports: () => setFieldReports(FieldReportStore.getAll()),
    reloadLeaveQuotas:  () => setLeaveQuotas(LeaveQuotaStore.getAll()),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
