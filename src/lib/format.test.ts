import { describe, it, expect, afterEach } from "vitest";
import { formatHoursMinutes } from "./format";
import { setLocale } from "./locale-store";

const MIN = 60000;

afterEach(() => setLocale("zh"));

describe("formatHoursMinutes — 中文", () => {
  it("456 分 → 7 小時 36 分", () => {
    expect(formatHoursMinutes(456 * MIN)).toBe("7 小時 36 分");
  });

  it("整點不顯示分 → 8 小時", () => {
    expect(formatHoursMinutes(480 * MIN)).toBe("8 小時");
  });

  it("不足一小時只顯示分 → 45 分", () => {
    expect(formatHoursMinutes(45 * MIN)).toBe("45 分");
  });

  it("秒數四捨五入到整數分", () => {
    expect(formatHoursMinutes(45 * MIN + 31000)).toBe("46 分");
    expect(formatHoursMinutes(45 * MIN + 29000)).toBe("45 分");
  });
});

describe("formatHoursMinutes — 英文", () => {
  it("456 分 → 7 hr 36 min", () => {
    setLocale("en");
    expect(formatHoursMinutes(456 * MIN)).toBe("7 hr 36 min");
  });

  it("整點 → 8 hr", () => {
    setLocale("en");
    expect(formatHoursMinutes(480 * MIN)).toBe("8 hr");
  });

  it("不足一小時 → 45 min", () => {
    setLocale("en");
    expect(formatHoursMinutes(45 * MIN)).toBe("45 min");
  });
});
