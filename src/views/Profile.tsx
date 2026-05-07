"use client";
import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { User, Baby, Settings, LogOut, ChevronRight, Globe, Bell, Shield, HelpCircle, FileText, Share2, Plus, Camera, TrendingUp, Heart, Calendar, Zap, ArrowRight, Link2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Modal } from "@/components/ui/Modal"
import { Input } from "@/components/ui/Input"
import { TopBar } from "@/components/layout/TopBar"
import { BottomNav } from "@/components/layout/BottomNav"
import { auth, logout } from "@/lib/firebase"
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast"
import { format, differenceInMonths } from "date-fns"
import { cn } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"

interface Baby {
  id: string
  name: string
  dob: string
  gender: string
  photo_url?: string
}

export default function Profile() {
  const { t } = useTranslation()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [babies, setBabies] = useState<Baby[]>([])
  const [weightLogs, setWeightLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [abhaModal, setAbhaModal] = useState(false)
  const [abhaId, setAbhaId] = useState("")
  const [abhaLinked, setAbhaLinked] = useState("")
  const [abhaSaving, setAbhaSaving] = useState(false)
  const user = auth.currentUser
  const router = useRouter()
  const { showToast } = useToast()

  useEffect(() => {
    if (!user) return

    const fetchProfileData = async () => {
      try {
        const token = await user.getIdToken()
        const [babyRes, profileRes] = await Promise.all([
          fetch(`/api/baby?firebaseUid=${user.uid}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/auth/profile?firebaseUid=${user.uid}`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        
        let babyList: Baby[] = []
        if (babyRes.ok) {
          babyList = await babyRes.json()
          setBabies(Array.isArray(babyList) ? babyList : [])
        }
        
        if (profileRes.ok) {
          const profile = await profileRes.json()
          setUserProfile(profile)
          if (profile?.abhaId) setAbhaLinked(profile.abhaId)
        }

        // Fetch weight logs for the first baby if exists
        if (babyList.length > 0) {
          const weightRes = await fetch(`/api/weight?babyId=${babyList[0].id}&firebaseUid=${user.uid}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (weightRes.ok) {
            setWeightLogs(await weightRes.json())
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile data", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()

  }, [user])

  const handleSaveAbha = async () => {
    if (!abhaId.trim()) return
    setAbhaSaving(true)
    
    // Simulate Government API Verification
    showToast("Verifying with ABDM Registry...", "info");
    await new Promise(r => setTimeout(r, 2000));
    
    // Mock validation: Any 14 digit number starting with 91 is "valid" for demo
    if (!/^[0-9]{14}$/.test(abhaId.replace(/-/g, '')) && abhaId !== "TEST-ABHA-001") {
      showToast("Invalid ABHA ID format or not found in registry", "error");
      setAbhaSaving(false);
      return;
    }

    try {
      const token = await user!.getIdToken()
      const res = await fetch(`/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firebaseUid: user!.uid, abhaId: abhaId.trim() })
      })
      if (res.ok) {
        setAbhaLinked(abhaId.trim())
        setAbhaModal(false)
        showToast("ABHA ID Verified & Linked Successfully", "success")
      } else {
        showToast(t("abhaLinkFailed"), "error")
      }
    } catch {
      showToast(t("abhaLinkFailed"), "error")
    } finally {
      setAbhaSaving(false)
    }
  }

  const handleUnlinkAbha = async () => {
    setAbhaSaving(true)
    try {
      const token = await user!.getIdToken()
      const res = await fetch(`/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firebaseUid: user!.uid, abhaId: null })
      })
      if (res.ok) {
        setAbhaLinked("")
        setAbhaId("")
        setAbhaModal(false)
        showToast(t("abhaUnlinked"), "success")
      }
    } catch {
      showToast(t("abhaLinkFailed"), "error")
    } finally {
      setAbhaSaving(false)
    }
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

  const currentBaby = babies[0]
  const babyAgeMonths = currentBaby ? differenceInMonths(new Date(), new Date(currentBaby.dob)) : 0

  const handleExportHealthReport = async () => {
    if (!currentBaby) {
      showToast("No baby profile found to export", "error");
      return;
    }
    
    showToast("Generating Health Report...", "success");
    setIsLoading(true);
    
    try {
      const token = await user!.getIdToken();
      
      // Fetch all required data
      const [weightRes, vaccineRes, photoRes] = await Promise.all([
        fetch(`/api/weight?babyId=${currentBaby.id}&firebaseUid=${user!.uid}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/vaccine?babyId=${currentBaby.id}&firebaseUid=${user!.uid}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/baby/daily-photo?babyId=${currentBaby.id}&firebaseUid=${user!.uid}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const weights = weightRes.ok ? await weightRes.json() : [];
      const vaccines = vaccineRes.ok ? await vaccineRes.json() : [];
      const photos = photoRes.ok ? await photoRes.json() : [];

      // Import jsPDF dynamically
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(22);
      doc.text(`ChAIid Health Report: ${currentBaby.name}`, 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 20, 30);
      doc.text(`Age: ${babyAgeMonths} months | Gender: ${currentBaby.gender}`, 20, 40);
      
      // Weight Logs Section
      doc.setFontSize(16);
      doc.text("Recent Weight Logs", 20, 60);
      doc.setFontSize(12);
      let y = 70;
      if (weights.length === 0) {
        doc.text("No weight logs recorded.", 20, y);
        y += 10;
      } else {
        weights.slice(0, 5).forEach((w: any) => {
          doc.text(`- ${format(new Date(w.loggedAt), 'PP')}: ${w.weightKg} kg`, 20, y);
          y += 10;
        });
      }
      
      // Vaccines Section
      y += 10;
      doc.setFontSize(16);
      doc.text("Upcoming & Recent Vaccines", 20, y);
      doc.setFontSize(12);
      y += 10;
      if (vaccines.length === 0) {
        doc.text("No vaccine records found.", 20, y);
        y += 10;
      } else {
        vaccines.slice(0, 5).forEach((v: any) => {
          doc.text(`- ${v.vaccineName} (${v.status}): ${format(new Date(v.scheduledDate), 'PP')}`, 20, y);
          y += 10;
        });
      }

      // Daily Photos Analysis Summary
      y += 10;
      doc.setFontSize(16);
      doc.text("Recent AI Photo Analyses", 20, y);
      doc.setFontSize(12);
      y += 10;
      if (photos.length === 0) {
        doc.text("No daily photos analyzed yet.", 20, y);
      } else {
        photos.slice(0, 3).forEach((p: any) => {
          const status = p.isHealthy ? "Healthy" : "Attention Recommended";
          doc.text(`- ${format(new Date(p.date), 'PP')}: ${status}`, 20, y);
          if (p.analysisResult?.observation) {
            y += 10;
            const obsLines = doc.splitTextToSize(`  Obs: ${p.analysisResult.observation}`, 170);
            doc.text(obsLines, 20, y);
            y += (obsLines.length - 1) * 7;
          }
          y += 10;
        });
      }
      
      doc.save(`${currentBaby.name}_Health_Report.pdf`);
      showToast("Report Downloaded Successfully", "success");
      
    } catch (err) {
      console.error("PDF generation failed", err);
      showToast("Failed to generate PDF report", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { icon: Globe, label: t("languagePreference"), value: userProfile?.language === 'hi' ? 'Hindi' : 'English', color: "text-blue-600 bg-blue-50", onClick: undefined },
    { icon: Bell, label: t("notifications"), value: "On", color: "text-orange-600 bg-orange-50", onClick: undefined },
    { icon: Shield, label: t("privacyAndSecurity"), color: "text-emerald-600 bg-emerald-50", onClick: undefined },
    { icon: FileText, label: t("abhaIdLinking"), value: abhaLinked ? t("abhaLinked") : t("abhaNotLinked"), color: "text-purple-600 bg-purple-50", onClick: () => { setAbhaId(abhaLinked); setAbhaModal(true) } },
    { icon: Share2, label: t("exportHealthReport"), color: "text-orange-600 bg-orange-50", onClick: handleExportHealthReport },
    { icon: HelpCircle, label: t("helpAndSupport"), color: "text-gray-600 bg-gray-50", onClick: undefined },
  ]

  return (
    <div className="min-h-screen bg-[#FFF9F5] pb-24">
      <TopBar />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Profile Header */}
        <section className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
              <img
                src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                alt="User"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <button className="absolute bottom-1 right-1 w-10 h-10 bg-[#FF6B35] rounded-full flex items-center justify-center border-4 border-[#FFF9F5] shadow-lg">
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold font-nunito text-[#1A1A2E]">{userProfile?.name || user?.displayName}</h2>
            <p className="text-gray-500 font-medium">{userProfile?.phone || user?.phoneNumber || t("noPhoneLinked")}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl border-gray-200 px-8 h-12 text-sm font-bold">{t("editProfile")}</Button>
        </section>

        {/* Baby Profiles Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-nunito text-[#1A1A2E]">{t("babyProfiles")}</h3>
            <Link href="/profile/setup">
              <Button variant="ghost" size="sm" className="text-[#FF6B35] font-bold hover:bg-orange-50">
                <Plus className="w-4 h-4 mr-2" />
                {t("addNew")}
              </Button>
            </Link>
          </div>
          
          <div className="grid gap-4">
            {babies.length === 0 && !isLoading && (
              <Link href="/profile/setup">
                <Card className="border-2 border-dashed border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-all cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-8 h-8 text-[#FF6B35]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold font-nunito text-[#FF6B35]">{t("addBabyProfileBtn")}</h4>
                      <p className="text-sm text-gray-500">{t("addBabyProfileDesc")}</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-[#FF6B35]" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {babies.map(baby => (
              <Card key={baby.id} className="border-none shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-orange-100 overflow-hidden">
                    <img
                      src={baby.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${baby.id}`}
                      alt={baby.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-lg font-bold font-nunito">{baby.name}</h4>
                    <p className="text-sm text-gray-500">{differenceInMonths(new Date(), new Date(baby.dob))} {t("months")} · {t(baby.gender.toLowerCase())}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-50">
                    <ChevronRight className="w-6 h-6 text-gray-400" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Growth Chart Preview (Mock) */}
        {currentBaby && (
          <section className="space-y-4">
            <h3 className="text-xl font-bold font-nunito text-[#1A1A2E]">{t("growthTracking")}</h3>
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">{t("weightForAge")}</CardTitle>
                <CardDescription>{t("growthNormalRange", { name: currentBaby.name })}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64 w-full bg-white rounded-2xl relative p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightLogs.sort((a,b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="loggedAt" 
                        tickFormatter={(str) => format(new Date(str), 'MMM d')}
                        tick={{fontSize: 10}}
                        stroke="#999"
                      />
                      <YAxis 
                        domain={['dataMin - 1', 'dataMax + 1']}
                        tick={{fontSize: 10}}
                        stroke="#999"
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={(str) => format(new Date(str), 'PPPP')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weightKg" 
                        stroke="#FF6B35" 
                        strokeWidth={3} 
                        dot={{ r: 6, fill: '#FF6B35', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <Button variant="outline" className="w-full mt-6 h-14 rounded-xl border-gray-100 font-bold text-[#FF6B35]" onClick={() => router.push('/dashboard')}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("addTodayWeight")}
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Settings Menu */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-nunito text-[#1A1A2E]">{t("settingsAndMore")}</h3>
            <div className="flex items-center gap-2 bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
              <div className="w-2 h-2 bg-[#FF2D55] rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-[#FF2D55] uppercase tracking-wider">{t('aiAssistantActive')}</span>
            </div>
          </div>
          <Card className="border-none shadow-sm divide-y divide-gray-50 overflow-hidden">
            {menuItems.map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", item.color)}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-[#1A1A2E] group-hover:text-[#FF2D55] transition-colors">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && <span className="text-sm font-bold text-gray-400">{item.value}</span>}
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#FF2D55] transition-all group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </Card>
        </section>

        {/* AI Assistant Promo */}
        <Card className="bg-gradient-to-br from-[#FF2D55] to-[#FF6B35] border-none shadow-xl shadow-pink-100/50 overflow-hidden relative group cursor-pointer" onClick={() => router.push('/chat')}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-white/20 transition-all duration-500" />
          <CardContent className="p-8 flex items-center gap-8 relative z-10">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[32px] flex items-center justify-center flex-shrink-0 shadow-2xl border border-white/30 group-hover:scale-110 transition-transform duration-500">
              <img 
                src="https://picsum.photos/seed/ai-profile-assistant/300/300" 
                alt="AI Assistant" 
                className="w-20 h-20 object-cover rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-widest border border-white/20 backdrop-blur-sm">
                <Zap className="w-3 h-3" />
                {t('aiPowered')}
              </div>
              <h4 className="text-2xl font-bold text-white font-nunito leading-tight">{t('aiAssistantGreeting')}</h4>
              <p className="text-white/80 text-sm font-medium leading-relaxed max-w-xs">{t('aiAssistantDescription')}</p>
              <Button variant="ghost" className="p-0 text-white font-bold flex items-center gap-2 hover:bg-transparent hover:gap-3 transition-all">
                {t('aiAssistantChatNow')} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <section className="pt-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full h-16 rounded-2xl text-red-500 hover:bg-red-50 font-bold flex items-center justify-center gap-3"
          >
            <LogOut className="w-6 h-6" />
            {t("logoutFromChaid")}
          </Button>
          <p className="text-center text-xs text-gray-400 mt-8 font-dm-sans">
            Version 1.0.0 (Phase 1) <br />
            {t("madeWithLove")}
          </p>
        </section>
      </main>

      <BottomNav />

      {/* ABHA ID Modal */}
      <Modal isOpen={abhaModal} onClose={() => setAbhaModal(false)} title={t("abhaIdLinking")}>
        <div className="space-y-6">
          {abhaLinked ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-100">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-700">{t("abhaLinked")}</p>
                <p className="text-xs text-green-600 font-mono mt-0.5">{abhaLinked}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t("abhaModalDesc")}</p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#1A1A2E]">{t("abhaIdLabel")}</label>
            <Input
              placeholder={t("abhaIdPlaceholder")}
              value={abhaId}
              onChange={e => setAbhaId(e.target.value)}
              className="h-14 rounded-2xl text-base"
            />
            <p className="text-xs text-gray-400">{t("abhaIdFormat")}</p>
          </div>

          <div className="flex gap-3">
            {abhaLinked && (
              <Button
                variant="outline"
                onClick={handleUnlinkAbha}
                disabled={abhaSaving}
                className="flex-1 h-14 rounded-2xl border-red-200 text-red-500 hover:bg-red-50"
              >
                {t("abhaUnlinkBtn")}
              </Button>
            )}
            <Button
              onClick={handleSaveAbha}
              disabled={abhaSaving || !abhaId.trim()}
              className="flex-1 h-14 rounded-2xl bg-[#FF6B35] hover:bg-[#e55a25] text-white font-bold"
            >
              <Link2 className="w-4 h-4 mr-2" />
              {abhaSaving ? t("saving") : t("abhaLinkBtn")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
