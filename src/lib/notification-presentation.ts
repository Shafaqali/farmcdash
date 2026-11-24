/** Presentation only: preserve server titles, identifiers and private data boundaries. */
export function notificationPresentation(title: string, kind = "") {
  const text = title.toLowerCase();
  if (kind === "payment" || /payment|balance/.test(text)) return { emoji: "\uD83D\uDCB3", label: "Payment reminder", type: "payment" } as const;
  if (/vaccin/.test(text)) return { emoji: "\uD83D\uDC89", label: "Vaccination", type: "vaccine" } as const;
  if (/health|illness|treatment/.test(text)) return { emoji: "\uD83E\uDE7A", label: "Health update", type: "health" } as const;
  if (/weight|growth/.test(text)) return { emoji: "\uD83D\uDCC8", label: "Growth update", type: "growth" } as const;
  return { emoji: "\uD83D\uDD14", label: "Farm update", type: "update" } as const;
}
