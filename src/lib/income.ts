export type OvertimeTier = { afterHours: number; rate: number };

export type JobBase = {
  hourlyRate: number | null;
  commissionPercentage: number | null;
  taxEnabled: boolean;
  breakDuration: number | null;
  breakRate: number | null;
  overtimeTiers: OvertimeTier[];
  penaltyRatesEnabled: boolean;
  publicHolidayRate: number;
  saturdayRate: number;
  sundayRate: number;
  saturdayHourlyRate: number | null;
  sundayHourlyRate: number | null;
  publicHolidayHourlyRate: number | null;
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
  payRulesSnapshot?: JobBase | null;
  breakMinutes?: number | null;
  breaks: BreakBase[];
  isPublicHoliday: boolean;
  dailyRevenue: number | null;
};

// 有快照時用快照（凍結當下的薪資規則），否則用工作的即時設定
export function payRules(session: SessionBase): JobBase {
  return session.payRulesSnapshot ?? session.job;
}

function getEffectiveHourlyRate(session: SessionBase): number | null {
  const job = payRules(session);
  if (job.hourlyRate == null) return null;
  if (!job.penaltyRatesEnabled) return job.hourlyRate;
  if (session.isPublicHoliday) {
    return job.publicHolidayHourlyRate ?? job.hourlyRate * job.publicHolidayRate;
  }
  const dow = new Date(session.clockIn).getDay();
  if (dow === 0) return job.sundayHourlyRate ?? job.hourlyRate * job.sundayRate;
  if (dow === 6) return job.saturdayHourlyRate ?? job.hourlyRate * job.saturdayRate;
  return job.hourlyRate;
}

export function calcSessionGross(session: SessionBase): number | null {
  if (!session.clockOut) return null;

  const job = payRules(session);

  if (job.commissionPercentage != null) {
    if (session.dailyRevenue == null) return null;
    return session.dailyRevenue * job.commissionPercentage;
  }

  const effectiveBase = getEffectiveHourlyRate(session);
  if (effectiveBase == null) return null;

  const { breakDuration, breakRate, overtimeTiers } = job;

  const totalMs = new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime();
  const manualUnpaidMs = session.breaks
    .filter((b) => !b.isPaid && b.endTime)
    .reduce((sum, b) => sum + (new Date(b.endTime!).getTime() - new Date(b.startTime).getTime()), 0);
  // breakMinutes 為此筆紀錄的覆寫值，未設定時用工作預設 breakDuration
  const jobBreakMs = (session.breakMinutes ?? breakDuration ?? 0) * 60000;
  const workingHours = Math.max(0, (totalMs - manualUnpaidMs - jobBreakMs) / 3600000);

  const sorted = [...overtimeTiers].sort((a, b) => a.afterHours - b.afterHours);
  const breakpoints = [0, ...sorted.map((t) => t.afterHours)];
  const ratesPerSegment = [effectiveBase, ...sorted.map((t) => t.rate)];

  let workGross = 0;
  for (let i = 0; i < breakpoints.length; i++) {
    const from = breakpoints[i];
    if (workingHours <= from) break;
    const to = i + 1 < breakpoints.length ? breakpoints[i + 1] : workingHours;
    workGross += (Math.min(workingHours, to) - from) * ratesPerSegment[i];
  }

  const breakGross = breakRate != null ? (jobBreakMs / 3600000) * breakRate : 0;
  return workGross + breakGross;
}

export function calcSessionIncome(session: SessionBase, taxRate: number): number | null {
  const gross = calcSessionGross(session);
  if (gross === null) return null;
  return payRules(session).taxEnabled && taxRate > 0 ? gross * (1 - taxRate / 100) : gross;
}
