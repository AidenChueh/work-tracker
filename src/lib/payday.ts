type Job = {
  id: string;
  hourlyRate: number | null;
  payFrequency: string;
  payDay: number | null;
  payWeekStart: number | null;
  createdAt: string;
};

type WorkSession = {
  jobId: string;
  clockIn: string;
  clockOut: string | null;
};

export function getNextPayday(job: Job): Date | null {
  const now = new Date();

  switch (job.payFrequency) {
    case "weekly": {
      if (job.payDay === null) return null;
      const dayOfWeek = now.getDay();
      let daysUntil = job.payDay - dayOfWeek;
      if (daysUntil <= 0) daysUntil += 7;
      const next = new Date(now);
      next.setDate(now.getDate() + daysUntil);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    case "bi_weekly": {
      const anchor = new Date(job.createdAt);
      anchor.setHours(0, 0, 0, 0);
      if (job.payDay != null) {
        const anchorDow = anchor.getDay();
        const offset = (job.payDay - anchorDow + 7) % 7;
        anchor.setDate(anchor.getDate() + offset);
      }
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const daysSinceAnchor = Math.floor((today.getTime() - anchor.getTime()) / 86400000);
      if (daysSinceAnchor < 0) return anchor;
      const daysIntoCycle = daysSinceAnchor % 14;
      const daysUntilNext = daysIntoCycle === 0 ? 14 : 14 - daysIntoCycle;
      const next = new Date(today);
      next.setDate(today.getDate() + daysUntilNext);
      return next;
    }
    case "monthly": {
      if (job.payDay === null) return null;
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), job.payDay!);
      if (thisMonth > now) return thisMonth;
      return new Date(now.getFullYear(), now.getMonth() + 1, job.payDay!);
    }
    default:
      return null;
  }
}

export function getPayPeriodStart(job: Job): Date | null {
  const next = getNextPayday(job);
  if (!next) return null;

  switch (job.payFrequency) {
    case "weekly":
    case "bi_weekly": {
      const periodDays = job.payFrequency === "bi_weekly" ? 14 : 7;
      if (job.payWeekStart != null) {
        const periodEndDow = (job.payWeekStart - 1 + 7) % 7;
        const nextDow = next.getDay();
        const daysFromPeriodEndToPayday = (nextDow - periodEndDow + 7) % 7 || 7;
        const periodEnd = new Date(next);
        periodEnd.setDate(next.getDate() - daysFromPeriodEndToPayday);
        const start = new Date(periodEnd);
        start.setDate(periodEnd.getDate() - (periodDays - 1));
        return start;
      }
      const start = new Date(next);
      start.setDate(start.getDate() - periodDays);
      return start;
    }
    case "monthly": {
      if (job.payDay === null) return null;
      const now = new Date();
      const thisMonthPayday = new Date(now.getFullYear(), now.getMonth(), job.payDay);
      if (thisMonthPayday <= now) return thisMonthPayday;
      return new Date(now.getFullYear(), now.getMonth() - 1, job.payDay);
    }
    default:
      return null;
  }
}

export function calculateHoursInPeriod(
  sessions: WorkSession[],
  periodStart: Date,
  jobId: string
): number {
  const totalMs = sessions
    .filter((s) => s.jobId === jobId && s.clockOut && new Date(s.clockIn) >= periodStart)
    .reduce(
      (acc, s) => acc + (new Date(s.clockOut!).getTime() - new Date(s.clockIn).getTime()),
      0
    );
  return totalMs / 3600000;
}

export function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}
