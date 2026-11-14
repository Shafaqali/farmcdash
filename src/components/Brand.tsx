import headerLogo from "@/assets/star-goats-farm-header-compact.png.asset.json";

export function Brand({ large = false }: { large?: boolean }) {
  return <span className={`flex min-w-0 items-center ${large ? "flex-col gap-3 text-center" : "gap-2"}`}>
    <img src={headerLogo.url} alt="Star Goats Farm logo" width={large ? 88 : 48} height={large ? 88 : 48} className={large ? "h-[88px] w-[88px] shrink-0 object-contain" : "h-12 w-12 shrink-0 object-contain"} />
    <span className={`min-w-0 font-display font-semibold leading-tight text-primary ${large ? "text-2xl" : "text-lg"}`}>Star Goats Farm</span>
  </span>;
}