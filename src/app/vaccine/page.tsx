"use client";
import dynamic from "next/dynamic";

const VaccineTracker = dynamic(() => import("@/views/VaccineTracker"), { ssr: false });

export default function Page() {
  return <VaccineTracker />;
}
