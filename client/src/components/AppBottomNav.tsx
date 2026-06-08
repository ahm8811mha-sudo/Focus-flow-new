import { BrainCircuit, CalendarDays, FolderKanban, House, ListChecks } from "lucide-react";
import { useLocation } from "wouter";

const items = [
  { href: "/", label: "الرئيسية", icon: House },
  { href: "/tasks", label: "المهام", icon: ListChecks },
  { href: "/agents", label: "الوكلاء", icon: BrainCircuit },
  { href: "/projects", label: "المشاريع", icon: FolderKanban },
  { href: "/calendar", label: "التقويم", icon: CalendarDays },
];

export default function AppBottomNav() {
  const [location] = useLocation();

  if (location === "/" || location === "/focus") return null;

  return (
    <nav className="ff-app-bottom-nav" aria-label="التنقل الرئيسي">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
        return (
          <a key={item.href} href={item.href} className={active ? "active" : undefined}>
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
