"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";

interface BudgetCategory {
  row: number;
  name: string;
  cost: number;
}

interface BudgetData {
  incomeBeforeCPF: number;
  incomeAfterCPF: number;
  savingsPercent: number;
  essentialPercent: number;
  essentialAmount: number;
  savingsAmount: number;
  categories: BudgetCategory[];
  total: number;
  remaining: number;
}

function currency(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function BudgetPage() {
  const { showToast } = useToast();
  const [tabName, setTabName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [incomeBeforeCPF, setIncomeBeforeCPF] = useState("");
  const [savingsPercent, setSavingsPercent] = useState("");
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [computed, setComputed] = useState<Pick<
    BudgetData,
    "incomeAfterCPF" | "essentialPercent" | "essentialAmount" | "savingsAmount" | "total" | "remaining"
  > | null>(null);

  function applyBudget(budget: BudgetData) {
    setIncomeBeforeCPF(String(budget.incomeBeforeCPF));
    setSavingsPercent(String(Math.round(budget.savingsPercent * 100) / 100));
    setCategories(budget.categories);
    setComputed({
      incomeAfterCPF: budget.incomeAfterCPF,
      essentialPercent: budget.essentialPercent,
      essentialAmount: budget.essentialAmount,
      savingsAmount: budget.savingsAmount,
      total: budget.total,
      remaining: budget.remaining,
    });
  }

  useEffect(() => {
    fetch("/api/budget")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setLoadError(data.error);
          return;
        }
        setTabName(data.tabName);
        applyBudget(data.budget);
      })
      .catch(() => setLoadError("Network error. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const income = parseFloat(incomeBeforeCPF);
    const savings = parseFloat(savingsPercent);
    if (!Number.isFinite(income) || income < 0) {
      showToast("Enter a valid income amount.", "error");
      return;
    }
    if (!Number.isFinite(savings) || savings < 0 || savings > 100) {
      showToast("Savings % must be between 0 and 100.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomeBeforeCPF: income,
          savingsPercent: savings,
          categories: categories.map((c) => ({ row: c.row, cost: c.cost })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Something went wrong.", "error");
        return;
      }
      setTabName(data.tabName);
      applyBudget(data.budget);
      showToast(`Budget saved for ${data.tabName}`, "success");
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  function updateCategoryCost(row: number, value: string) {
    const cost = parseFloat(value);
    setCategories((prev) =>
      prev.map((c) => (c.row === row ? { ...c, cost: Number.isFinite(cost) ? cost : 0 } : c))
    );
  }

  return (
    <div className="min-h-dvh pb-28">
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <h1 className="text-xl font-semibold">Budget</h1>
        <ThemeToggle />
      </header>

      <div className="px-6">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : loadError ? (
          <p className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
            {loadError}
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {tabName && <p className="text-sm text-muted">Editing {tabName.trim()}</p>}

            <div>
              <label className="mb-2 block text-sm text-muted">Income (Before CPF)</label>
              <div className="flex h-16 items-center rounded-2xl border border-card-border bg-card px-4 shadow-sm transition focus-within:border-accent">
                <span className="mr-2 text-xl text-muted-2">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={incomeBeforeCPF}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(v)) setIncomeBeforeCPF(v);
                  }}
                  className="w-full bg-transparent text-xl font-semibold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-muted">Savings %</label>
              <div className="flex h-16 items-center rounded-2xl border border-card-border bg-card px-4 shadow-sm transition focus-within:border-accent">
                <input
                  type="text"
                  inputMode="decimal"
                  value={savingsPercent}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(v)) setSavingsPercent(v);
                  }}
                  className="w-full bg-transparent text-xl font-semibold outline-none"
                />
                <span className="ml-2 text-xl text-muted-2">%</span>
              </div>
            </div>

            {computed && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm">
                  <p className="text-xs text-muted">Income after CPF</p>
                  <p className="mt-0.5 text-base font-semibold">{currency(computed.incomeAfterCPF)}</p>
                </div>
                <div className="rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm">
                  <p className="text-xs text-muted">Essential ({computed.essentialPercent.toFixed(0)}%)</p>
                  <p className="mt-0.5 text-base font-semibold">{currency(computed.essentialAmount)}</p>
                </div>
                <div className="rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm">
                  <p className="text-xs text-muted">Savings</p>
                  <p className="mt-0.5 text-base font-semibold">{currency(computed.savingsAmount)}</p>
                </div>
                <div className="rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm">
                  <p className="text-xs text-muted">Remaining</p>
                  <p className="mt-0.5 text-base font-semibold">{currency(computed.remaining)}</p>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm text-muted">Category budgets</label>
              <div className="space-y-2">
                {categories.map((c) => (
                  <div
                    key={c.row}
                    className="flex h-14 items-center gap-3 rounded-2xl border border-card-border bg-card px-4 shadow-sm transition focus-within:border-accent"
                  >
                    <span className="flex-1 truncate text-sm">{c.name}</span>
                    <span className="text-muted-2">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={c.cost}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(v)) updateCategoryCost(c.row, v);
                      }}
                      className="w-20 bg-transparent text-right text-sm font-medium outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {computed && (
              <div className="flex items-center justify-between rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm">
                <span className="text-sm text-muted">Total budgeted</span>
                <span className="text-base font-semibold">{currency(computed.total)}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent-2 py-4 text-base font-medium text-accent-foreground shadow-md transition active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Budget"}
            </button>
          </form>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
