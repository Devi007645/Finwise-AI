import { FormEvent, useState } from "react";
import { OnboardingInput } from "../hooks/useFinanceData";

type OnboardingProps = {
  fullName: string;
  onComplete: (input: OnboardingInput) => Promise<void>;
};

export function Onboarding({ fullName, onComplete }: OnboardingProps) {
  const [form, setForm] = useState<OnboardingInput>({
    monthly_income_estimate: 100000,
    monthly_expense_estimate: 25000,
    tds_estimate: 10000,
    advance_tax_paid: 0,
    primary_income_source: "Freelance client work",
    gst_registered: false,
    tax_regime: "new",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof OnboardingInput, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await onComplete(form);
    } catch (err: any) {
      setError(err.message || "Unable to save your setup.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="font-sans max-w-2xl mx-auto p-6 md:p-12 text-vercel-black">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-vercel-text mb-3">Finwise setup</div>
        <h1 className="text-2xl font-semibold tracking-tight">Let’s shape your dashboard, {fullName}</h1>
        <p className="text-sm text-vercel-text mt-2">
          A few starting numbers help Finwise calculate your dashboard, advance tax view, and SKAI context.
        </p>
      </div>

      <form onSubmit={submit} className="bg-white shadow-v-card rounded-xl p-6 space-y-5">
        {error && <div className="bg-red-50 text-vercel-red text-sm p-3 rounded-md shadow-v-border">{error}</div>}

        <div>
          <label className="block text-sm font-medium mb-1.5">Main income source</label>
          <input
            value={form.primary_income_source}
            onChange={(e) => update("primary_income_source", e.target.value)}
            className="w-full text-base md:text-sm px-3 py-2 rounded-md shadow-v-border outline-none focus:shadow-v-focus"
            placeholder="Freelance development, consulting, design..."
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <NumberField label="Estimated monthly income" value={form.monthly_income_estimate} onChange={(value) => update("monthly_income_estimate", value)} />
          <NumberField label="Estimated monthly expenses" value={form.monthly_expense_estimate} onChange={(value) => update("monthly_expense_estimate", value)} />
          <NumberField label="Monthly TDS usually deducted" value={form.tds_estimate} onChange={(value) => update("tds_estimate", value)} />
          <NumberField label="Advance tax already paid this year" value={form.advance_tax_paid} onChange={(value) => update("advance_tax_paid", value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">GST registration</label>
            <select
              value={form.gst_registered ? "yes" : "no"}
              onChange={(e) => update("gst_registered", e.target.value === "yes")}
              className="w-full text-base md:text-sm px-3 py-2 rounded-md bg-white shadow-v-border outline-none focus:shadow-v-focus"
            >
              <option value="no">Not registered yet</option>
              <option value="yes">Already registered</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Preferred tax regime</label>
            <select
              value={form.tax_regime}
              onChange={(e) => update("tax_regime", e.target.value as "new" | "old")}
              className="w-full text-base md:text-sm px-3 py-2 rounded-md bg-white shadow-v-border outline-none focus:shadow-v-focus"
            >
              <option value="new">New regime</option>
              <option value="old">Old regime</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-vercel-black text-white py-2.5 rounded-md text-sm font-medium shadow-v-border hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Build my dashboard"}
        </button>
      </form>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full text-base md:text-sm px-3 py-2 rounded-md shadow-v-border outline-none focus:shadow-v-focus tabular-nums"
        required
      />
    </div>
  );
}
