export type AttendanceTrendRecord = { recordedAt: Date; status: "present" | "absent" | "late" | "excused" };
export type ProgressTrendRecord = { recordedAt: Date; pointsAwarded: number };

function weekStart(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

export function buildStudentTrend(input: { attendance: AttendanceTrendRecord[]; progress: ProgressTrendRecord[]; weeks: number; now?: Date }) {
  const now = input.now ?? new Date();
  const currentWeek = weekStart(now);
  const output = Array.from({ length: input.weeks }, (_, offset) => {
    const start = new Date(currentWeek);
    start.setUTCDate(start.getUTCDate() - (input.weeks - 1 - offset) * 7);
    return { key: start.toISOString().slice(0, 10), weekStart: start, present: 0, attendanceTotal: 0, progressCount: 0, points: 0 };
  });
  const indexByWeek = new Map(output.map((point, index) => [point.key, index]));
  input.attendance.forEach(record => {
    const index = indexByWeek.get(weekStart(record.recordedAt).toISOString().slice(0, 10));
    if (index === undefined) return;
    output[index].attendanceTotal += 1;
    if (record.status === "present") output[index].present += 1;
  });
  input.progress.forEach(record => {
    const index = indexByWeek.get(weekStart(record.recordedAt).toISOString().slice(0, 10));
    if (index === undefined) return;
    output[index].progressCount += 1;
    output[index].points += record.pointsAwarded;
  });
  return output;
}
