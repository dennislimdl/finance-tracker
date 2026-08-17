"use client";

import { useState } from "react";
import CategoryPicker from "@/components/CategoryPicker";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

const PUBLIC_TRANSPORT_REMARKS = "Public Transport";

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function AddExpensePage() {
  const { showToast } = useToast();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showTransportPrompt, setShowTransportPrompt] = useState(false);

  const numericAmount = parseFloat(amount);
  const canSubmit = !submitting && category && numericAmount > 0;

  function handleCategoryChange(name: string) {
    if (name === "Transport" && category !== "Transport") {
      setShowTransportPrompt(true);
    }
    setCategory(name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          category,
          date,
          remarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Something went wrong.", "error");
        return;
      }
      showToast(
        data.mode === "accumulated"
          ? `Added to ${remarks.trim() || category} total (${data.tabName})`
          : `Added to ${data.tabName}`,
        "success"
      );
      setAmount("");
      setCategory(null);
      setRemarks("");
      setDate(todayISO());
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh pb-28">
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <h1 className="text-xl font-semibold">Add Expense</h1>
        <ThemeToggle />
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 px-6">
        <div>
          <label className="mb-2 block text-sm text-muted">Amount</label>
          <div className="flex h-16 items-center rounded-2xl border border-card-border bg-card px-4 shadow-sm transition focus-within:border-accent">
            <span className="mr-2 text-2xl text-muted-2">$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
              }}
              className="w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-muted-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-muted">Category</label>
          <CategoryPicker value={category} onChange={handleCategoryChange} />
        </div>

        <div>
          <label className="mb-2 block text-sm text-muted">Date</label>
          <div className="flex h-16 items-center rounded-2xl border border-card-border bg-card px-4 shadow-sm transition focus-within:border-accent">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-foreground outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-muted">Remarks (optional)</label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Lunch"
            className="h-16 w-full rounded-2xl border border-card-border bg-card px-4 text-foreground shadow-sm outline-none placeholder:text-muted-2 transition focus:border-accent"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent-2 py-4 text-base font-medium text-accent-foreground shadow-md transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
        >
          {submitting ? "Adding…" : "Add Expense"}
        </button>
      </form>

      <BottomNav />

      <ConfirmDialog
        open={showTransportPrompt}
        title="Public transport?"
        message={`Set remarks to "${PUBLIC_TRANSPORT_REMARKS}" so this adds to the month's running total instead of a new row.`}
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={() => {
          setRemarks(PUBLIC_TRANSPORT_REMARKS);
          setShowTransportPrompt(false);
        }}
        onCancel={() => setShowTransportPrompt(false)}
      />
    </div>
  );
}
