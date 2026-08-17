// Central place for assumptions about the Google Sheet's layout.
// Adjust these if your "Expenses" table doesn't start in column A.

export const SHEET_ID = process.env.GOOGLE_SHEET_ID ?? "";

// Columns of the Expenses table, in order: Date | Category | Amount | Remarks
// (row 17 has the "Expenses" title, row 18 the headers, data from row 19 on;
// columns H onward hold an unrelated category/pivot summary table — leave it alone)
export const TABLE_COLUMNS = "D:G";

// Category + remarks combos that should accumulate into one existing row
// per month instead of appending a new row each time — e.g. daily public
// transport top-ups that should just show as a running monthly total.
interface AccumulateRule {
  category: string;
  remarks: string;
}

const ACCUMULATE_RULES: AccumulateRule[] = [{ category: "Transport", remarks: "Public Transport" }];

export function findAccumulateRule(category: string, remarks: string): AccumulateRule | undefined {
  const normalizedRemarks = remarks.trim().toLowerCase();
  return ACCUMULATE_RULES.find(
    (rule) => rule.category === category && rule.remarks.toLowerCase() === normalizedRemarks
  );
}
