"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, PlusIcon, WalletIcon } from "./icons";

const TABS = [
  { href: "/", label: "Add", Icon: PlusIcon },
  { href: "/overview", label: "Overview", Icon: ChartIcon },
  { href: "/budget", label: "Budget", Icon: WalletIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-sm items-center justify-around gap-1 rounded-full border border-card-border bg-nav px-2 py-2 shadow-lg backdrop-blur-lg">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-xs font-medium transition ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
