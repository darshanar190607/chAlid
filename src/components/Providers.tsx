"use client";
import React from "react";
import { ToastProvider } from "@/components/ui/Toast";
import "../i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
