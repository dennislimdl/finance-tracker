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

  const { incomeBeforeTax, taxRatePercent, savingsPercent, lineItems } = body as {
    incomeBeforeTax?: unknown;
    taxRatePercent?: unknown;
    savingsPercent?: unknown;
    lineItems?: unknown;
  };

  if (typeof incomeBeforeTax !== "number" || !Number.isFinite(incomeBeforeTax) || incomeBeforeTax < 0) {
    return NextResponse.json({ error: "Enter a valid income amount." }, { status: 400 });
  }
  if (
    typeof taxRatePercent !== "number" ||
    !Number.isFinite(taxRatePercent) ||
    taxRatePercent < 0 ||
    taxRatePercent > 100
  ) {
    return NextResponse.json({ error: "Tax rate must be between 0 and 100." }, { status: 400 });
  }
  if (
    typeof savingsPercent !== "number" ||
    !Number.isFinite(savingsPercent) ||
    savingsPercent < 0 ||
    savingsPercent > 100
  ) {
    return NextResponse.json({ error: "% of income saved must be between 0 and 100." }, { status: 400 });
  }
  if (
    !Array.isArray(lineItems) ||
    !lineItems.every(
      (item) =>
        item &&
        typeof item.row === "number" &&
        typeof item.name === "string" &&
        typeof item.cost === "number" &&
        Number.isFinite(item.cost) &&
        item.cost >= 0
    )
  ) {
    return NextResponse.json({ error: "Invalid line items." }, { status: 400 });
  }

  try {
    const tabName = await resolveTabForDate(todayISODate());
    await updateBudget(tabName, { incomeBeforeTax, taxRatePercent, savingsPercent, lineItems });
    const budget = await getBudget(tabName);
    return NextResponse.json({ ok: true, tabName, budget });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
