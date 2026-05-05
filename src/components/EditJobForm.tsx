"use client";

import { useState, useEffect, useRef } from "react";

type OvertimeTier = { afterHours: string; rate: string };

type Job = {
  id: string;
  name: string;
  hourlyRate: number | null;
  commissionPercentage: number | null;
  commissionRequired: boolean;
  payFrequency: string;
  payDay: number | null;
  payWeekStart: number | null;
  taxEnabled: boolean;
  overtimeTiers: { id: string; afterHours: number; rate: number }[];
  breakDuration: number | null;
  breakRate: number | null;
  penaltyRatesEnabled: boolean;
  publicHolidayRate: number;
  saturdayRate: number;
  sundayRate: number;
  saturdayHourlyRate: number | null;
  sundayHourlyRate: number | null;
  publicHolidayHourlyRate: number | null;
  scheduleType: string;
  fixedClockIn: string | null;
  fixedClockOut: string | null;
  createdAt: string;
};

type Props = {
  job: Job;
  deviceId: string;
  onSaved: (job: Job) => void;
  onCancel: () => void;
  onDeleted: (jobId: string) => void;
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-blue-600" : "bg-gray-600"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function fmtCalc(base: string, mult: string): string {
  const b = parseFloat(base);
  const m = parseFloat(mult);
  if (isNaN(b) || isNaN(m) || b <= 0 || m <= 0) return "";
  return (b * m).toFixed(2).replace(/\.?0+$/, "");
}

export function EditJobForm({ job, deviceId, onSaved, onCancel, onDeleted }: Props) {
  const [name, setName] = useState(job.name);
  const [payType, setPayType] = useState<"hourly" | "commission">(
    job.hourlyRate != null ? "hourly" : "commission"
  );
  const [hourlyRate, setHourlyRate] = useState(job.hourlyRate?.toString() ?? "");
  const [commissionPercentage, setCommissionPercentage] = useState(
    job.commissionPercentage != null ? (job.commissionPercentage * 100).toString() : ""
  );
  const [commissionRequired, setCommissionRequired] = useState(job.commissionRequired);
  const [scheduleType, setScheduleType] = useState<"flexible" | "fixed">(
    job.scheduleType === "fixed" ? "fixed" : "flexible"
  );
  const [fixedClockIn, setFixedClockIn] = useState(job.fixedClockIn ?? "09:00");
  const [fixedClockOut, setFixedClockOut] = useState(job.fixedClockOut ?? "17:00");
  const [payFrequency, setPayFrequency] = useState(job.payFrequency);
  const [payDay, setPayDay] = useState(job.payDay?.toString() ?? "");
  const [payWeekStart, setPayWeekStart] = useState(job.payWeekStart?.toString() ?? "");
  const [taxEnabled, setTaxEnabled] = useState(job.taxEnabled);
  const [overtimeTiers, setOvertimeTiers] = useState<OvertimeTier[]>(
    job.overtimeTiers.map((t) => ({ afterHours: t.afterHours.toString(), rate: t.rate.toString() }))
  );
  const [hasBreak, setHasBreak] = useState(job.breakDuration != null);
  const [breakDuration, setBreakDuration] = useState(job.breakDuration?.toString() ?? "");
  const [breakRate, setBreakRate] = useState(job.breakRate?.toString() ?? "");
  const [penaltyRatesEnabled, setPenaltyRatesEnabled] = useState(job.penaltyRatesEnabled);
  const [publicHolidayRate, setPublicHolidayRate] = useState(job.publicHolidayRate.toString());
  const [saturdayRate, setSaturdayRate] = useState(job.saturdayRate.toString());
  const [sundayRate, setSundayRate] = useState(job.sundayRate.toString());
  const [saturdayHourlyRate, setSaturdayHourlyRate] = useState(job.saturdayHourlyRate?.toString() ?? "");
  const [sundayHourlyRate, setSundayHourlyRate] = useState(job.sundayHourlyRate?.toString() ?? "");
  const [publicHolidayHourlyRate, setPublicHolidayHourlyRate] = useState(job.publicHolidayHourlyRate?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initRef = useRef(true);

  useEffect(() => {
    if (initRef.current) return;
    setSaturdayHourlyRate(fmtCalc(hourlyRate, saturdayRate));
  }, [hourlyRate, saturdayRate]);
  useEffect(() => {
    if (initRef.current) return;
    setSundayHourlyRate(fmtCalc(hourlyRate, sundayRate));
  }, [hourlyRate, sundayRate]);
  useEffect(() => {
    if (initRef.current) return;
    setPublicHolidayHourlyRate(fmtCalc(hourlyRate, publicHolidayRate));
  }, [hourlyRate, publicHolidayRate]);
  useEffect(() => { initRef.current = false; }, []);

  const addTier = () => setOvertimeTiers((prev) => [...prev, { afterHours: "", rate: "" }]);
  const removeTier = (i: number) => setOvertimeTiers((prev) => prev.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: keyof OvertimeTier, value: string) =>
    setOvertimeTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify({
        name: name.trim(),
        hourlyRate: payType === "hourly" ? parseFloat(hourlyRate) || null : null,
        commissionPercentage:
          payType === "commission" ? parseFloat(commissionPercentage) / 100 || null : null,
        commissionRequired: payType === "commission" ? commissionRequired : false,
        scheduleType,
        fixedClockIn: scheduleType === "fixed" ? fixedClockIn : null,
        fixedClockOut: scheduleType === "fixed" ? fixedClockOut : null,
        payFrequency,
        payDay: payDay !== "" ? parseInt(payDay) : null,
        payWeekStart: payWeekStart !== "" ? parseInt(payWeekStart) : null,
        taxEnabled,
        overtimeTiers: overtimeTiers
          .filter((t) => t.afterHours !== "" && t.rate !== "")
          .map((t) => ({ afterHours: parseFloat(t.afterHours), rate: parseFloat(t.rate) })),
        breakDuration: hasBreak ? parseInt(breakDuration) || null : null,
        breakRate: hasBreak ? parseFloat(breakRate) || null : null,
        penaltyRatesEnabled,
        publicHolidayRate: parseFloat(publicHolidayRate) || 2.5,
        saturdayRate: parseFloat(saturdayRate) || 1.5,
        sundayRate: parseFloat(sundayRate) || 2.0,
        saturdayHourlyRate: saturdayHourlyRate ? parseFloat(saturdayHourlyRate) : null,
        sundayHourlyRate: sundayHourlyRate ? parseFloat(sundayHourlyRate) : null,
        publicHolidayHourlyRate: publicHolidayHourlyRate ? parseFloat(publicHolidayHourlyRate) : null,
      }),
    });

    if (res.ok) onSaved(await res.json());
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`確定要刪除「${job.name}」嗎？\n相關的打卡紀錄也會一併刪除，且無法復原。`)) return;
    setDeleting(true);
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "DELETE",
      headers: { "x-device-id": deviceId },
    });
    if (res.ok) onDeleted(job.id);
    setDeleting(false);
  };

  const showWeekdaySelector = payFrequency === "weekly" || payFrequency === "bi_weekly";

  return (
    <form onSubmit={handleSubmit} className="bg-gray-700 rounded-2xl p-4 mt-2 space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">工作名稱</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">薪資類型</label>
        <div className="flex gap-2">
          {(["hourly", "commission"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPayType(type)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${
                payType === type ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-300"
              }`}
            >
              {type === "hourly" ? "時薪" : "抽成"}
            </button>
          ))}
        </div>
      </div>

      {payType === "hourly" && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">時薪（$）</label>
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {payType === "commission" && (
        <>
          <div>
            <label className="block text-xs text-gray-400 mb-1">抽成比例（%）</label>
            <input
              type="number"
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="10"
              min="0"
              max="100"
              step="0.1"
              className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-400">下班需填業績（必填）</span>
            <Toggle checked={commissionRequired} onChange={() => setCommissionRequired((v) => !v)} />
          </div>
        </>
      )}

      <div>
        <label className="block text-xs text-gray-400 mb-1">班表類型</label>
        <div className="flex gap-2">
          {(["flexible", "fixed"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setScheduleType(type)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${
                scheduleType === type ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-300"
              }`}
            >
              {type === "flexible" ? "彈性" : "固定"}
            </button>
          ))}
        </div>
        {scheduleType === "fixed" && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="min-w-0">
              <label className="block text-[10px] text-gray-400 mb-1">固定上班</label>
              <input
                type="time"
                value={fixedClockIn}
                onChange={(e) => setFixedClockIn(e.target.value)}
                className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-[10px] text-gray-400 mb-1">固定下班</label>
              <input
                type="time"
                value={fixedClockOut}
                onChange={(e) => setFixedClockOut(e.target.value)}
                className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">發薪頻率</label>
        <select
          value={payFrequency}
          onChange={(e) => { setPayFrequency(e.target.value); setPayDay(""); setPayWeekStart(""); }}
          className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="weekly">每週</option>
          <option value="bi_weekly">每兩週</option>
          <option value="monthly">每月</option>
        </select>
      </div>

      {showWeekdaySelector && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">發薪日（星期幾）</label>
          <select
            value={payDay}
            onChange={(e) => setPayDay(e.target.value)}
            className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">選擇星期</option>
            {WEEKDAYS.map((day, i) => (
              <option key={i} value={i}>星期{day}</option>
            ))}
          </select>
        </div>
      )}

      {showWeekdaySelector && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">計薪週起始日（選填）</label>
          <select
            value={payWeekStart}
            onChange={(e) => setPayWeekStart(e.target.value)}
            className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">預設（依發薪日往前推算）</option>
            {WEEKDAYS.map((day, i) => (
              <option key={i} value={i}>星期{day}</option>
            ))}
          </select>
          <p className="text-[10px] text-gray-500 mt-0.5">例如：星期四 → 計薪週為四到三</p>
        </div>
      )}

      {payFrequency === "monthly" && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">發薪日（幾號）</label>
          <input
            type="number"
            value={payDay}
            onChange={(e) => setPayDay(e.target.value)}
            onFocus={(e) => e.target.select()}
            min="1"
            max="31"
            placeholder="15"
            className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {payType === "hourly" && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">加班費設定</span>
              <button
                type="button"
                onClick={addTier}
                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-0.5 bg-blue-500/10 rounded-lg transition-colors"
              >
                + 新增區間
              </button>
            </div>
            {overtimeTiers.length > 0 && (
              <div className="space-y-2">
                {overtimeTiers.map((tier, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="flex-1 min-w-0">
                      <input
                        type="number"
                        value={tier.afterHours}
                        onChange={(e) => updateTier(i, "afterHours", e.target.value)}
                        placeholder="8"
                        min="0"
                        step="0.5"
                        className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-gray-500 ml-1">小時後</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="number"
                        value={tier.rate}
                        onChange={(e) => updateTier(i, "rate", e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-gray-500 ml-1">$/hr</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className="text-gray-500 hover:text-red-400 text-lg leading-none px-1 pb-4"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-400">有休息時間</span>
            <Toggle checked={hasBreak} onChange={() => setHasBreak((v) => !v)} />
          </div>
          {hasBreak && (
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-gray-400 mb-1">休息（分鐘）</label>
                <input
                  type="number"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="30"
                  min="0"
                  step="1"
                  className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-gray-400 mb-1">休息時薪（選填）</label>
                <input
                  type="number"
                  value={breakRate}
                  onChange={(e) => setBreakRate(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="不填為無薪"
                  min="0"
                  step="0.01"
                  className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Penalty Rates */}
          <div className="border-t border-gray-600/50 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs text-gray-300">澳洲 Penalty Rates</span>
                <p className="text-[10px] text-gray-500 mt-0.5">假日薪資加乘</p>
              </div>
              <Toggle checked={penaltyRatesEnabled} onChange={() => setPenaltyRatesEnabled((v) => !v)} />
            </div>
            {penaltyRatesEnabled && (
              <div className="space-y-3 mt-2 bg-gray-600/40 rounded-lg p-2.5">
                <p className="text-[10px] text-gray-500">時薪會依倍率自動計算，可手動修改</p>
                {[
                  { label: "週六", rateVal: saturdayRate, rateSet: setSaturdayRate, hourlyVal: saturdayHourlyRate, hourlySet: setSaturdayHourlyRate },
                  { label: "週日", rateVal: sundayRate, rateSet: setSundayRate, hourlyVal: sundayHourlyRate, hourlySet: setSundayHourlyRate },
                  { label: "國定假日", rateVal: publicHolidayRate, rateSet: setPublicHolidayRate, hourlyVal: publicHolidayHourlyRate, hourlySet: setPublicHolidayHourlyRate },
                ].map(({ label, rateVal, rateSet, hourlyVal, hourlySet }) => (
                  <div key={label}>
                    <span className="text-xs text-gray-300 block mb-1">{label}</span>
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0 flex items-center gap-1">
                        <input
                          type="number"
                          value={rateVal}
                          onChange={(e) => rateSet(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          min="1"
                          step="0.1"
                          className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-500 shrink-0">× 倍</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="number"
                          value={hourlyVal}
                          onChange={(e) => hourlySet(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          placeholder="$/hr"
                          min="0"
                          step="0.01"
                          className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-2 py-1.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-gray-400">扣稅</span>
        <Toggle checked={taxEnabled} onChange={() => setTaxEnabled((v) => !v)} />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg bg-gray-600 text-gray-300 hover:bg-gray-500 text-sm transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "儲存中..." : "儲存"}
        </button>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="w-full text-xs text-red-400 hover:text-red-300 py-1 transition-colors disabled:opacity-50"
      >
        {deleting ? "刪除中..." : "刪除此工作"}
      </button>
    </form>
  );
}
