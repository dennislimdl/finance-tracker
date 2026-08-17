export interface Category {
  name: string;
  color: string;
  textColor: string;
}

// Mirrors the dropdown colors used in the Google Sheet.
export const CATEGORIES: Category[] = [
  { name: "Food", color: "#1c4587", textColor: "#ffffff" },
  { name: "Parents", color: "#38761d", textColor: "#ffffff" },
  { name: "Entertainment", color: "#a4c2f4", textColor: "#1c2b4a" },
  { name: "Transport", color: "#274e4e", textColor: "#ffffff" },
  { name: "Health & Fitness", color: "#f4c7a1", textColor: "#5c3a21" },
  { name: "Bill", color: "#a61c1c", textColor: "#ffffff" },
  { name: "Retail", color: "#c5e0b4", textColor: "#2f4f2f" },
  { name: "Travel", color: "#f1c232", textColor: "#4a3b00" },
  { name: "Gift", color: "#9fc5e8", textColor: "#1c2b4a" },
  { name: "Skincare", color: "#f6a15c", textColor: "#5c2f00" },
];

export function findCategory(name: string): Category | undefined {
  return CATEGORIES.find((c) => c.name === name);
}
