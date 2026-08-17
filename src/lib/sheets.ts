import { google } from "googleapis";
import { findAccumulateRule, SHEET_ID, TABLE_COLUMNS } from "./config";

export interface Expense {
  /** yyyy-mm-dd, no timezone/time component */
  date: string;
  category: string;
  amount: number;
  remarks: string;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FULL_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// The sheet's older tabs/dates used inconsistent month spellings
// ("April'23", " Aug'23", "Sept'23") before settling into "Mon'YY" from
// Jan'24 onward. Recognize every variant seen so history isn't dropped.
const MONTH_ALIASES: Record<string, number> = {};
MONTHS.forEach((abbr, i) => {
  MONTH_ALIASES[abbr.toLowerCase()] = i;
  MONTH_ALIASES[FULL_MONTHS[i]] = i;
});
MONTH_ALIASES["sept"] = 8;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY environment variables."
    );
  }
  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  if (!SHEET_ID) {
    throw new Error("Missing GOOGLE_SHEET_ID environment variable.");
  }
  return google.sheets({ version: "v4", auth: getAuth() });
}

/** Quotes a sheet tab name for use in A1-notation ranges, e.g. Aug'26 -> 'Aug''26'. */
function quoteSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

// TABLE_COLUMNS is "Date | Category | Amount | Remarks" starting at some
// column letter (e.g. "D:G") — Amount is always the 3rd column in that span.
const AMOUNT_COLUMN = String.fromCharCode(TABLE_COLUMNS.charCodeAt(0) + 2);

/**
 * All calendar-date logic below works directly on "yyyy-mm-dd" strings and
 * never round-trips through a JS Date object for date-only values — doing so
 * mixes local-timezone getters with UTC ISO conversion and silently shifts
 * the date by a day whenever the server's local timezone is ahead of UTC.
 */
function parseISODate(iso: string): { year: number; month: number; day: number } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Today's date in the server's local timezone, as "yyyy-mm-dd". */
export function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** e.g. "2026-08-01" -> "Aug'26" */
export function monthTabName(isoDate: string): string {
  const parsed = parseISODate(isoDate);
  if (!parsed) throw new Error(`Invalid date: ${isoDate}`);
  const month = MONTHS[parsed.month - 1];
  const year = String(parsed.year).slice(-2);
  return `${month}'${year}`;
}

/**
 * Parses a "Mon'YY" tab name — including older variants like " Aug'23",
 * "Sept'23", "April'23" — into a value that sorts chronologically, or null
 * if the name isn't a month tab at all (e.g. "Template", "Raw Data").
 */
export function tabSortKey(tabName: string): number | null {
  const match = tabName.trim().match(/^([A-Za-z]+)'(\d{2})$/);
  if (!match) return null;
  const [, monStr, yy] = match;
  const monthIndex = MONTH_ALIASES[monStr.toLowerCase()];
  if (monthIndex === undefined) return null;
  return (2000 + Number(yy)) * 12 + monthIndex;
}

function formatSheetDate(isoDate: string): string {
  // Matches the sheet's existing "1-Aug-2026" format.
  const parsed = parseISODate(isoDate);
  if (!parsed) throw new Error(`Invalid date: ${isoDate}`);
  return `${parsed.day}-${MONTHS[parsed.month - 1]}-${parsed.year}`;
}

function parseSheetDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();

  // Current format, from ~Sep'25 onward: "1-Aug-2026"
  const dashMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
  if (dashMatch) {
    const [, day, monStr, year] = dashMatch;
    const monthIndex = MONTH_ALIASES[monStr.toLowerCase()];
    if (monthIndex === undefined) return null;
    return `${year}-${pad2(monthIndex + 1)}-${pad2(Number(day))}`;
  }

  // Older format, used through mid-2025: "12/4/2023" or "01/06/2024" (day/month/year)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const monthNum = Number(month);
    if (monthNum < 1 || monthNum > 12) return null;
    return `${year}-${pad2(monthNum)}-${pad2(Number(day))}`;
  }

  return null;
}

export async function listSheetTabs(): Promise<string[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  return (res.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => !!t);
}

/** Finds the sheet tab matching the given "yyyy-mm-dd" date's "Mon'YY" name (case-insensitive). */
export async function resolveTabForDate(isoDate: string): Promise<string> {
  const target = monthTabName(isoDate).toLowerCase();
  const tabs = await listSheetTabs();
  const match = tabs.find((t) => t.toLowerCase() === target);
  if (!match) {
    throw new Error(
      `No sheet tab named "${monthTabName(isoDate)}" found. Duplicate the Template tab and rename it first.`
    );
  }
  return match;
}

export async function appendExpense(
  tabName: string,
  expense: Expense
): Promise<void> {
  const sheets = getSheetsClient();
  const range = `${quoteSheetName(tabName)}!${TABLE_COLUMNS}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "OVERWRITE",
    requestBody: {
      values: [
        [
          formatSheetDate(expense.date),
          expense.category,
          expense.amount,
          expense.remarks,
        ],
      ],
    },
  });
}

/**
 * Finds the most recent row in the month's table matching the given category
 * + remarks (case-insensitive), for accumulate-in-place rules. Returns its
 * sheet row number and the cell's raw content — a formula string (e.g.
 * "=28.04+0.01") if it's already been accumulated into, otherwise the plain
 * number — or null if no such row exists yet.
 */
async function findAccumulateRow(
  tabName: string,
  category: string,
  remarks: string
): Promise<{ rowNumber: number; rawAmount: string } | null> {
  const sheets = getSheetsClient();
  const range = `${quoteSheetName(tabName)}!${TABLE_COLUMNS}`;
  const [displayRes, formulaRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range, valueRenderOption: "FORMULA" }),
  ]);
  const rows = displayRes.data.values ?? [];
  const formulaRows = formulaRes.data.values ?? [];
  const normalizedRemarks = remarks.trim().toLowerCase();

  for (let i = rows.length - 1; i >= 0; i--) {
    const [, rowCategory, amountRaw, rowRemarks] = rows[i];
    if (
      rowCategory === category &&
      typeof rowRemarks === "string" &&
      rowRemarks.trim().toLowerCase() === normalizedRemarks
    ) {
      const amount = parseFloat(String(amountRaw).replace(/[^0-9.-]/g, ""));
      if (Number.isNaN(amount)) continue;
      const rawAmount = String(formulaRows[i]?.[2] ?? amount);
      return { rowNumber: i + 1, rawAmount };
    }
  }
  return null;
}

/** Appends "+amount" onto the cell's existing formula (or plain number), so the cell keeps a running formula. */
async function addToAmountFormula(
  tabName: string,
  rowNumber: number,
  rawAmount: string,
  amountToAdd: number
): Promise<void> {
  const sheets = getSheetsClient();
  const base = rawAmount.startsWith("=") ? rawAmount.slice(1) : rawAmount;
  const formula = `=${base}+${amountToAdd}`;
  const range = `${quoteSheetName(tabName)}!${AMOUNT_COLUMN}${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[formula]] },
  });
}

/**
 * Records an expense, applying accumulate-in-place rules (see config.ts)
 * first: if the category+remarks match a rule and an existing row for this
 * month already has that combo, its amount is increased in place instead of
 * appending a new row. Otherwise falls back to a normal append.
 */
export async function recordExpense(
  tabName: string,
  expense: Expense
): Promise<{ mode: "accumulated" | "added" }> {
  if (findAccumulateRule(expense.category, expense.remarks)) {
    const existing = await findAccumulateRow(tabName, expense.category, expense.remarks);
    if (existing) {
      await addToAmountFormula(tabName, existing.rowNumber, existing.rawAmount, expense.amount);
      return { mode: "accumulated" };
    }
  }
  await appendExpense(tabName, expense);
  return { mode: "added" };
}

export interface BudgetLineItem {
  /** Sheet row number, needed to write the name/cost back to the right cells. */
  row: number;
  /** Empty string means this slot is unused and available for a new line item. */
  name: string;
  cost: number;
}

export interface BudgetData {
  incomeBeforeTax: number;
  /** Derived by the sheet's own formula from incomeBeforeTax — not directly editable. */
  incomeAfterTax: number;
  /** The rate currently baked into the income-after-tax formula, or null if it doesn't match that pattern yet (e.g. an old CPF-based formula). */
  taxRatePercent: number | null;
  savingsPercent: number;
  essentialPercent: number;
  /** "Amount allowed to Spend after Savings" */
  essentialAmount: number;
  savingsAmount: number;
  lineItems: BudgetLineItem[];
  total: number;
}

function toNumber(value: unknown): number {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

const TAX_FORMULA_PATTERN = /^=A2\*\(1-([\d.]+)\/100\)$/;

/** e.g. 18.5 -> "=A2*(1-18.5/100)" */
function incomeAfterTaxFormula(taxRatePercent: number): string {
  return `=A2*(1-${taxRatePercent}/100)`;
}

/**
 * Reads the Income/Spending Breakdown block (columns A:F, top of the tab).
 * Everything except incomeBeforeTax, the tax rate baked into B2's formula,
 * savingsPercent, and each line item's name/cost is computed by the sheet's
 * own formulas — the app only ever writes those, never the derived fields.
 */
export async function getBudget(tabName: string): Promise<BudgetData> {
  const sheets = getSheetsClient();
  const range = `${quoteSheetName(tabName)}!A1:F40`;
  // Fetched unformatted so percentage/currency-formatted cells (e.g. "50%",
  // "$8,500.00") come back as plain numbers (0.5, 8500) instead of display
  // strings that would otherwise need re-scaling per cell's own formatting.
  // B2 is fetched separately as a raw formula to recover the tax rate.
  const [res, b2Res] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range, valueRenderOption: "UNFORMATTED_VALUE" }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${quoteSheetName(tabName)}!B2`,
      valueRenderOption: "FORMULA",
    }),
  ]);
  const rows = res.data.values ?? [];

  const lineItems: BudgetLineItem[] = [];
  let total = 0;
  // Line item rows start at sheet row 3 (index 2) and run up to (not
  // including) the "Total" row — stop there so the separate Expenses table
  // further down the same tab is never mistaken for more line items.
  for (let i = 2; i < rows.length; i++) {
    const name = rows[i]?.[3];
    const label = typeof name === "string" ? name.trim() : "";
    if (label === "Total") {
      total = toNumber(rows[i]?.[4]);
      break;
    }
    if (label === "Remaining") break;
    lineItems.push({ row: i + 1, name: label, cost: toNumber(rows[i]?.[4]) });
  }

  const b2Formula = String(b2Res.data.values?.[0]?.[0] ?? "");
  const taxMatch = b2Formula.match(TAX_FORMULA_PATTERN);

  return {
    incomeBeforeTax: toNumber(rows[1]?.[0]),
    incomeAfterTax: toNumber(rows[1]?.[1]),
    taxRatePercent: taxMatch ? Number(taxMatch[1]) : null,
    savingsPercent: toNumber(rows[4]?.[1]) * 100,
    essentialPercent: toNumber(rows[4]?.[0]) * 100,
    essentialAmount: toNumber(rows[7]?.[0]),
    savingsAmount: toNumber(rows[7]?.[1]),
    lineItems,
    total,
  };
}

export async function updateBudget(
  tabName: string,
  input: {
    incomeBeforeTax: number;
    taxRatePercent: number;
    savingsPercent: number;
    lineItems: { row: number; name: string; cost: number }[];
  }
): Promise<void> {
  const sheets = getSheetsClient();
  const sheetPrefix = quoteSheetName(tabName);
  const data = [
    { range: `${sheetPrefix}!A2`, values: [[input.incomeBeforeTax]] },
    { range: `${sheetPrefix}!B2`, values: [[incomeAfterTaxFormula(input.taxRatePercent)]] },
    { range: `${sheetPrefix}!B5`, values: [[input.savingsPercent / 100]] },
    ...input.lineItems.map((item) => ({
      range: `${sheetPrefix}!D${item.row}:E${item.row}`,
      values: [[item.name, item.cost]],
    })),
  ];
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
}

export async function getMonthExpenses(tabName: string): Promise<Expense[]> {
  const sheets = getSheetsClient();
  const range = `${quoteSheetName(tabName)}!${TABLE_COLUMNS}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  const rows = res.data.values ?? [];
  const expenses: Expense[] = [];
  for (const row of rows) {
    const [dateStr, category, amountRaw, remarks] = row;
    const date = parseSheetDate(dateStr);
    const amount = parseFloat(String(amountRaw).replace(/[^0-9.-]/g, ""));
    if (!date || !category || Number.isNaN(amount)) continue;
    expenses.push({ date, category, amount, remarks: remarks ?? "" });
  }
  return expenses;
}
