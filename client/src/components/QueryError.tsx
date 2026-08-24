import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-[#f2d4d1] bg-[#fff8f7] p-7 text-center">
      <AlertCircle className="mx-auto size-8 text-red-600" />
      <p className="mt-3 text-sm leading-7 text-red-700">{message}</p>
      <Button onClick={onRetry} variant="outline" className="mt-4 rounded-xl border-red-200 text-red-700 hover:bg-red-50"><RefreshCw className="size-4" />إعادة المحاولة</Button>
    </div>
  );
}
