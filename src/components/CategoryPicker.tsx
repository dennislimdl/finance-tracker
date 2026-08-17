"use client";

import { CATEGORIES } from "@/lib/categories";

interface Props {
  value: string | null;
  onChange: (name: string) => void;
}

export default function CategoryPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => {
        const selected = value === c.name;
        return (
          <button
            key={c.name}
            type="button"
            onClick={() => onChange(c.name)}
            style={{
              backgroundColor: c.color,
              color: c.textColor,
              outline: selected ? `2px solid ${c.textColor}` : "none",
              outlineOffset: 2,
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
              selected ? "scale-105 shadow-md" : "opacity-80"
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
