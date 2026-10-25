import type { ReactNode } from "react";
export const field = "w-full rounded-xl border bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";
export const F = ({ label, children }: { label: string; children: ReactNode }) => <label className="block space-y-1.5"><span className="text-sm text-muted-foreground">{label}</span>{children}</label>;
