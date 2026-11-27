export function Brand({ large = false }: { large?: boolean }) {
  return <span className={`flex min-w-0 items-center ${large ? "flex-col gap-3 text-center" : "gap-2.5"}`}>
    <img src="/branding/star-goats-farm-logo.png" alt="Star Goats Farm logo" width={large ? 144 : 56} height={large ? 144 : 56} className={large ? "h-36 w-36 shrink-0 rounded-2xl bg-[#0c2015] p-2 object-contain" : "h-14 w-14 shrink-0 rounded-xl bg-[#0c2015] p-1 object-contain"} />
    <span className={`min-w-0 font-sans font-bold leading-tight text-primary ${large ? "text-2xl" : "text-base sm:text-lg"}`}>Star Goats<span className={large ? "" : "block sm:inline"}> Farm</span></span>
  </span>;
}
