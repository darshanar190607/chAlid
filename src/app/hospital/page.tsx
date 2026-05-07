"use client";
import dynamic from "next/dynamic";

const HospitalFinder = dynamic(() => import("@/views/HospitalFinder"), { ssr: false });

export default function Page() {
  return <HospitalFinder />;
}
