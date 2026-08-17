"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";

interface LineItem {
  row: number;
  name: string;
  cost: number;
}

interface BudgetData {
  incomeBeforeTax: number;
  incomeAfterTax: number;
  savingsPercent: number;
  essentialPercent: number;
  essentialAmount: number;
  savingsAmount: number;
  lineItems: LineItem[];
  total: number;
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

  const [incomeBeforeTax, setIncomeBeforeTax] = useState("");
  const [incomeAfterTax, setIncomeAfterTax] = useState("");
  const [savingsPercent, setSavingsPercent] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [activeRows, setActiveRows] = useState<Set<number>>(new Set());

  function applyBudget(budget: BudgetData) {
    setIncomeBeforeTax(String(budget.incomeBeforeTax));
    setIncomeAfterTax(String(budget.incomeAfterTax));
    setSavingsPercent(String(Math.round(budget.savingsPercent * 100) / 100));
    setLineItems(budget.lineItems);
    setActiveRows(new Set(budget.lineItems.filter((i) => i.name).map((i) => i.row)));
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

  const availableSlot = lineItems.find((i) => !i.name && !activeRows.has(i.row));

  function addLineItem() {
    if (!availableSlot) return;
    setActiveRows((prev) => new Set(prev).add(availableSlot.row));
  }

  function removeLineItem(row: number) {
    setLineItems((prev) => prev.map((i) => (i.row === row ? { ...i, name: "", cost: 0 } : i)));
    setActiveRows((prev) => {
      const next = new Set(prev);
      next.delete(row);
      return next;
    });
  }

  function updateLineItemName(row: number, name: string) {
    setLineItems((prev) => prev.map((i) => (i.row === row ? { ...i, name } : i)));
  }

  function updateLineItemCost(row: number, value: string) {
    const cost = parseFloat(value);
    setLineItems((prev) =>
      prev.map((i) => (i.row === row ? { ...i, cost: Number.isFinite(cost) ? cost : 0 } : i))
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const before = parseFloat(incomeBeforeTax);
    const after = parseFloat(incomeAfterTax);
    const savings = parseFloat(savingsPercent);
    if (!Number.isFinite(before) || before < 0) {
      showToast("Enter a valid income amount.", "error");
      return;
    }
    if (!Number.isFinite(after) || after < 0) {
      showToast("Enter a valid income after tax amount.", "error");
      return;
    }
    if (!Number.isFinite(savings) || savings < 0 || savings > 100) {
      showToast("% of income saved must be between 0 and 100.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomeBeforeTax: before,
          incomeAfterTax: after,
          savingsPercent: savings,
          lineItems: lineItems.map((i) => ({ row: i.row, name: i.name, cost: i.cost })),
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

  const visibleLineItems = lineItems.filter((i) => i.name || activeRows.has(i.row));

  // Computed live from the current form inputs, not the last-saved sheet
  // values — so editing any field updates these immediately, before you
  // even hit Save.
  const afterTaxNum = parseFloat(incomeAfterTax) || 0;
  const savingsNum = parseFloat(savingsPercent) || 0;
  const liveEssentialPercent = Math.max(0, 100 - savingsNum);
  const liveSavingsAmount = afterTaxNum * (savingsNum / 100);
  const liveEssentialAmount = afterTaxNum * (liveEssentialPercent / 100);
  const liveTotal = lineItems.reduce((sum, i) => sum + (i.cost || 0), 0);

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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-2 block text-sm text-muted">Income (Before Tax)</label>
                <div className="flex h-16 items-center rounded-2xl border border-card-border bg-card px-4 shadow-sm transition focus-within:border-accent">
                  <span className="mr-2 text-xl text-muted-2">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={incomeBeforeTax}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(v)) setIncomeBeforeTax(v);
                    }}
                    className="w-full bg-transparent text-xl font-semibold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted">Income (After Tax)</label>
                <div className="flex h-16 items-center rounded-2xl border border-card-border bg-card px-4 shadow-sm transition focus-within:border-accent">
                  <span className="mr-2 text-xl text-muted-2">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={incomeAfterTax}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(v)) setIncomeAfterTax(v);
                    }}
                    className="w-full bg-transparent text-xl font-semibold outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-muted">% of Income saved</label>
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

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm">
                <p className="text-xs text-muted">Savings Amount</p>
                <p className="mt-0.5 text-base font-semibold">{currency(liveSavingsAmount)}</p>
              </div>
              <div className="rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm">
                <p className="text-xs text-muted">Total budgeted</p>
                <p className="mt-0.5 text-base font-semibold">{currency(liveTotal)}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm">
                <p className="text-xs text-muted">
                  Amount allowed to Spend after Savings ({liveEssentialPercent.toFixed(0)}%)
                </p>
                <p className="mt-0.5 text-base font-semibold">{currency(liveEssentialAmount)}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-muted">Regular monthly spending</label>
                <button
                  type="button"
                  onClick={addLineItem}
                  disabled={!availableSlot}
                  className="text-sm font-medium text-accent transition disabled:opacity-40"
                >
                  + Add line item
                </button>
              </div>
              <div className="space-y-2">
                {visibleLineItems.map((item) => (
                  <div
                    key={item.row}
                    className="flex h-14 items-center gap-2 rounded-2xl border border-card-border bg-card px-3 shadow-sm transition focus-within:border-accent"
                  >
                    <input
                      type="text"
                      value={item.name}
                      placeholder="e.g. Netflix"
                      onChange={(e) => updateLineItemName(item.row, e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-2"
                    />
                    <span className="text-muted-2">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.cost}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(v)) updateLineItemCost(item.row, v);
                      }}
                      className="w-16 bg-transparent text-right text-sm font-medium outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.row)}
                      aria-label="Remove line item"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {visibleLineItems.length === 0 && (
                  <p className="text-sm text-muted-2">No line items yet — add one above.</p>
                )}
              </div>
              {!availableSlot && (
                <p className="mt-2 text-xs text-muted-2">
                  All 11 line item slots are in use — remove one to add a new one.
                </p>
              )}
            </div>

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
