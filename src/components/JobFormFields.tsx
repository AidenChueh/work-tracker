"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/hooks/useLocale";
import { FORM } from "@/lib/theme";
import { FormSection, SegmentedControl, SelectField, TextField, ToggleRow } from "./FormControls";
import type { Job } from "@/types/api";

type Tier = { afterHours: string; rate: string };

export type JobFormState = {
  name: string;
  payType: "hourly" | "commission";
  hourlyRate: string;
  commissionPercentage: string;
  commissionRequired: boolean;
  scheduleType: "flexible" | "fixed";
  fixedClockIn: string;
  fixedClockOut: string;
  payFrequency: string;
  payDay: string;
  payWeekStart: string;
  taxEnabled: boolean;
  overtimeTiers: Tier[];
  hasBreak: boolean;
  breakDuration: string;
  breakRate: string;
  penaltyRatesEnabled: boolean;
  publicHolidayRate: string;
  saturdayRate: string;
  sundayRate: string;
  saturdayHourlyRate: string;
  sundayHourlyRate: string;
  publicHolidayHourlyRate: string;
};

type Errors = { hourlyRate?: string; payDay?: string; commissionPercentage?: string };

const DEFAULTS: JobFormState = {
  name: "",
  payType: "hourly",
  hourlyRate: "",
  commissionPercentage: "",
  commissionRequired: false,
  scheduleType: "flexible",
  fixedClockIn: "09:00",
  fixedClockOut: "17:00",
  payFrequency: "weekly",
  payDay: "",
  payWeekStart: "",
  taxEnabled: false,
  overtimeTiers: [],
  hasBreak: false,
  breakDuration: "",
  breakRate: "",
  penaltyRatesEnabled: false,
  publicHolidayRate: "2.5",
  saturdayRate: "1.5",
  sundayRate: "2.0",
  saturdayHourlyRate: "",
  sundayHourlyRate: "",
  publicHolidayHourlyRate: "",
};

function fromJob(job: Job): JobFormState {
  return {
    name: job.name,
    payType: job.hourlyRate != null ? "hourly" : "commission",
    hourlyRate: job.hourlyRate?.toString() ?? "",
    commissionPercentage: job.commissionPercentage != null ? (job.commissionPercentage * 100).toString() : "",
    commissionRequired: job.commissionRequired,
    scheduleType: job.scheduleType === "fixed" ? "fixed" : "flexible",
    fixedClockIn: job.fixedClockIn ?? "09:00",
    fixedClockOut: job.fixedClockOut ?? "17:00",
    payFrequency: job.payFrequency,
    payDay: job.payDay?.toString() ?? "",
    payWeekStart: job.payWeekStart?.toString() ?? "",
    taxEnabled: job.taxEnabled,
    overtimeTiers: job.overtimeTiers.map((t) => ({ afterHours: t.afterHours.toString(), rate: t.rate.toString() })),
    hasBreak: job.breakDuration != null,
    breakDuration: job.breakDuration?.toString() ?? "",
    breakRate: job.breakRate?.toString() ?? "",
    penaltyRatesEnabled: job.penaltyRatesEnabled,
    publicHolidayRate: job.publicHolidayRate.toString(),
    saturdayRate: job.saturdayRate.toString(),
    sundayRate: job.sundayRate.toString(),
    saturdayHourlyRate: job.saturdayHourlyRate?.toString() ?? "",
    sundayHourlyRate: job.sundayHourlyRate?.toString() ?? "",
    publicHolidayHourlyRate: job.publicHolidayHourlyRate?.toString() ?? "",
  };
}

function fmtCalc(base: string, mult: string): string {
  const b = parseFloat(base);
  const m = parseFloat(mult);
  if (isNaN(b) || isNaN(m) || b <= 0 || m <= 0) return "";
  return (b * m).toFixed(2).replace(/\.?0+$/, "");
}

export function useJobForm(job?: Job) {
  const { t } = useLocale();
  const [state, setState] = useState<JobFormState>(() => (job ? fromJob(job) : DEFAULTS));
  const [errors, setErrors] = useState<Errors>({});
  const initRef = useRef(true);

  const set = <K extends keyof JobFormState>(key: K, value: JobFormState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  // 時薪或倍率變動時自動換算假日時薪；首次載入不覆蓋既有值
  useEffect(() => {
    if (initRef.current) return;
    setState((p) => ({ ...p, saturdayHourlyRate: fmtCalc(p.hourlyRate, p.saturdayRate) }));
  }, [state.hourlyRate, state.saturdayRate]);
  useEffect(() => {
    if (initRef.current) return;
    setState((p) => ({ ...p, sundayHourlyRate: fmtCalc(p.hourlyRate, p.sundayRate) }));
  }, [state.hourlyRate, state.sundayRate]);
  useEffect(() => {
    if (initRef.current) return;
    setState((p) => ({ ...p, publicHolidayHourlyRate: fmtCalc(p.hourlyRate, p.publicHolidayRate) }));
  }, [state.hourlyRate, state.publicHolidayRate]);
  useEffect(() => { initRef.current = false; }, []);

  const validate = (): boolean => {
    const next: Errors = {};
    if (state.payType === "hourly") {
      const hr = parseFloat(state.hourlyRate);
      if (!state.hourlyRate || isNaN(hr) || hr <= 0) next.hourlyRate = t("form.errHourly");
    } else {
      const cp = parseFloat(state.commissionPercentage);
      if (!state.commissionPercentage || isNaN(cp) || cp <= 0) next.commissionPercentage = t("form.errCommission");
    }
    if (state.payDay === "") {
      next.payDay = state.payFrequency === "monthly" ? t("form.errPayDayMonth") : t("form.errPayDayWeek");
    } else if (state.payFrequency === "monthly") {
      const d = parseInt(state.payDay);
      if (isNaN(d) || d < 1 || d > 31) next.payDay = t("form.errPayDayRange");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildBody = () => ({
    name: state.name.trim(),
    hourlyRate: state.payType === "hourly" ? parseFloat(state.hourlyRate) || null : null,
    commissionPercentage:
      state.payType === "commission" ? parseFloat(state.commissionPercentage) / 100 || null : null,
    commissionRequired: state.payType === "commission" ? state.commissionRequired : false,
    scheduleType: state.scheduleType,
    fixedClockIn: state.scheduleType === "fixed" ? state.fixedClockIn : null,
    fixedClockOut: state.scheduleType === "fixed" ? state.fixedClockOut : null,
    payFrequency: state.payFrequency,
    payDay: state.payDay !== "" ? parseInt(state.payDay) : null,
    payWeekStart: state.payWeekStart !== "" ? parseInt(state.payWeekStart) : null,
    taxEnabled: state.taxEnabled,
    overtimeTiers: state.overtimeTiers
      .filter((tier) => tier.afterHours !== "" && tier.rate !== "")
      .map((tier) => ({ afterHours: parseFloat(tier.afterHours), rate: parseFloat(tier.rate) })),
    breakDuration: state.hasBreak ? parseInt(state.breakDuration) || null : null,
    breakRate: state.hasBreak ? parseFloat(state.breakRate) || null : null,
    penaltyRatesEnabled: state.penaltyRatesEnabled,
    publicHolidayRate: parseFloat(state.publicHolidayRate) || 2.5,
    saturdayRate: parseFloat(state.saturdayRate) || 1.5,
    sundayRate: parseFloat(state.sundayRate) || 2.0,
    saturdayHourlyRate: state.saturdayHourlyRate ? parseFloat(state.saturdayHourlyRate) : null,
    sundayHourlyRate: state.sundayHourlyRate ? parseFloat(state.sundayHourlyRate) : null,
    publicHolidayHourlyRate: state.publicHolidayHourlyRate ? parseFloat(state.publicHolidayHourlyRate) : null,
  });

  const clearError = (key: keyof Errors) => setErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));

  return { state, set, errors, clearError, validate, buildBody };
}

export type JobForm = ReturnType<typeof useJobForm>;

export function JobFormFields({ form }: { form: JobForm }) {
  const { t } = useLocale();
  const { state, set, errors, clearError } = form;
  const weekdayOptions = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ value: String(i), label: t(`wd.${i}`) }));
  const showWeekdaySelector = state.payFrequency === "weekly" || state.payFrequency === "bi_weekly";
  const isHourly = state.payType === "hourly";

  const updateTier = (i: number, key: keyof Tier, value: string) =>
    set("overtimeTiers", state.overtimeTiers.map((tier, idx) => (idx === i ? { ...tier, [key]: value } : tier)));

  return (
    <div>
      <FormSection title={t("form.section.basic")} defaultOpen>
        <TextField
          label={t("form.name")}
          value={state.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("form.namePlaceholder")}
          required
        />
        <SegmentedControl
          label={t("form.payType")}
          value={state.payType}
          onChange={(v) => set("payType", v)}
          options={[
            { value: "hourly" as const, label: t("form.hourly") },
            { value: "commission" as const, label: t("form.commission") },
          ]}
        />
        {isHourly ? (
          <TextField
            label={t("form.hourlyRate")}
            required
            type="number"
            inputMode="decimal"
            value={state.hourlyRate}
            onChange={(e) => { set("hourlyRate", e.target.value); clearError("hourlyRate"); }}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            min="0"
            step="0.01"
            error={errors.hourlyRate}
          />
        ) : (
          <>
            <TextField
              label={t("form.commissionPct")}
              required
              type="number"
              inputMode="decimal"
              value={state.commissionPercentage}
              onChange={(e) => { set("commissionPercentage", e.target.value); clearError("commissionPercentage"); }}
              onFocus={(e) => e.target.select()}
              placeholder="10"
              min="0"
              max="100"
              step="0.1"
              error={errors.commissionPercentage}
            />
            <ToggleRow
              label={t("form.commissionRequired")}
              checked={state.commissionRequired}
              onChange={() => set("commissionRequired", !state.commissionRequired)}
            />
          </>
        )}
      </FormSection>

      <FormSection title={t("form.section.schedule")}>
        <SegmentedControl
          label={t("form.scheduleType")}
          value={state.scheduleType}
          onChange={(v) => set("scheduleType", v)}
          options={[
            { value: "flexible" as const, label: t("form.flexible") },
            { value: "fixed" as const, label: t("form.fixed") },
          ]}
        />
        {state.scheduleType === "fixed" && (
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t("form.fixedClockIn")}
              type="time"
              value={state.fixedClockIn}
              onChange={(e) => set("fixedClockIn", e.target.value)}
            />
            <TextField
              label={t("form.fixedClockOut")}
              type="time"
              value={state.fixedClockOut}
              onChange={(e) => set("fixedClockOut", e.target.value)}
            />
          </div>
        )}
      </FormSection>

      <FormSection title={t("form.section.pay")}>
        <SelectField
          label={t("form.payFreq")}
          value={state.payFrequency}
          onChange={(e) => { set("payFrequency", e.target.value); set("payDay", ""); set("payWeekStart", ""); }}
          options={[
            { value: "weekly", label: t("form.weekly") },
            { value: "bi_weekly", label: t("form.biweekly") },
            { value: "monthly", label: t("form.monthly") },
          ]}
        />
        {showWeekdaySelector ? (
          <>
            <SelectField
              label={t("form.payDayWeek")}
              required
              value={state.payDay}
              onChange={(e) => { set("payDay", e.target.value); clearError("payDay"); }}
              options={[{ value: "", label: t("form.selectWeekday") }, ...weekdayOptions]}
              error={errors.payDay}
            />
            <SelectField
              label={t("form.weekStart")}
              value={state.payWeekStart}
              onChange={(e) => set("payWeekStart", e.target.value)}
              options={[{ value: "", label: t("form.weekStartDefault") }, ...weekdayOptions]}
              hint={t("form.weekStartHint")}
            />
          </>
        ) : (
          <TextField
            label={t("form.payDayMonth")}
            required
            type="number"
            inputMode="numeric"
            value={state.payDay}
            onChange={(e) => { set("payDay", e.target.value); clearError("payDay"); }}
            onFocus={(e) => e.target.select()}
            min="1"
            max="31"
            placeholder="15"
            error={errors.payDay}
          />
        )}
        <ToggleRow
          label={t("form.tax")}
          checked={state.taxEnabled}
          onChange={() => set("taxEnabled", !state.taxEnabled)}
        />
      </FormSection>

      {isHourly && (
        <FormSection title={t("form.section.overtime")}>
          {state.overtimeTiers.map((tier, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <TextField
                  label={t("form.tierAfter")}
                  small
                  type="number"
                  inputMode="decimal"
                  value={tier.afterHours}
                  onChange={(e) => updateTier(i, "afterHours", e.target.value)}
                  placeholder="8"
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <TextField
                  label={t("form.tierRate")}
                  small
                  type="number"
                  inputMode="decimal"
                  value={tier.rate}
                  onChange={(e) => updateTier(i, "rate", e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <button
                type="button"
                onClick={() => set("overtimeTiers", state.overtimeTiers.filter((_, idx) => idx !== i))}
                aria-label={t("form.removeTier")}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("overtimeTiers", [...state.overtimeTiers, { afterHours: "", rate: "" }])}
            className="w-full h-9 rounded-lg bg-blue-500/10 text-blue-400 text-[13px] font-medium hover:bg-blue-500/20 active:scale-[0.98] transition-all duration-150"
          >
            {t("form.addTier")}
          </button>
        </FormSection>
      )}

      {isHourly && (
        <FormSection title={t("form.section.break")}>
          <ToggleRow
            label={t("form.hasBreak")}
            checked={state.hasBreak}
            onChange={() => set("hasBreak", !state.hasBreak)}
          />
          {state.hasBreak && (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label={t("form.breakMinutes")}
                type="number"
                inputMode="numeric"
                value={state.breakDuration}
                onChange={(e) => set("breakDuration", e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="30"
                min="0"
                step="1"
              />
              <TextField
                label={t("form.breakRate")}
                type="number"
                inputMode="decimal"
                value={state.breakRate}
                onChange={(e) => set("breakRate", e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder={t("form.breakRatePlaceholder")}
                min="0"
                step="0.01"
              />
            </div>
          )}
        </FormSection>
      )}

      {isHourly && (
        <FormSection title={t("form.section.penalty")}>
          <ToggleRow
            label={t("form.penaltyDesc")}
            hint={t("form.penaltyHint")}
            checked={state.penaltyRatesEnabled}
            onChange={() => set("penaltyRatesEnabled", !state.penaltyRatesEnabled)}
          />
          {state.penaltyRatesEnabled && (
            <div className="space-y-3 bg-gray-700/40 rounded-xl p-3">
              <p className={FORM.helper}>{t("form.penaltyAutoHint")}</p>
              {([
                { key: "saturday", label: t("form.saturday"), rateKey: "saturdayRate", hourlyKey: "saturdayHourlyRate" },
                { key: "sunday", label: t("form.sunday"), rateKey: "sundayRate", hourlyKey: "sundayHourlyRate" },
                { key: "holiday", label: t("form.holiday"), rateKey: "publicHolidayRate", hourlyKey: "publicHolidayHourlyRate" },
              ] as const).map(({ key, label, rateKey, hourlyKey }) => (
                <div key={key}>
                  <span className={`block ${FORM.label} ${FORM.labelGap}`}>{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <TextField
                        small
                        type="number"
                        inputMode="decimal"
                        value={state[rateKey]}
                        onChange={(e) => set(rateKey, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        min="1"
                        step="0.1"
                      />
                      <span className={`shrink-0 ${FORM.helper}`}>{t("form.multiplier")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <TextField
                        small
                        type="number"
                        inputMode="decimal"
                        value={state[hourlyKey]}
                        onChange={(e) => set(hourlyKey, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder={t("form.perHour")}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormSection>
      )}
    </div>
  );
}
