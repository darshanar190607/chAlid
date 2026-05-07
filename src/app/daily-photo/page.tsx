"use client";
import dynamic from "next/dynamic";

const DailyPhotoView = dynamic(() => import("@/views/DailyPhotoView"), { ssr: false });

export default function Page() {
  return <DailyPhotoView />;
}
