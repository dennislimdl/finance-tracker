import { NextRequest, NextResponse } from "next/server";
import {
  getMonthExpenses,
  monthTabName,
  recordExpense,
  resolveTabForDate,
  todayISODate,
} from "@/lib/sheets";
import { CATEGORIES } from "@/lib/categories";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { amount, category, date, remarks } = body as {
    amount?: unknown;
    category?: unknown;
    date?: unknown;
    remarks?: unknown;
  };

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }
  if (typeof category !== "string" || !CATEGORIES.some((c) => c.name === category)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }

  const expenseDate = typeof date === "string" && date ? date : todayISODate();
  if (!ISO_DATE.test(expenseDate)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  try {
    const tabName = await resolveTabForDate(expenseDate);
    const { mode } = await recordExpense(tabName, {
      date: expenseDate,
      category,
      amount,
      remarks: typeof remarks === "string" ? remarks : "",
    });
    return NextResponse.json({ ok: true, tabName, mode });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const monthParam = req.nextUrl.searchParams.get("month");
  const tabName = monthParam ?? monthTabName(todayISODate());
  try {
    const expenses = await getMonthExpenses(tabName);
    return NextResponse.json({ expenses, tabName });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
