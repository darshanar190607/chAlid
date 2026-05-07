import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page Not Found" };

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="text-8xl font-black text-[#FF6B35] opacity-20">404</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold font-nunito text-[#1A1A2E]">Page not found</h2>
        <p className="text-gray-500 text-sm max-w-xs">The page you are looking for does not exist.</p>
      </div>
      <Link href="/dashboard" className="bg-[#FF6B35] text-white h-12 px-8 rounded-2xl font-bold inline-flex items-center">
        Go to Dashboard
      </Link>
    </div>
  );
}
