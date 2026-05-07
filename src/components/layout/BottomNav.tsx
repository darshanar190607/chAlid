"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Scan, Hospital, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

export function BottomNav() {
  const { t } = useTranslation()
  const pathname = usePathname()

  const navItems = [
    { icon: Home, label: t("home"), path: "/dashboard" },
    { icon: MessageCircle, label: t("chat"), path: "/chat" },
    { icon: Scan, label: t("scan"), path: "/scan" },
    { icon: Hospital, label: t("hospital"), path: "/hospital" },
    { icon: User, label: t("profile"), path: "/profile" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-pink-50 px-4 py-2 md:hidden">
      <div className="flex justify-between items-center max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-2 transition-all duration-200",
                isActive ? "text-[#E91E63]" : "text-gray-400"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-current")} />
              <span className="text-[10px] font-medium font-dm-sans">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
