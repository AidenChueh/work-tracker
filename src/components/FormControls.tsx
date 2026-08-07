"use client";

import { useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { FORM } from "@/lib/theme";
import { fmtInputDate } from "@/lib/format";

export function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex shrink-0 w-10 h-6 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-600"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

export function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[24px]">
      <div className="min-w-0">
        <span className={FORM.label}>{label}</span>
        {hint && <p className={`${FORM.helper} mt-0.5`}>{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function FieldShell({ label, required, error, hint, children }: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      {label && (
        <label className={`block ${FORM.label} ${FORM.labelGap}`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {error ? <p className={`${FORM.error} mt-1`}>{error}</p> : hint ? <p className={`${FORM.helper} mt-1`}>{hint}</p> : null}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  small?: boolean;
  prefix?: string;
  suffix?: string;
};

export function TextField({ label, required, error, hint, small, prefix, suffix, className, ...props }: TextFieldProps) {
  const input = (
    <input
      {...props}
      className={`${small ? FORM.inputSm : FORM.input} ${prefix ? "pl-8" : ""} ${suffix ? "pr-14" : ""} ${error ? FORM.inputError : ""} ${className ?? ""}`}
    />
  );
  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      {prefix || suffix ? (
        <div className="relative">
          {prefix && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-gray-400 pointer-events-none">{prefix}</span>
          )}
          {input}
          {suffix && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400 pointer-events-none">{suffix}</span>
          )}
        </div>
      ) : input}
    </FieldShell>
  );
}

function openPicker(el: HTMLInputElement) {
  try {
    (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
  } catch {
    // 瀏覽器不支援或非使用者操作時忽略，仍可用原生輸入
  }
}

type PickerFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  display: string;
  placeholder?: string;
  icon: ReactNode;
};

function PickerField({ label, required, error, hint, display, placeholder, icon, className, ...props }: PickerFieldProps) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <div className="relative h-11">
        <input
          {...props}
          required={required}
          onClick={(e) => openPicker(e.currentTarget)}
          className={`peer absolute inset-0 w-full h-full opacity-0 cursor-pointer ${className ?? ""}`}
        />
        <div
          className={`${FORM.inputShell} absolute inset-0 pointer-events-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:border-blue-500 ${error ? FORM.inputError : ""}`}
        >
          <span className={`truncate ${display ? "" : "text-gray-400"}`}>{display || placeholder}</span>
          <span className="shrink-0 text-gray-400">{icon}</span>
        </div>
      </div>
    </FieldShell>
  );
}

export function DateField({ value, ...props }: Omit<PickerFieldProps, "display" | "icon"> & { value: string }) {
  return (
    <PickerField
      {...props}
      type="date"
      value={value}
      display={fmtInputDate(value)}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      }
    />
  );
}

export function TimeField({ value, ...props }: Omit<PickerFieldProps, "display" | "icon"> & { value: string }) {
  return (
    <PickerField
      {...props}
      type="time"
      value={value}
      display={value}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 7v5l3 2" />
        </svg>
      }
    />
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
};

export function TextAreaField({ label, required, error, hint, className, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <textarea {...props} className={`${FORM.textarea} ${error ? FORM.inputError : ""} ${className ?? ""}`} />
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
};

export function SelectField({ label, required, error, hint, options, className, ...props }: SelectFieldProps) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <select {...props} className={`${FORM.input} ${error ? FORM.inputError : ""} ${className ?? ""}`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}

export function SegmentedControl<T extends string>({ label, value, options, onChange }: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <FieldShell label={label}>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`${FORM.segment} ${value === o.value ? FORM.segmentOn : FORM.segmentOff}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

export function FormSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-700 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-3 text-left active:opacity-70 transition-opacity"
      >
        <span className={FORM.sectionTitle}>{title}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className={`pb-4 ${FORM.fieldGap}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
