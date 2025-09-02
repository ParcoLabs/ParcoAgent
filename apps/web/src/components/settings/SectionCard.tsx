// client/src/components/settings/SectionCard.tsx
import React from "react";

export default function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
