// ─── 台灣加班費計算規則（依勞基法）────────────────────────────────────────────
// 第1-2小時加班：原薪資 × 4/3
// 第3-4小時加班：原薪資 × 5/3
// 假日加班（1-8小時）：原薪資 × 2
// 假日加班（8小時以上）：原薪資 × 2.5

export const OVERTIME_RATES = {
  first2Hours:  4 / 3,   // ~1.333
  next2Hours:   5 / 3,   // ~1.667
  holidayFirst: 2.0,
  holidayExtra: 2.5,
}

// ─── 每小時薪資計算 ──────────────────────────────────────────────────────────
export function calcHourlyRate(monthlySalary, workDays = 30, hoursPerDay = 8) {
  return monthlySalary / (workDays * hoursPerDay)
}

// ─── 加班費計算（依分鐘數）─────────────────────────────────────────────────
export function calcOvertimePay(overtimeMinutes, hourlyRate, isHoliday = false) {
  if (overtimeMinutes <= 0) return 0

  const overtimeHours = overtimeMinutes / 60
  let pay = 0

  if (isHoliday) {
    const normalHours = Math.min(overtimeHours, 8)
    const extraHours  = Math.max(0, overtimeHours - 8)
    pay = normalHours * hourlyRate * OVERTIME_RATES.holidayFirst
        + extraHours  * hourlyRate * OVERTIME_RATES.holidayExtra
  } else {
    const h1 = Math.min(overtimeHours, 2)
    const h2 = Math.min(Math.max(overtimeHours - 2, 0), 2)
    const h3 = Math.max(overtimeHours - 4, 0)
    pay = h1 * hourlyRate * OVERTIME_RATES.first2Hours
        + h2 * hourlyRate * OVERTIME_RATES.next2Hours
        + h3 * hourlyRate * OVERTIME_RATES.holidayFirst
  }

  return Math.round(pay)
}

// ─── 完整月薪計算（全職 / 兼職 / 計時）──────────────────────────────────────
// employeeType: 'full_time' | 'part_time' | 'hourly'
export function calcMonthlyPayroll(employee, stats) {
  const { workDays, totalWorkHours, totalOvertimeHours, lateCount, absentCount } = stats
  const result = {
    employeeId: employee.id,
    employeeName: employee.name,
    employeeType: employee.type,
    regularPay: 0,
    overtimePay: 0,
    deductions: 0,
    totalPay: 0,
    breakdown: {},
  }

  if (employee.type === 'hourly' || employee.type === 'part_time') {
    // 計時制：實際工時 × 時薪
    const hourlyRate = employee.hourlyRate || 183 // 台灣最低時薪
    const regularHours = Math.max(0, totalWorkHours - totalOvertimeHours)
    result.regularPay   = Math.round(regularHours * hourlyRate)
    result.overtimePay  = calcOvertimePay(totalOvertimeHours * 60, hourlyRate)
    result.breakdown = {
      regularHours,
      overtimeHours: totalOvertimeHours,
      hourlyRate,
      workDays,
    }
  } else {
    // 月薪制：底薪 + 加班費 - 扣款
    const monthlySalary = employee.monthlySalary || 30000
    const hourlyRate    = calcHourlyRate(monthlySalary)
    result.regularPay   = monthlySalary

    // 加班費
    result.overtimePay  = calcOvertimePay(totalOvertimeHours * 60, hourlyRate)

    // 扣款：遲到每次扣 200、曠職每次扣一日薪
    const dailyRate = monthlySalary / 30
    result.deductions = lateCount * 200 + absentCount * dailyRate
    result.breakdown = {
      monthlySalary,
      hourlyRate: +hourlyRate.toFixed(2),
      overtimeHours: totalOvertimeHours,
      lateCount,
      absentCount,
      dailyRate: +dailyRate.toFixed(2),
    }
  }

  result.totalPay = Math.max(0, Math.round(result.regularPay + result.overtimePay - result.deductions))
  return result
}

// ─── 批次計算所有員工月薪 ────────────────────────────────────────────────────
export function batchCalcPayroll(employees, allStats) {
  return employees.map((emp) => {
    const stats = allStats[emp.id] || {
      workDays: 0, totalWorkHours: 0, totalOvertimeHours: 0, lateCount: 0, absentCount: 0,
    }
    return calcMonthlyPayroll(emp, stats)
  })
}
