"use client";
import dynamic from "next/dynamic";

const LandingPage = dynamic(() => import("@/views/LandingPage"), { ssr: false });

export default function Page() {
  return <LandingPage />;
}
