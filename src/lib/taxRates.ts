export interface CountryTaxRate {
  name: string;
  /** Approximate effective personal income tax rate, as a percentage. */
  rate: number;
}

/**
 * Rough effective personal income tax rate estimates per country. Real tax
 * systems are progressive/bracketed and depend on income level, filing
 * status, deductions, etc. — these are reasonable starting points, not
 * exact figures. The resulting rate is always editable after picking a
 * country, so you can override it with your actual known effective rate.
 */
export const COUNTRY_TAX_RATES: CountryTaxRate[] = [
  { name: "Australia", rate: 25 },
  { name: "Canada", rate: 26 },
  { name: "China", rate: 20 },
  { name: "France", rate: 28 },
  { name: "Germany", rate: 30 },
  { name: "Hong Kong", rate: 15 },
  { name: "India", rate: 20 },
  { name: "Indonesia", rate: 15 },
  { name: "Japan", rate: 20 },
  { name: "Malaysia", rate: 14 },
  { name: "New Zealand", rate: 21 },
  { name: "Philippines", rate: 20 },
  { name: "Singapore", rate: 7 },
  { name: "South Korea", rate: 24 },
  { name: "Switzerland", rate: 22 },
  { name: "Thailand", rate: 15 },
  { name: "United Arab Emirates", rate: 0 },
  { name: "United Kingdom", rate: 20 },
  { name: "United States", rate: 22 },
  { name: "Vietnam", rate: 15 },
];
