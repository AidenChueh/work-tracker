"use client";

import { useState } from "react";

type OvertimeTier = { afterHours: string; rate: string };

type Job = {
  id: string;
  name: string;
  hourlyRate: number | null;
  commissionPercentage: number | null;
  commissionRequired: boolean;
  payFrequency: string;
  payDay: number | null;
  taxEnabled: boolean;
  overtimeTiers: { id: string; afterHours: number; rate: number }[];
  breakDuration: number | null;
  breakRate: number | null;
  penaltyRatesEnabled: boolean;
  publicHolidayRate: number;
  saturdayRate: number;
  sundayRate: number;
  createdAt: string;
};

type Props = {
  deviceId: string;
  onJobAdded: (job: Job) => void;
  onCancel?: () => void;
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

export function AddJobForm({ deviceId, onJobAdded, onCancel }: Props) {
  const [name, setName] = useState("");
  const [payType, setPayType] = useState<"hourly" | "commission">("hourly");
  const [hourlyRate, setHourlyRate] = useState("");
  const [commissionPercentage, setCommissionPercentage] = useState("");
  const [commissionRequired, setCommissionRequired] = useState(false);
  const [payFrequency, setPayFrequency] = useState("weekly");
  const [payDay, setPayDay] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [overtimeTiers, setOvertimeTiers] = useState<OvertimeTier[]>([]);
  const [hasBreak, setHasBreak] = useState(false);
  const [breakDuration, setBreakDuration] = useState("");
  const [breakRate, setBreakRate] = useState("");
  const [penaltyRatesEnabled, setPenaltyRatesEnabled] = useState(false);
  const [publicHolidayRate, setPublicHolidayRate] = useState("2.5");
  const [saturdayRate, setSaturdayRate] = useState("1.5");
  const [sundayRate, setSundayRate] = useState("2.0");
  const [submitting, setSubmitting] = useState(false);

  const addTier = () => setOvertimeTiers((prev) => [...prev, { afterHours: "", rate: "" }]);
  const removeTier = (i: number) => setOvertimeTiers((prev) => prev.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: keyof OvertimeTier, value: string) =>
    setOvertimeTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify({
        name: name.trim(),
        hourlyRate: payType === "hourly" ? parseFloat(hourlyRate) || null : null,
        commissionPercentage:
          payType === "commission" ? parseFloat(commissionPercentage) / 100 || null : null,
        commissionRequired: payType === "commission" ? commissionRequired : false,
        payFrequency,
        payDay: payDay !== "" ? parseInt(payDay) : null,
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
      }),
    });

    if (res.ok) {
      const job = await res.json();
      onJobAdded(job);
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-5 mb-4 space-y-4">
      <h3 className="font-semibold text-lg">新增工作</h3>

      <div>
        <label className="block text-sm text-gray-400 mb-1">工作名稱</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：兼職收銀員"
          className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">薪資類型</label>
        <div className="flex gap-2">
          {(["hourly", "commission"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPayType(type)}
              className={`flex-1 py-2 rounded-xl text-sm transition-colors ${
                payType === type ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {type === "hourly" ? "時薪" : "佣金"}
            </button>
          ))}
        </div>
      </div>

      {payType === "hourly" && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">時薪（$）</label>
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {payType === "commission" && (
        <>
          <div>
            <label className="block text-sm text-gray-400 mb-1">佣金比例（%）</label>
            <input
              type="number"
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(e.target.value)}
              placeholder="10"
              min="0"
              max="100"
              step="0.1"
              className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-400">下班需填業績（必填）</span>
            <Toggle checked={commissionRequired} onChange={() => setCommissionRequired((v) => !v)} />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm text-gray-400 mb-1">發薪頻率</label>
        <select
          value={payFrequency}
          onChange={(e) => { setPayFrequency(e.target.value); setPayDay(""); }}
          className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="weekly">每週</option>
          <option value="bi_weekly">每兩週</option>
          <option value="monthly">每月</option>
          <option value="custom">自訂</option>
        </select>
      </div>

      {payFrequency === "weekly" && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">發薪日（星期幾）</label>
          <select
            value={payDay}
            onChange={(e) => setPayDay(e.target.value)}
            className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">選擇星期</option>
            {WEEKDAYS.map((day, i) => (
              <option key={i} value={i}>星期{day}</option>
            ))}
          </select>
        </div>
      )}

      {payFrequency === "monthly" && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">發薪日（幾號）</label>
          <input
            type="number"
            value={payDay}
            onChange={(e) => setPayDay(e.target.value)}
            min="1"
            max="31"
            placeholder="15"
            className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {payType === "hourly" && (
        <>
          {/* Overtime tiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">加班費設定</span>
              <button
                type="button"
                onClick={addTier}
                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-500/10 rounded-lg transition-colors"
              >
                + 新增區間
              </button>
            </div>
            {overtimeTiers.length > 0 && (
              <div className="space-y-2">
                {overtimeTiers.map((tier, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={tier.afterHours}
                        onChange={(e) => updateTier(i, "afterHours", e.target.value)}
                        placeholder="8"
                        min="0"
                        step="0.5"
                        className="w-full bg-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-gray-500 ml-1">小時後</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={tier.rate}
                        onChange={(e) => updateTier(i, "rate", e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full bg-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Break */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-400">有休息時間</span>
            <Toggle checked={hasBreak} onChange={() => setHasBreak((v) => !v)} />
          </div>
          {hasBreak && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">休息時間（分鐘）</label>
                <input
                  type="number"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(e.target.value)}
                  placeholder="30"
                  min="0"
                  step="1"
                  className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">休息時薪（$，選填）</label>
                <input
                  type="number"
                  value={breakRate}
                  onChange={(e) => setBreakRate(e.target.value)}
                  placeholder="不填為無薪"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Penalty Rates */}
      <div className="border-t border-gray-700/50 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm text-gray-300">澳洲 Penalty Rates</span>
            <p className="text-xs text-gray-500 mt-0.5">假日薪資加乘（週六、週日、國定假日）</p>
          </div>
          <Toggle checked={penaltyRatesEnabled} onChange={() => setPenaltyRatesEnabled((v) => !v)} />
        </div>
        {penaltyRatesEnabled && (
          <div className="space-y-2 mt-3 bg-gray-700/40 rounded-xl p-3">
            {[
              { label: "國定假日", value: publicHolidayRate, set: setPublicHolidayRate, default: "2.5" },
              { label: "週六", value: saturdayRate, set: setSaturdayRate, default: "1.5" },
              { label: "週日", value: sundayRate, set: setSundayRate, default: "2.0" },
            ].map(({ label, value, set, default: def }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 w-20 shrink-0">{label}</span>
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={def}
                    min="1"
                    step="0.1"
                    className="w-full bg-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 shrink-0">倍</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-400">扣稅</span>
        <Toggle checked={taxEnabled} onChange={() => setTaxEnabled((v) => !v)} />
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "新增中..." : "新增"}
        </button>
      </div>
    </form>
  );
}
