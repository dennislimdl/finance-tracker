"use client";

import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "./icons";

interface Props {
  tabs: string[];
  value: string;
}

export default function MonthSelect({ tabs, value }: Props) {
  const router = useRouter();

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => router.push(`/overview?month=${encodeURIComponent(e.target.value)}`)}
        className="appearance-none rounded-full border border-card-border bg-card py-2 pl-3 pr-8 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-accent"
      >
        {tabs.map((t) => (
          <option key={t} value={t}>
            {t.trim()}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}
