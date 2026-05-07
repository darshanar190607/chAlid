"use client";
import dynamic from "next/dynamic";

const LoginPage = dynamic(() => import("@/views/LoginPage"), { ssr: false });

export default function Page() {
  return <LoginPage />;
}
