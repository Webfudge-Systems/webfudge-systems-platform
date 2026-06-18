import { ATTENDANCE_TODAY } from './mock-data/attendance'

/** Scale today's attendance mock to match active roster size */
export function buildAttendanceSnapshot(activeEmployeeCount) {
  const roster = Math.max(0, activeEmployeeCount ?? 0)
  const source =
    ATTENDANCE_TODAY.present +
    ATTENDANCE_TODAY.onLeave +
    ATTENDANCE_TODAY.absent +
    ATTENDANCE_TODAY.wfh

  if (roster === 0 || source === 0) {
    return {
      roster: 0,
      present: 0,
      onLeave: 0,
      wfh: 0,
      absent: 0,
      marked: 0,
      notMarked: 0,
      markedPct: 0,
    }
  }

  const scale = roster / source
  let present = Math.round(ATTENDANCE_TODAY.present * scale)
  let onLeave = Math.round(ATTENDANCE_TODAY.onLeave * scale)
  let wfh = Math.round(ATTENDANCE_TODAY.wfh * scale)
  let absent = Math.max(0, roster - present - onLeave - wfh)

  const marked = present + onLeave + wfh + absent
  const notMarked = Math.max(0, roster - marked)

  if (marked + notMarked > roster) {
    absent = Math.max(0, absent - (marked + notMarked - roster))
  }

  const finalMarked = present + onLeave + wfh + absent

  return {
    roster,
    present,
    onLeave,
    wfh,
    absent,
    marked: finalMarked,
    notMarked,
    markedPct: roster > 0 ? Math.round((finalMarked / roster) * 100) : 0,
  }
}
