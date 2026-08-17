import { NextRequest, NextResponse } from "next/server";
import { getBudget, monthTabName, resolveTabForDate, todayISODate, updateBudget } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const monthParam = req.nextUrl.searchParams.get("month");
  const tabName = monthParam ?? monthTabName(todayISODate());
  try {
    const budget = await getBudget(tabName);
    return NextResponse.json({ budget, tabName });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { incomeBeforeCPF, savingsPercent, categories } = body as {
    incomeBeforeCPF?: unknown;
    savingsPercent?: unknown;
    categories?: unknown;
  };

  if (typeof incomeBeforeCPF !== "number" || !Number.isFinite(incomeBeforeCPF) || incomeBeforeCPF < 0) {
    return NextResponse.json({ error: "Enter a valid income amount." }, { status: 400 });
  }
  if (
    typeof savingsPercent !== "number" ||
    !Number.isFinite(savingsPercent) ||
    savingsPercent < 0 ||
    savingsPercent > 100
  ) {
    return NextResponse.json({ error: "Savings % must be between 0 and 100." }, { status: 400 });
  }
  if (
    !Array.isArray(categories) ||
    !categories.every(
      (c) =>
        c &&
        typeof c.row === "number" &&
        typeof c.cost === "number" &&
        Number.isFinite(c.cost) &&
        c.cost >= 0
    )
  ) {
    return NextResponse.json({ error: "Invalid category costs." }, { status: 400 });
  }

  try {
    const tabName = await resolveTabForDate(todayISODate());
    await updateBudget(tabName, { incomeBeforeCPF, savingsPercent, categories });
    const budget = await getBudget(tabName);
    return NextResponse.json({ ok: true, tabName, budget });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
