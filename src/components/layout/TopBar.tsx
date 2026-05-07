"use client";
import { Bell, Globe, Check, LogOut, User as UserIcon } from "lucide-react"
import { auth, logout } from "@/lib/firebase"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "motion/react"
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast"

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "ml", name: "മലയാളം" },
  { code: "bn", name: "বাংলা" },
  { code: "mr", name: "मराठी" },
  { code: "gu", name: "ગુજરાતી" },
  { code: "pa", name: "ਪੰਜਾਬੀ" },
  { code: "or", name: "ଓଡ଼ିଆ" },
  { code: "as", name: "অসমীয়া" },
  { code: "ur", name: "اردو" },
  { code: "raj", name: "राजस्थानी" },
]

interface TopBarProps {
  userName?: string
}

export function TopBar({ userName }: TopBarProps) {
  const { t, i18n } = useTranslation()
  const [showLanguages, setShowLanguages] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const user = auth.currentUser
  const router = useRouter()
  const { showToast } = useToast()

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    setShowLanguages(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      showToast(t("logoutSuccess"), "success")
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
      showToast(t("failedToLogout"), "error")
    }
  }

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0]

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-pink-50 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold font-nunito text-[#1A1A2E]">
            {userName ? `${t('goodMorning')}, ${userName} 👋` : `${t('welcome')} 👋`}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowLanguages(!showLanguages)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-pink-100 shadow-sm hover:shadow-md transition-all"
            >
              <Globe className="w-4 h-4 text-[#E91E63]" />
              <span className="text-xs font-bold uppercase text-[#1A1A2E]">
                {currentLanguage.code}
              </span>
            </button>

            <AnimatePresence>
              {showLanguages && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowLanguages(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-50 py-2 z-50 max-h-[400px] overflow-y-auto custom-scrollbar"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-pink-50 transition-colors"
                      >
                        <span className={i18n.language === lang.code ? "font-bold text-[#E91E63]" : "text-gray-700"}>
                          {lang.name}
                        </span>
                        {i18n.language === lang.code && (
                          <Check className="w-4 h-4 text-[#E91E63]" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <button className="p-2 rounded-full bg-white border border-pink-100 shadow-sm hover:shadow-md transition-all relative">
            <Bell className="w-5 h-5 text-[#1A1A2E]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E91E63] rounded-full border-2 border-white" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-full border-2 border-[#E91E63] overflow-hidden shadow-sm hover:scale-105 transition-transform"
            >
              <img
                src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                alt="User"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-50 py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-pink-50">
                      <p className="text-xs font-bold text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        router.push("/profile")
                        setShowUserMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-pink-50 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-[#E91E63]" />
                      {t("profile")}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("logout")}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
