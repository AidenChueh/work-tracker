"use client";

import { useState, useEffect, useCallback } from "react";
import { AddJobForm } from "@/components/AddJobForm";
import { EditJobForm } from "@/components/EditJobForm";
import { useDevice } from "@/hooks/useDevice";

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

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const FREQ_LABELS: Record<string, string> = {
  weekly: "每週",
  bi_weekly: "每兩週",
  monthly: "每月",
  custom: "自訂",
};

export default function JobsPage() {
  const { deviceId, loaded } = useDevice();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddJob, setShowAddJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [taxRateInput, setTaxRateInput] = useState("0");

  useEffect(() => {
    const stored = localStorage.getItem("taxRate") ?? "0";
    setTaxRateInput(stored);
  }, []);

  const fetchJobs = useCallback(async (id: string) => {
    const res = await fetch("/api/jobs", { headers: { "x-device-id": id } });
    if (res.ok) setJobs(await res.json());
  }, []);

  useEffect(() => {
    if (!deviceId || !loaded) return;
    fetchJobs(deviceId).finally(() => setLoading(false));
  }, [deviceId, loaded, fetchJobs]);

  const handleTaxRateSave = () => {
    const val = parseFloat(taxRateInput);
    const clamped = isNaN(val) ? 0 : Math.min(Math.max(val, 0), 100);
    localStorage.setItem("taxRate", clamped.toString());
    setTaxRateInput(clamped.toString());
  };

  if (!loaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white">載入中...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">工作管理</h1>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">稅率</span>
            <div className="relative">
              <input
                type="number"
                value={taxRateInput}
                onChange={(e) => setTaxRateInput(e.target.value)}
                onBlur={handleTaxRateSave}
                min="0"
                max="100"
                step="0.1"
                placeholder="0"
                className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm pr-5 focus:outline-none focus:border-blue-500 text-right"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
            </div>
          </div>
        </div>

        {/* Add job button */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">工作列表</h2>
          <button
            onClick={() => { setShowAddJob((v) => !v); setEditingJobId(null); }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition-colors"
          >
            + 新增工作
          </button>
        </div>

        {showAddJob && (
          <AddJobForm
            deviceId={deviceId!}
            onJobAdded={(job) => {
              setJobs((prev) => [...prev, job]);
              setShowAddJob(false);
            }}
            onCancel={() => setShowAddJob(false)}
          />
        )}

        {jobs.length === 0 && !showAddJob && (
          <p className="text-gray-400 text-center mt-8">還沒有工作，點上方「新增工作」開始</p>
        )}

        <div className="space-y-1">
          {jobs.map((job) => {
            const isEditing = editingJobId === job.id;
            const payInfo = job.hourlyRate != null
              ? `$${job.hourlyRate}/hr`
              : job.commissionPercentage != null
              ? `佣金 ${(job.commissionPercentage * 100).toFixed(0)}%`
              : "未設定";
            const payDayLabel = job.payFrequency === "weekly" && job.payDay != null
              ? `星期${WEEKDAYS[job.payDay]}`
              : job.payFrequency === "monthly" && job.payDay != null
              ? `每月${job.payDay}號`
              : "";

            return (
              <div key={job.id}>
                <div className="bg-gray-800 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{job.name}</p>
                      {job.taxEnabled && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-md">
                          扣稅
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      {payInfo} · {FREQ_LABELS[job.payFrequency] ?? job.payFrequency}
                      {payDayLabel && ` · 發薪日：${payDayLabel}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingJobId(isEditing ? null : job.id);
                      setShowAddJob(false);
                    }}
                    className="text-gray-400 hover:text-white text-sm px-3 py-1.5 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    {isEditing ? "關閉" : "編輯"}
                  </button>
                </div>
                {isEditing && (
                  <EditJobForm
                    job={job}
                    deviceId={deviceId!}
                    onSaved={(updated) => {
                      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
                      setEditingJobId(null);
                    }}
                    onCancel={() => setEditingJobId(null)}
                    onDeactivated={(jobId) => {
                      setJobs((prev) => prev.filter((j) => j.id !== jobId));
                      setEditingJobId(null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
