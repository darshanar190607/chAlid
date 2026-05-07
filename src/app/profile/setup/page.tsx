"use client";
import dynamic from "next/dynamic";

const BabyProfileSetup = dynamic(() => import("@/views/BabyProfileSetup"), { ssr: false });

export default function Page() {
  return <BabyProfileSetup />;
}
