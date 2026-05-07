"use client";
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation";
import { motion } from "motion/react"
import { LogIn, Phone, ShieldCheck, ArrowRight, Globe, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { signInWithGoogle, auth } from "@/lib/firebase"
import { useToast } from "@/components/ui/Toast"
import { onAuthStateChanged } from "firebase/auth"
import { useTranslation } from "react-i18next"

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "ml", name: "Malayalam (മലയാളം)" },
  { code: "bn", name: "Bengali (বাংলা)" },
  { code: "mr", name: "Marathi (मराठी)" },
  { code: "gu", name: "Gujarati (ગુજરાતી)" },
  { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "or", name: "Odia (ଓଡ଼ିଆ)" },
  { code: "as", name: "Assamese (অসমীয়া)" },
  { code: "ur", name: "Urdu (اردو)" },
  { code: "raj", name: "Rajasthani (राजस्थानी)" },
]

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { showToast } = useToast()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard")
      } else {
        setIsLoading(false)
      }
    })
    return () => unsubscribe()
  }, [router])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const result = await signInWithGoogle()
      const user = result.user
      
      const token = await user.getIdToken()
      // Sync user profile to Postgres via API
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: user.displayName || "",
          phone: user.phoneNumber || "",
          language: i18n.language
        })
      })

      // Check if baby profile exists to decide routing
      const babyRes = await fetch(`/api/baby?firebaseUid=${user.uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (babyRes.ok) {
        const babies = await babyRes.json()
        if (babies && babies.length > 0) {
          showToast(t('welcomeBack'), "success")
          router.push("/dashboard")
          return
        }
      }
      
      showToast(t('welcomeToChaiidSetup'), "success")
      router.push("/profile/setup")
    } catch (error) {
      console.error("Login error:", error)
      showToast(t('failedToSignIn'), "error")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !auth.currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FF2D55] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pink-50/30 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block space-y-8"
        >
          <div className="space-y-4">
            <h1 className="text-5xl font-bold font-nunito text-[#1A1A2E] leading-tight">
              {t('welcomeTo')} <span className="text-[#FF2D55]">chAIid</span>
            </h1>
            <p className="text-xl text-gray-600 font-dm-sans leading-relaxed">
              {t('heroDescription')}
            </p>
          </div>
          <div className="relative aspect-square w-full max-w-sm mx-auto bg-white rounded-[48px] shadow-2xl overflow-hidden border-8 border-white">
            <img 
              src="https://picsum.photos/seed/ai-chatbot-login/600/600" 
              alt="AI Assistant Illustration" 
              className="w-full h-full object-cover opacity-90"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#FF2D55]/20 to-transparent" />
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-white/20 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#FF2D55] flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-[#1A1A2E] font-black text-xs uppercase tracking-wider">AI Assistant</p>
              </div>
              <p className="text-[#1A1A2E] font-bold text-sm leading-relaxed">"{t('aiAssistantGreeting')}"</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto"
        >
        <Card className="border-none shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-[#FF2D55]" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-nunito text-[#1A1A2E]">{t('welcome')}</CardTitle>
              <CardDescription className="text-base">{t('joinParents')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Input
                label={t('phoneNumber')}
                placeholder={t('enter10Digit')}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-16 text-lg"
              />
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-pink-50 border border-pink-100">
                <Globe className="w-5 h-5 text-[#FF2D55]" />
                <select 
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                  className="bg-transparent text-sm font-bold text-[#1A1A2E] focus:outline-none flex-1"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                className="w-full h-16 text-xl font-bold bg-[#FF2D55] hover:bg-[#E61E44]"
                disabled={phone.length < 10 || isLoading}
                onClick={() => showToast(t('otpComingSoon'), "info")}
              >
                {t('sendOtp')}
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-500 font-bold">{t('orContinueWith')}</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-16 text-lg font-bold border-gray-200 text-[#4A4E69] hover:bg-pink-50"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-6 h-6 mr-3"
              />
              {isLoading ? t('loading') : t('googleSignIn')}
            </Button>

            <p className="text-center text-sm text-gray-500 font-dm-sans">
              {t('termsAgreement')} <br />
              <span className="text-[#FF2D55] font-bold">{t('termsOfService')}</span> {t('and')} <span className="text-[#FF2D55] font-bold">{t('privacyPolicy')}</span>
            </p>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  )
}
