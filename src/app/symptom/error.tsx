"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error tracking service
    }
  }, [error]);
  return (
    <div className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
        <AlertCircle className="w-10 h-10 text-red-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold font-nunito text-[#1A1A2E]">Something went wrong</h2>
        <p className="text-gray-500 text-sm max-w-xs">An unexpected error occurred. Please try again.</p>
      </div>
      <Button onClick={reset} className="bg-[#FF6B35] text-white h-12 px-8 rounded-2xl font-bold">Try Again</Button>
    </div>
  );
}
