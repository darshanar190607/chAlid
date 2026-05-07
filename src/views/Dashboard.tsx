"use client";
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "motion/react"
import { MessageCircle, Scan, Hospital, Syringe, TrendingUp, Calendar, ChevronRight, Plus, Bell, Globe, Heart, Shield, Zap, ArrowRight, Camera } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { TopBar } from "@/components/layout/TopBar"
import { BottomNav } from "@/components/layout/BottomNav"
import { Input } from "@/components/ui/Input"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils"
import { format, differenceInMonths, differenceInDays, subDays, subMonths } from "date-fns"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface Vaccine {
  id: string
  vaccineName: string
  scheduledDate: string
  status: string
}

interface WeightLog {
  id: string
  weightKg: number
  heightCm: number | null
  loggedAt: string
}

interface Baby {
  id: string
  name: string
  dob: string
  gender: string
  photoUrl?: string
  isPremature?: boolean
  weeksGestation?: number
  birthWeight?: number
  vaccines?: Vaccine[]
  weightLogs?: WeightLog[]
}



export default function Dashboard() {
  const { t } = useTranslation()
  const router = useRouter()
  const [user, setUser] = useState(auth.currentUser)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [babies, setBabies] = useState<Baby[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [sleepChecklist, setSleepChecklist] = useState({
    back: false,
    surface: false,
    noLoose: false,
    temp: false,
    noSmoke: false
  })
  const [muacValue, setMuacValue] = useState("")
  const [weightData, setWeightData] = useState<WeightLog[]>([])
  const [newWeight, setNewWeight] = useState("")
  const [newHeight, setNewHeight] = useState("")
  const [isAddingWeight, setIsAddingWeight] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (!u) {
        setIsLoading(false)
        return
      }

      const fetchDashboardData = async () => {
        try {
          setUserProfile({ name: u.displayName || u.phoneNumber || "Parent" })
          
          const token = await u.getIdToken()
          const res = await fetch(`/api/baby?firebaseUid=${u.uid}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const babyList = await res.json()
            // If the API returns a list (POST usually returns single, GET usually returns list)
            const babyData = Array.isArray(babyList) ? babyList[0] : babyList
            
            // Now fetch full baby details including vaccines if list was shallow
            if (babyData?.id) {
               const detailRes = await fetch(`/api/baby?id=${babyData.id}`, {
                 headers: { Authorization: `Bearer ${token}` }
               })
               if (detailRes.ok) {
                 const babyDetail = await detailRes.json()
                 setBabies([babyDetail])
                 setWeightData(babyDetail.weightLogs || [])
               } else {
                 setBabies(Array.isArray(babyList) ? babyList : [babyList])
               }
            } else {
              setBabies([])
            }
          }
        } catch (error) {
          console.error("Failed to fetch dashboard data:", error)
        } finally {
          setIsLoading(false)
        }
      }
      
      fetchDashboardData()
    })

    return () => unsubscribeAuth()
  }, [])

  // Nutrition Guide Data
  const getNutritionGuide = (ageMonths: number) => {
    if (ageMonths < 6) {
      return {
        title: t('exclusiveBreastfeeding'),
        plan: [
          { time: `🌅 ${t('morning')}`, food: t('noWaterOnlyMilk') },
          { time: `☀️ ${t('afternoon')}`, food: t('noWaterOnlyMilk') },
          { time: `🌙 ${t('evening')}`, food: t('noWaterOnlyMilk') },
          { time: `💧 ${t('water')}`, food: t('noWaterOnlyMilk') }
        ]
      }
    } else if (ageMonths < 12) {
      return {
        title: t('complementaryFeeding'),
        plan: [
          { time: `🌅 ${t('morning')}`, food: t('ricePorridge') },
          { time: `☀️ ${t('afternoon')}`, food: t('dalWater') },
          { time: `🌙 ${t('evening')}`, food: t('noWaterOnlyMilk') },
          { time: `💧 ${t('water')}`, food: "100-200ml/day" }
        ]
      }
    } else {
      return {
        title: t('familyFoods'),
        plan: [
          { time: `🌅 ${t('morning')}`, food: t('softKhichdi') },
          { time: `☀️ ${t('afternoon')}`, food: t('mashedRoti') },
          { time: `🌙 ${t('evening')}`, food: t('milkFruit') },
          { time: `💧 ${t('water')}`, food: "500-700ml/day" }
        ]
      }
    }
  }

  const currentBaby = babies[0]
  const babyAgeMonths = currentBaby ? differenceInMonths(new Date(), new Date(currentBaby.dob)) : 0
  const babyAgeDays = currentBaby ? differenceInDays(new Date(), new Date(currentBaby.dob)) : 0

  // Corrected Age Calculation
  const getCorrectedAge = () => {
    if (!currentBaby?.isPremature || !currentBaby?.weeksGestation) return null
    const weeksEarly = 40 - currentBaby.weeksGestation
    const correctedDays = babyAgeDays - (weeksEarly * 7)
    if (correctedDays < 0) return `${t('preterm')} (${t('corrected')}...)`
    const months = Math.floor(correctedDays / 30.44)
    return `${months} ${t('months')} (${t('corrected')})`
  }

  const correctedAge = getCorrectedAge()
  const nutrition = getNutritionGuide(babyAgeMonths)
  const sleepScore = Object.values(sleepChecklist).filter(Boolean).length

  const getChartData = () => {
    if (!weightData.length) return []
    const days = chartView === 'daily' ? 7 : chartView === 'weekly' ? 28 : 90
    return weightData.slice(-days).map(log => ({
      name: format(new Date(log.loggedAt), 'MMM dd'),
      weight: log.weightKg,
      height: log.heightCm || 0
    }))
  }

  const activeData = getChartData()

  const handleAddWeight = async () => {
    if (!currentBaby || !newWeight || !user) return
    setIsAddingWeight(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          babyId: currentBaby.id,
          weightKg: parseFloat(newWeight),
          heightCm: newHeight ? parseFloat(newHeight) : null
        })
      })
      if (res.ok) {
        const { weightLog } = await res.json()
        setWeightData(prev => [...prev, weightLog])
        setNewWeight("")
        setNewHeight("")
      }
    } catch (error) {
      console.error('Failed to add weight:', error)
    } finally {
      setIsAddingWeight(false)
    }
  }

  const getMuacStatus = (val: number) => {
    if (val >= 12.5) return { label: t('normal'), color: "bg-emerald-500", icon: "🟢" }
    if (val >= 11.5) return { label: t('mam'), color: "bg-yellow-500", icon: "🟡" }
    return { label: t('sam'), color: "bg-red-500", icon: "🔴" }
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <TopBar userName={userProfile?.name} />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Baby Profile Card */}
        {currentBaby ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-br from-[#FF2D55] to-[#FF6B35] text-white border-none overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-8 flex items-center gap-6 relative z-10">
                <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden shadow-xl">
                  <img
                    src={currentBaby.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentBaby.id}`}
                    alt={currentBaby.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-bold font-nunito">{currentBaby.name}</h2>
                    {currentBaby.isPremature && (
                      <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">{t('preterm')}</span>
                    )}
                  </div>
                  <p className="text-white/80 font-medium">
                    {babyAgeMonths} {t('months')} {correctedAge && `· ${correctedAge}`} · {currentBaby.gender}
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (babyAgeDays / 1000) * 100)}%` }}
                        className="h-full bg-white"
                      />
                    </div>
                    <span className="text-sm font-bold">{t('day')} {babyAgeDays} {t('of')} 1000</span>
                  </div>
                </div>
                <Link href="/profile">
                  <Button variant="ghost" size="icon" className="bg-white/10 hover:bg-white/20 text-white rounded-full">
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : !isLoading && (
          <Card className="border-dashed border-2 border-pink-200 bg-pink-50/50">
            <CardContent className="p-12 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center">
                <Plus className="w-10 h-10 text-[#FF2D55]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-nunito">{t('addBabyProfileTitle')}</h3>
                <p className="text-gray-500 max-w-sm mx-auto">{t('addBabyProfileDesc')}</p>
              </div>
              <Link href="/profile/setup">
                <Button size="lg" className="h-14 px-10 text-lg font-bold bg-[#FF2D55] hover:bg-[#E61E44]">{t('addBabyProfileBtn')}</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* AI Assistant Promo Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <Card className="border-none bg-gradient-to-r from-pink-50 to-orange-50 overflow-hidden group cursor-pointer" onClick={() => router.push('/chat')}>
            <CardContent className="p-0 flex items-center">
              <div className="p-8 flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[#FF2D55] text-xs font-bold border border-pink-100">
                  <Zap className="w-3 h-3" />
                  {t('aiPowered')}
                </div>
                <h3 className="text-2xl font-bold font-nunito text-[#1A1A2E]">{t('aiAssistantGreeting')}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{t('aiAssistantDescription')}</p>
                <Button variant="ghost" className="p-0 text-[#FF2D55] font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                  {t('aiAssistantChatNow')} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="w-56 h-56 relative hidden sm:block">
                <img 
                  src="https://picsum.photos/seed/ai-bot-assistant-dash/400/400" 
                  alt="AI Assistant" 
                  className="absolute inset-0 w-full h-full object-cover rounded-l-[40px] shadow-2xl group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-pink-50 via-transparent to-transparent" />
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute top-4 right-4 w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-pink-100"
                >
                  <MessageCircle className="w-6 h-6 text-[#FF2D55]" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Phase 1 Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Safe Sleep Score */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold font-nunito text-[#1A1A2E] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#FF2D55]" />
              {t('safeSleepScore')}
            </h3>
            <Card className="border-none shadow-soft overflow-hidden">
              <CardHeader className="bg-pink-50/50 border-b border-pink-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-pink-900 uppercase tracking-wider">{t('dailyChecklist')}</CardTitle>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold text-white",
                    sleepScore === 5 ? "bg-emerald-500" : "bg-pink-500"
                  )}>
                    {sleepScore}/5 {t('score')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {[
                  { id: 'back', label: t('backLabel') },
                  { id: 'surface', label: t('surfaceLabel') },
                  { id: 'noLoose', label: t('noLooseLabel') },
                  { id: 'temp', label: t('tempLabel') },
                  { id: 'noSmoke', label: t('noSmokeLabel') }
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={(sleepChecklist as any)[item.id]}
                      onChange={(e) => setSleepChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))}
                      className="w-5 h-5 rounded-md border-gray-300 text-[#FF2D55] focus:ring-[#FF2D55]"
                    />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </label>
                ))}
                {sleepScore === 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-bold text-center"
                  >
                    🟢 {t('safeSleepAchieved')}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Nutrition Guide */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold font-nunito text-[#1A1A2E] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#FF6B35]" />
              {t('whatToFeedToday')}
            </h3>
            <Card className="border-none shadow-soft overflow-hidden">
              <CardHeader className="bg-orange-50/50 border-b border-orange-100">
                <CardTitle className="text-sm font-bold text-orange-900 uppercase tracking-wider">
                  {nutrition.title} ({babyAgeMonths} {t('months')})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {nutrition.plan.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <span className="text-xl">{item.time.split(' ')[0]}</span>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-400 uppercase">{item.time.split(' ')[1]}</p>
                        <p className="font-bold text-[#1A1A2E]">{item.food}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Malnutrition MUAC Check */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold font-nunito text-[#1A1A2E] flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            {t('malnutritionCheck')}
          </h3>
          <Card className="border-none shadow-soft">
            <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4">
                <p className="text-sm text-gray-500">
                  {t('muacDescription')}
                </p>
                <div className="flex gap-4">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={t('enterMuac')}
                    value={muacValue}
                    onChange={(e) => setMuacValue(e.target.value)}
                    className="h-14 text-lg font-bold"
                  />
                  <Button className="h-14 px-8 bg-[#1A1A2E] hover:bg-[#2A2A4E]">{t('check')}</Button>
                </div>
              </div>
              {muacValue && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-full md:w-64 p-6 rounded-3xl bg-gray-50 border border-gray-100 text-center space-y-2"
                >
                  <p className="text-xs font-bold text-gray-400 uppercase">{t('riskLevel')}</p>
                  <div className={cn(
                    "mx-auto px-4 py-2 rounded-full text-white font-bold text-sm inline-flex items-center gap-2",
                    getMuacStatus(parseFloat(muacValue)).color
                  )}>
                    <span>{getMuacStatus(parseFloat(muacValue)).icon}</span>
                    {getMuacStatus(parseFloat(muacValue)).label}
                  </div>
                  {parseFloat(muacValue) < 11.5 && (
                    <p className="text-[10px] text-red-600 font-bold pt-2">⚠️ {t('samWarning')}</p>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Growth Insights Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-nunito text-[#1A1A2E]">{t('growthInsights')}</h3>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {(['daily', 'weekly', 'monthly'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setChartView(view)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                    chartView === view ? "bg-white text-[#FF2D55] shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {t(view)}
                </button>
              ))}
            </div>
          </div>
          <Card className="overflow-hidden border-none shadow-soft">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#FF2D55]" />
                  {t('weightTracking')}
                </CardTitle>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Weight (kg)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-24 h-9 text-sm"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Height (cm)"
                    value={newHeight}
                    onChange={(e) => setNewHeight(e.target.value)}
                    className="w-24 h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddWeight}
                    disabled={!newWeight || isAddingWeight}
                    className="bg-[#FF2D55] hover:bg-[#E61E44]"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[240px] w-full flex items-center justify-center bg-gray-50/50 rounded-2xl overflow-hidden">
                {!activeData.length ? (
                  <div className="text-center space-y-2">
                    <p className="text-gray-400 font-bold text-sm">{t('noWeightData')}</p>
                    <p className="text-gray-300 text-xs">{t('addWeightToSeeChart')}</p>
                  </div>
                ) : isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeData}>
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF2D55" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#FF2D55" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                        domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#FF2D55" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorWeight)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-300 font-bold animate-pulse text-sm">Loading Chart...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Today's Actions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-nunito text-[#1A1A2E]">{t('todaysActions')}</h3>
            <Link href="/vaccine" className="text-sm font-bold text-[#FF2D55] hover:underline">{t('viewAll')}</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x px-1">
            {currentBaby?.vaccines?.filter(v => v.status === 'pending').slice(0, 3).map((v, i) => (
              <Card key={v.id} className={cn(
                "min-w-[280px] snap-start border-l-4 shadow-sm rounded-2xl overflow-hidden",
                i === 0 ? "border-[#FF2D55]" : "border-[#FF6B35]"
              )}>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-pink-50 shadow-sm flex items-center justify-center bg-pink-50">
                      <Syringe className={cn("w-8 h-8", i === 0 ? "text-[#FF2D55]" : "text-[#FF6B35]")} />
                    </div>
                    <div className="space-y-0.5">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-wider",
                        i === 0 ? "text-[#FF2D55]" : "text-[#FF6B35]"
                      )}>{t('vaccineDue')}</p>
                      <p className="text-lg font-bold text-[#1A1A2E] leading-tight">{v.vaccineName}</p>
                      <p className="text-xs text-gray-500 font-medium">{format(new Date(v.scheduledDate), 'PPP')}</p>
                    </div>
                  </div>
                  <Link href="/vaccine" className="block">
                    <Button variant="outline" className={cn(
                      "w-full h-12 rounded-full font-bold transition-colors",
                      i === 0 ? "border-pink-100 text-[#FF2D55] hover:bg-pink-50" : "border-orange-100 text-[#FF6B35] hover:bg-orange-50"
                    )}>
                      {t('viewDetails')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
            
            {(!currentBaby?.vaccines || currentBaby.vaccines.filter(v => v.status === 'pending').length === 0) && (
              <Card className="min-w-[280px] snap-start border-l-4 border-emerald-500 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">{t('allCaughtUp') || 'All caught up!'}</p>
                      <p className="text-xs text-gray-500">{t('noVaccinesDue') || 'No vaccines due soon.'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Quick Action Grid */}
        <section className="grid grid-cols-2 gap-4">
          <Link href="/daily-photo">
            <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Camera className="w-7 h-7 text-purple-500" />
                </div>
                <p className="font-bold font-nunito text-[#1A1A2E]">{t('dailyPhotos') || 'Daily Photos'}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/chat">
            <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-[#FF2D55]" />
                </div>
                <p className="font-bold font-nunito text-[#1A1A2E]">{t('askAI')}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/symptom">
            <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <Scan className="w-7 h-7 text-[#FF6B35]" />
                </div>
                <p className="font-bold font-nunito text-[#1A1A2E]">{t('checkSymptom')}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/hospital">
            <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center">
                  <Hospital className="w-7 h-7 text-[#FF2D55]" />
                </div>
                <p className="font-bold font-nunito text-[#1A1A2E]">{t('findHospital')}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vaccine">
            <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <Syringe className="w-7 h-7 text-[#FF6B35]" />
                </div>
                <p className="font-bold font-nunito text-[#1A1A2E]">{t('vaccines')}</p>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Recent Chat Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-nunito text-[#1A1A2E]">{t('recentChat')}</h3>
            <Link href="/chat" className="text-sm font-bold text-[#FF2D55] hover:underline">{t('fullHistory')}</Link>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  <img 
                    src="https://picsum.photos/seed/ai-assistant/100/100" 
                    alt="AI Assistant" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-500">{t('chaidAssistant')}</p>
                  <p className="text-[#1A1A2E] line-clamp-2">
                    "{t('feverAdvice')}"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
