export function startOfIsoWeek(date = new Date()) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7));
  return result;
}

export function buildWeeklySummary(present: number, attendanceTotal: number, progressTotal: number) {
  return `ملخص الأسبوع: ${present} حضور من ${attendanceTotal} جلسات، و${progressTotal} سجل متابعة للحفظ والمراجعة.`;
}
