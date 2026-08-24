import { Button } from "@/components/ui/button";
import { exportWeeklyReportPdf, type WeeklyPdfRecord } from "@/lib/weeklyPdf";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
  studentName: string;
  weekStart: Date | string;
  present: number;
  attendanceTotal: number;
  records: WeeklyPdfRecord[];
};

export default function WeeklyPdfButton({ studentName, weekStart, present, attendanceTotal, records }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await exportWeeklyReportPdf({ studentName, weekStart, present, attendanceTotal, records });
    } catch {
      setError("تعذر إنشاء ملف PDF الآن. حاول مرة أخرى.");
    } finally {
      setIsGenerating(false);
    }
  };

  return <div className="flex flex-col items-stretch gap-2 sm:items-end"><Button onClick={handleExport} disabled={isGenerating} variant="outline" className="h-10 rounded-xl border-[#cdded2] bg-white text-[#285b4c] hover:bg-[#edf6ef]">{isGenerating ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}تنزيل التقرير PDF</Button>{error ? <p className="text-xs text-red-700">{error}</p> : null}</div>;
}
