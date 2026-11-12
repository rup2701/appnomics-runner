// Four small line icons so the reference needs no icon package. An app that has lucide-react may swap these for CalendarCheck, PartyPopper, Truck and BookOpen.
const PATHS: Record<string, string> = {
  reserve: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 16l2 2 4-4",
  catering: "M3 11h18M5 11a7 7 0 0 1 14 0M12 4V2M4 15h16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2z",
  delivery: "M1 5h13v11H1zM14 9h4l3 3v4h-7zM6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  menu: "M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z",
};

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.menu} />
    </svg>
  );
}
