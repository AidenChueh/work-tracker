export type OvertimeTier = { afterHours: number; rate: number };

export type JobBase = {
  hourlyRate: number | null;
  taxEnabled: boolean;
  breakDuration: number | null;
  breakRate: number | null;
  overtimeTiers: OvertimeTier[];
};

export type BreakBase = {
  startTime: string;
  endTime: string | null;
  isPaid: boolean;
};

export type SessionBase = {
  clockIn: string;
  clockOut: string | null;
  job: JobBase;
  breaks: BreakBase[];
};

export function calcSessionGross(session: SessionBase): number | null {
  if (!session.clockOut || session.job.hourlyRate == null) return null;
  const { hourlyRate, breakDuration, breakRate, overtimeTiers } = session.job;

  const totalMs = new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime();
  // Manual unpaid breaks (tracked per-session)
  const manualUnpaidMs = session.breaks
    .filter((b) => !b.isPaid && b.endTime)
    .reduce((sum, b) => sum + (new Date(b.endTime!).getTime() - new Date(b.startTime).getTime()), 0);
  // Job-level fixed break (set on job, applied automatically)
  const jobBreakMs = (breakDuration ?? 0) * 60000;
  const workingHours = (totalMs - manualUnpaidMs - jobBreakMs) / 3600000;

  // Multi-tier overtime
  const sorted = [...overtimeTiers].sort((a, b) => a.afterHours - b.afterHours);
  const breakpoints = [0, ...sorted.map((t) => t.afterHours)];
  const ratesPerSegment = [hourlyRate, ...sorted.map((t) => t.rate)];

  let workGross = 0;
  for (let i = 0; i < breakpoints.length; i++) {
    const from = breakpoints[i];
    if (workingHours <= from) break;
    const to = i + 1 < breakpoints.length ? breakpoints[i + 1] : workingHours;
    workGross += (Math.min(workingHours, to) - from) * ratesPerSegment[i];
  }

  // Job-level break pay (separate from working hours)
  const breakGross = breakRate != null ? (jobBreakMs / 3600000) * breakRate : 0;
  return workGross + breakGross;
}

export function calcSessionIncome(session: SessionBase, taxRate: number): number | null {
  const gross = calcSessionGross(session);
  if (gross === null) return null;
  return session.job.taxEnabled && taxRate > 0 ? gross * (1 - taxRate / 100) : gross;
}
