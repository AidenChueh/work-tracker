"use client";

import { useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { LocaleToggle } from "@/components/LocaleToggle";

type Props = {
  onComplete: (name: string) => void;
};

export function OnboardingForm({ onComplete }: Props) {
  const { t } = useLocale();
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onComplete(name.trim());
  };

  return (
    <div className="relative h-full bg-gray-950 text-white flex flex-col items-center justify-center px-6">
      <div className="absolute top-4 right-4">
        <LocaleToggle />
      </div>

      <h1 className="text-3xl font-bold mb-2">Work Tracker</h1>
      <p className="text-gray-400 mb-10">{t("onboarding.subtitle")}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">{t("onboarding.askName")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("onboarding.namePlaceholder")}
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {t("onboarding.start")}
        </button>
      </form>
    </div>
  );
}
