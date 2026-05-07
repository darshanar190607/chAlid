"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";

const HospitalDirections = dynamic(() => import("@/views/HospitalDirections"), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-white">Loading maps...</div>}>
      <HospitalDirections />
    </Suspense>
  );
}
