"use client";
import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation";
import { motion } from "motion/react"
import { Heart, Camera, ArrowRight, Baby, Calendar, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { auth } from "@/lib/firebase"
import { useToast } from "@/components/ui/Toast"

export default function BabyProfileSetup() {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState<"male" | "female" | "other">("male")
  const [isPreterm, setIsPreterm] = useState(false)
  const [weeksGestation, setWeeksGestation] = useState("40")
  const [birthWeight, setBirthWeight] = useState("")
  const [babyPhoto, setBabyPhoto] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [user, setUser] = useState(auth.currentUser)
  const router = useRouter()
  const { showToast } = useToast()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showToast('Photo should be less than 5MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setBabyPhoto(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u)
      setIsAuthLoading(false)
      if (!u && !isAuthLoading) {
        router.push("/login")
      }
    })
    return () => unsubscribe()
  }, [router, isAuthLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      showToast(t('mustBeLoggedIn'), "error")
      return
    }
    if (!name || !dob || !gender || !birthWeight) {
      showToast(t('fillRequiredFields'), "error")
      return
    }

    if (isPreterm && !weeksGestation) {
      showToast(t('provideGestation'), "error")
      return
    }

    setIsLoading(true)
    const path = "babies"
    const babyData = {
      user_id: user.uid,
      name,
      dob,
      gender,
      is_preterm: isPreterm,
      weeks_gestation: isPreterm ? parseInt(weeksGestation) : 40,
      birth_weight: parseFloat(birthWeight),
      current_weight: parseFloat(birthWeight),
      created_at: new Date().toISOString()
    }
    
    console.log("Attempting to create baby profile with data:", babyData)
    
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/baby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          phone: user.phoneNumber,
          name,
          dob,
          gender,
          isPremature: isPreterm,
          weeksGestation: isPreterm ? parseInt(weeksGestation) : 40,
          birthWeight: parseFloat(birthWeight),
          photoUrl: babyPhoto, // Include the photo URL
          description // Include the description
        })
      })

      if (!response.ok) throw new Error("Failed to create profile")
      
      showToast(t('profileCreated'), "success")
      router.push("/dashboard")
    } catch (error) {
      console.error(error)
      showToast(t('failedToCreateProfile'), "error")
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-pink-50/30 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E91E63] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pink-50/30 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-20 h-20 bg-pink-100 rounded-[32px] flex items-center justify-center shadow-lg shadow-pink-100/50 border-4 border-white">
              <img 
                src="https://picsum.photos/seed/ai-baby-setup/200/200" 
                alt="AI Assistant" 
                className="w-16 h-16 object-cover rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-nunito text-[#1A1A2E]">{t('welcomeToChaiidSetup')}</CardTitle>
              <CardDescription className="text-base font-medium">{t('aiAssistantDescription')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center mb-8">
                <div className="relative group cursor-pointer" onClick={triggerFileInput}>
              <div className="mx-auto w-28 h-28 rounded-[40px] overflow-hidden border-4 border-white shadow-xl bg-pink-50 relative group cursor-pointer">
                <img 
                  src={babyPhoto || "https://picsum.photos/seed/baby-avatar/300/300"} 
                  alt="Baby Avatar" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#FF2D55] rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
                </div>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 gap-5">
                <Input
                  label={t('babyName')}
                  placeholder={t('enterName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 rounded-2xl border-gray-100 focus:border-[#FF2D55]"
                  required
                />

                <Input
                  label={t('dob')}
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-14 rounded-2xl border-gray-100 focus:border-[#FF2D55]"
                  required
                />

                <Input
                  label={t('birthWeight')}
                  type="number"
                  step="0.01"
                  placeholder={t('birthWeightPlaceholder')}
                  value={birthWeight}
                  onChange={(e) => setBirthWeight(e.target.value)}
                  className="h-14 rounded-2xl border-gray-100 focus:border-[#FF2D55]"
                  required
                />

                <div>
                  <label className="block text-sm font-bold text-[#1A1A2E] font-nunito ml-1 mb-2">
                    {t('description') || 'Description (Optional)'}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('babyDescriptionPlaceholder') || 'Add any notes about your baby...'}
                    className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/20 h-24 resize-none font-medium text-[#1A1A2E] placeholder-gray-400"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    {description.length}/500 characters
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-[#1A1A2E] font-nunito ml-1">{t('gender')}</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`h-14 rounded-2xl border-2 font-bold capitalize transition-all duration-300 ${
                        gender === g
                          ? "border-[#FF2D55] bg-pink-50 text-[#FF2D55] shadow-md shadow-pink-100"
                          : "border-gray-100 bg-white text-gray-400 hover:border-pink-100"
                      }`}
                    >
                      {t(g)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-5 bg-pink-50/50 rounded-3xl border border-pink-100">
                  <div className="space-y-1">
                    <p className="font-bold text-[#1A1A2E] font-nunito">{t('prematureMode')}</p>
                    <p className="text-xs text-gray-500 font-medium">{t('bornBefore37Weeks')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPreterm(!isPreterm)}
                    className={`w-14 h-8 rounded-full transition-all duration-300 relative ${
                      isPreterm ? "bg-[#FF2D55]" : "bg-gray-200"
                    }`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${
                      isPreterm ? "left-7" : "left-1"
                    }`} />
                  </button>
                </div>

                {isPreterm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3"
                  >
                    <Input
                      label={t('weeksGestation')}
                      type="number"
                      min="20"
                      max="36"
                      value={weeksGestation}
                      onChange={(e) => setWeeksGestation(e.target.value)}
                      className="h-14 rounded-2xl border-gray-100 focus:border-[#FF2D55]"
                      required={isPreterm}
                    />
                    <p className="text-xs text-[#FF2D55] font-bold ml-1">
                      {t('correctedAgeExplanation')}
                    </p>
                  </motion.div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-16 text-xl font-bold rounded-2xl"
                disabled={isLoading}
              >
                {t('completeSetup')}
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
