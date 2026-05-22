"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Video Clipper" },
  { href: "/thumbnail", label: "Thumbnail Clipper" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-nvidia-border bg-nvidia-dark/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-nvidia-green/20 bg-nvidia-green/10">
            <svg
              className="h-6 w-6 text-nvidia-green"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">NV Video Clipper</h1>
        </div>

        <nav aria-label="Primary navigation">
          <div className="flex rounded-lg border border-nvidia-border bg-nvidia-gray/40 p-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-nvidia-dark ${
                    isActive
                      ? "bg-nvidia-green text-black"
                      : "text-gray-300 hover:bg-nvidia-gray-light hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
