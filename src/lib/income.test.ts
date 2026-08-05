import { describe, it, expect } from "vitest";
import { calcSessionGross, calcSessionIncome, effectiveWorkMs, type JobBase, type SessionBase } from "./income";

function makeJob(overrides: Partial<JobBase> = {}): JobBase {
  return {
    hourlyRate: 20,
    commissionPercentage: null,
    taxEnabled: false,
    breakDuration: null,
    breakRate: null,
    overtimeTiers: [],
    penaltyRatesEnabled: false,
    publicHolidayRate: 2.5,
    saturdayRate: 1.5,
    sundayRate: 2.0,
    saturdayHourlyRate: null,
    sundayHourlyRate: null,
    publicHolidayHourlyRate: null,
    ...overrides,
  };
}

// 產生指定星期幾、指定時刻的 ISO 字串（以本地時區建構，getDay() 結果不受測試機器時區影響）
function isoAt(weekday: number, hour: number, minute = 0): string {
  const d = new Date(2026, 5, 1, hour, minute, 0, 0);
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  return d.toISOString();
}

function makeSession(overrides: Partial<SessionBase> = {}): SessionBase {
  return {
    clockIn: isoAt(3, 9),
    clockOut: isoAt(3, 17),
    job: makeJob(),
    breaks: [],
    isPublicHoliday: false,
    dailyRevenue: null,
    ...overrides,
  };
}

describe("effectiveWorkMs — 平均工時的計算基礎", () => {
  const HOUR = 3600000;

  it("9:00–17:00 = 8 小時", () => {
    expect(effectiveWorkMs(makeSession())).toBe(8 * HOUR);
  });

  it("跨夜班 22:00 到隔日 02:00 = 4 小時", () => {
    const clockIn = new Date(2026, 5, 3, 22, 0, 0, 0);
    const clockOut = new Date(2026, 5, 4, 2, 0, 0, 0);
    expect(
      effectiveWorkMs(makeSession({ clockIn: clockIn.toISOString(), clockOut: clockOut.toISOString() }))
    ).toBe(4 * HOUR);
  });

  it("扣除工作預設休息 30 分後為 7.5 小時", () => {
    expect(effectiveWorkMs(makeSession({ job: makeJob({ breakDuration: 30 }) }))).toBe(7.5 * HOUR);
  });

  it("breakMinutes 覆寫工作預設休息", () => {
    expect(
      effectiveWorkMs(makeSession({ job: makeJob({ breakDuration: 30 }), breakMinutes: 60 }))
    ).toBe(7 * HOUR);
  });

  it("未下班回傳 null（不納入平均工時）", () => {
    expect(effectiveWorkMs(makeSession({ clockOut: null }))).toBeNull();
  });
});

describe("calcSessionGross — 基本時薪", () => {
  it("8 小時 × $20 = $160", () => {
    expect(calcSessionGross(makeSession())).toBe(160);
  });

  it("未下班（clockOut 為 null）回傳 null", () => {
    expect(calcSessionGross(makeSession({ clockOut: null }))).toBeNull();
  });

  it("時薪未設定回傳 null", () => {
    expect(calcSessionGross(makeSession({ job: makeJob({ hourlyRate: null }) }))).toBeNull();
  });
});

describe("calcSessionGross — 休息時間", () => {
  it("工作預設 breakDuration 60 分：(8−1)×20 = $140", () => {
    expect(calcSessionGross(makeSession({ job: makeJob({ breakDuration: 60 }) }))).toBe(140);
  });

  it("breakMinutes 覆寫為 30：(8−0.5)×20 = $150", () => {
    const s = makeSession({ job: makeJob({ breakDuration: 60 }), breakMinutes: 30 });
    expect(calcSessionGross(s)).toBe(150);
  });

  it("breakMinutes 覆寫為 0：不扣休息，8×20 = $160", () => {
    const s = makeSession({ job: makeJob({ breakDuration: 60 }), breakMinutes: 0 });
    expect(calcSessionGross(s)).toBe(160);
  });

  it("breakRate 有薪休息：(8−1)×20 + 1×10 = $150", () => {
    expect(calcSessionGross(makeSession({ job: makeJob({ breakDuration: 60, breakRate: 10 }) }))).toBe(150);
  });

  it("手動無薪休息 30 分：(8−0.5)×20 = $150", () => {
    const s = makeSession({
      breaks: [{ startTime: isoAt(3, 12), endTime: isoAt(3, 12, 30), isPaid: false }],
    });
    expect(calcSessionGross(s)).toBe(150);
  });

  it("手動有薪休息不扣薪：8×20 = $160", () => {
    const s = makeSession({
      breaks: [{ startTime: isoAt(3, 12), endTime: isoAt(3, 12, 30), isPaid: true }],
    });
    expect(calcSessionGross(s)).toBe(160);
  });

  it("休息比工時長時工時歸零，不出現負薪資", () => {
    const s = makeSession({
      clockIn: isoAt(3, 9),
      clockOut: isoAt(3, 10),
      job: makeJob({ breakDuration: 120 }),
    });
    expect(calcSessionGross(s)).toBe(0);
  });
});

describe("calcSessionGross — 加班分級", () => {
  it("10 小時、8 小時後 $30：8×20 + 2×30 = $220", () => {
    const s = makeSession({
      clockIn: isoAt(3, 8),
      clockOut: isoAt(3, 18),
      job: makeJob({ overtimeTiers: [{ afterHours: 8, rate: 30 }] }),
    });
    expect(calcSessionGross(s)).toBe(220);
  });
});

describe("calcSessionGross — 假日加成 (penalty rates)", () => {
  it("週六、倍率 1.5：8×(20×1.5) = $240", () => {
    const s = makeSession({
      clockIn: isoAt(6, 9),
      clockOut: isoAt(6, 17),
      job: makeJob({ penaltyRatesEnabled: true }),
    });
    expect(calcSessionGross(s)).toBe(240);
  });

  it("週六、有指定 saturdayHourlyRate 時優先：8×33 = $264", () => {
    const s = makeSession({
      clockIn: isoAt(6, 9),
      clockOut: isoAt(6, 17),
      job: makeJob({ penaltyRatesEnabled: true, saturdayHourlyRate: 33 }),
    });
    expect(calcSessionGross(s)).toBe(264);
  });

  it("國定假日、倍率 2.5：8×(20×2.5) = $400", () => {
    const s = makeSession({ job: makeJob({ penaltyRatesEnabled: true }), isPublicHoliday: true });
    expect(calcSessionGross(s)).toBe(400);
  });

  it("penaltyRatesEnabled 關閉時，週六仍用原時薪：8×20 = $160", () => {
    const s = makeSession({ clockIn: isoAt(6, 9), clockOut: isoAt(6, 17) });
    expect(calcSessionGross(s)).toBe(160);
  });
});

describe("calcSessionGross — 抽成制", () => {
  it("業績 1000 × 10% = $100", () => {
    const s = makeSession({
      job: makeJob({ hourlyRate: null, commissionPercentage: 0.1 }),
      dailyRevenue: 1000,
    });
    expect(calcSessionGross(s)).toBe(100);
  });

  it("抽成制但無業績資料回傳 null", () => {
    const s = makeSession({
      job: makeJob({ hourlyRate: null, commissionPercentage: 0.1 }),
      dailyRevenue: null,
    });
    expect(calcSessionGross(s)).toBeNull();
  });
});

describe("payRulesSnapshot — 凍結舊規則 (功能 1)", () => {
  it("有快照時用快照時薪，不受工作即時設定影響：8×20 = $160", () => {
    const s = makeSession({
      job: makeJob({ hourlyRate: 30 }),
      payRulesSnapshot: makeJob({ hourlyRate: 20 }),
    });
    expect(calcSessionGross(s)).toBe(160);
  });

  it("沒有快照時用工作即時設定：8×30 = $240", () => {
    const s = makeSession({ job: makeJob({ hourlyRate: 30 }), payRulesSnapshot: null });
    expect(calcSessionGross(s)).toBe(240);
  });

  it("快照也涵蓋加班分級設定", () => {
    const s = makeSession({
      clockIn: isoAt(3, 8),
      clockOut: isoAt(3, 18),
      job: makeJob({ hourlyRate: 99, overtimeTiers: [] }),
      payRulesSnapshot: makeJob({ hourlyRate: 20, overtimeTiers: [{ afterHours: 8, rate: 30 }] }),
    });
    expect(calcSessionGross(s)).toBe(220);
  });
});

describe("calcSessionIncome — 稅", () => {
  it("taxEnabled、稅率 10%：160 × 0.9 = $144", () => {
    const s = makeSession({ job: makeJob({ taxEnabled: true }) });
    expect(calcSessionIncome(s, 10)).toBeCloseTo(144, 5);
  });

  it("taxEnabled 但稅率 0：不扣稅 = $160", () => {
    const s = makeSession({ job: makeJob({ taxEnabled: true }) });
    expect(calcSessionIncome(s, 0)).toBe(160);
  });

  it("taxEnabled 關閉：不扣稅 = $160", () => {
    expect(calcSessionIncome(makeSession(), 10)).toBe(160);
  });

  it("稅也吃快照設定：快照 taxEnabled 為 true 時會扣稅", () => {
    const s = makeSession({
      job: makeJob({ taxEnabled: false }),
      payRulesSnapshot: makeJob({ taxEnabled: true }),
    });
    expect(calcSessionIncome(s, 10)).toBeCloseTo(144, 5);
  });

  it("未下班回傳 null", () => {
    expect(calcSessionIncome(makeSession({ clockOut: null }), 10)).toBeNull();
  });
});
