import { getMonthExpenses, listSheetTabs, monthTabName, tabSortKey, todayISODate } from "@/lib/sheets";
import { CATEGORIES, findCategory } from "@/lib/categories";
import BottomNav from "@/components/BottomNav";
import MonthSelect from "@/components/MonthSelect";
import ThemeToggle from "@/components/ThemeToggle";
import { ChevronDownIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

function sortTabsDesc(tabs: string[]): string[] {
  return [...tabs]
    .filter((t) => tabSortKey(t) !== null)
    .sort((a, b) => (tabSortKey(b) ?? 0) - (tabSortKey(a) ?? 0));
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const defaultTab = monthTabName(todayISODate());

  let tabs: string[] = [];
  let error: string | null = null;
  try {
    tabs = sortTabsDesc(await listSheetTabs());
  } catch (e) {
    error = (e as Error).message;
  }

  const tabName = params.month ?? (tabs.includes(defaultTab) ? defaultTab : tabs[0] ?? defaultTab);

  let expenses: Awaited<ReturnType<typeof getMonthExpenses>> = [];
  if (!error) {
    try {
      expenses = await getMonthExpenses(tabName);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    total: expenses
      .filter((e) => e.category === c.name)
      .reduce((sum, e) => sum + e.amount, 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const recent = [...expenses].reverse().slice(0, 20);

  return (
    <div className="min-h-dvh pb-28">
      <header className="flex items-center justify-between gap-3 px-6 pt-8 pb-4">
        <h1 className="text-xl font-semibold">Overview</h1>
        <div className="flex items-center gap-2">
          {tabs.length > 0 && <MonthSelect tabs={tabs} value={tabName} />}
          <ThemeToggle />
        </div>
      </header>

      <div className="px-6">
        {error ? (
          <p className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : (
          <>
            <div className="mb-6 rounded-3xl border border-card-border bg-card px-5 py-6 shadow-sm">
              <p className="text-sm text-muted">Total spent · {tabName.trim()}</p>
              <p className="mt-1 text-3xl font-semibold">${total.toFixed(2)}</p>
            </div>

            <div className="mb-6">
              <h2 className="mb-3 text-sm text-muted">By category</h2>
              <div className="space-y-2">
                {byCategory.length === 0 && (
                  <p className="text-sm text-muted-2">No expenses yet.</p>
                )}
                {byCategory.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm"
                  >
                    <span
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: c.color, color: c.textColor }}
                    >
                      {c.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-input">
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: c.color,
                            width: total > 0 ? `${(c.total / total) * 100}%` : "0%",
                          }}
                        />
                      </div>
                      <span className="w-16 text-right text-sm font-medium">
                        ${c.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <details open className="group">
              <summary className="mb-3 flex cursor-pointer list-none items-center justify-between text-sm text-muted [&::-webkit-details-marker]:hidden">
                <span>Recent</span>
                <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-1">
                {recent.length === 0 && (
                  <p className="text-sm text-muted-2">No expenses yet.</p>
                )}
                {recent.map((e, i) => {
                  const cat = findCategory(e.category);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-card-border py-2.5"
                    >
                      <div>
                        <p className="text-sm">{e.remarks || e.category}</p>
                        <p className="text-xs text-muted">
                          {e.date} ·{" "}
                          <span style={{ color: cat?.color }}>{e.category}</span>
                        </p>
                      </div>
                      <span className="text-sm font-medium">${e.amount.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </details>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
