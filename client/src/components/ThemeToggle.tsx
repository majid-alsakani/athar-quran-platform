import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === "light" ? "تفعيل الوضع الليلي" : "تفعيل الوضع الفاتح";
  return <Button type="button" variant="outline" size="icon" onClick={toggleTheme} aria-label={nextLabel} title={nextLabel} className="size-10 rounded-xl border-[#dce6df] bg-white/85 text-[#315b4e] hover:bg-[#edf6ef] dark:border-white/15 dark:bg-white/10 dark:text-[#e2f0e6] dark:hover:bg-white/15">{theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}</Button>;
}
