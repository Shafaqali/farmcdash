export function Brand({ large = false }: { large?: boolean }) {
  return <span className={`block min-w-0 break-words font-display font-semibold leading-tight text-primary ${large ? "text-center text-3xl" : "text-xl"}`}>STAR GOATS FARM</span>;
}