"use client";
import { useState } from "react"
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react"
import { MessageCircle, Scan, Hospital, Globe, ArrowRight, Heart, Shield, Zap, CheckCircle2, X, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Modal } from "@/components/ui/Modal"
import { cn } from "@/lib/utils"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from "date-fns"
import { useTranslation } from "react-i18next"

// Mock data for modal preview
const generatePreviewData = (days: number) => {
  return Array.from({ length: days }).map((_, i) => ({
    name: format(subDays(new Date(), days - 1 - i), 'MMM dd'),
    weight: 3 + (i * 0.05) + (Math.random() * 0.2),
  }))
}

const previewData = {
  daily: generatePreviewData(7),
  weekly: generatePreviewData(14),
  monthly: generatePreviewData(30),
}

export default function LandingPage() {
  const { t } = useTranslation()
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false)
  const [previewView, setPreviewView] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  const testimonials = [
    {
      name: t('testimonial1Name'),
      city: t('testimonial1City'),
      text: t('testimonial1Text'),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
    },
    {
      name: t('testimonial2Name'),
      city: t('testimonial2City'),
      text: t('testimonial2Text'),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali"
    },
    {
      name: t('testimonial3Name'),
      city: t('testimonial3City'),
      text: t('testimonial3Text'),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
    }
  ]

  const features = [
    {
      icon: MessageCircle,
      title: t('aiHealthAssistantTitle'),
      description: t('aiHealthAssistantDesc'),
      color: "bg-pink-50 text-[#FF2D55]",
      image: "https://picsum.photos/seed/ai-chatbot-assistant-v2/600/400"
    },
    {
      icon: Scan,
      title: t('smartSymptomCheckTitle'),
      description: t('smartSymptomCheckDesc'),
      color: "bg-orange-50 text-[#FF6B35]",
      image: "https://picsum.photos/seed/ai-symptom-scanner-v2/600/400"
    },
    {
      icon: Hospital,
      title: t('localCareFinderTitle'),
      description: t('localCareFinderDesc'),
      color: "bg-pink-50 text-[#FF2D55]",
      image: "https://picsum.photos/seed/ai-hospital-locator-v2/600/400"
    }
  ]

  const steps = [
    {
      title: t('babyProfile'),
      description: t('babyProfileDesc'),
      icon: Heart,
      color: "text-pink-500 bg-pink-50",
      image: "https://picsum.photos/seed/ai-baby-profile/300/200"
    },
    {
      title: t('trackGrowth'),
      description: t('trackGrowthDesc'),
      icon: TrendingUp,
      color: "text-orange-500 bg-orange-50",
      image: "https://picsum.photos/seed/ai-growth-tracking/300/200"
    },
    {
      title: t('smartVaccine'),
      description: t('smartVaccineDesc'),
      icon: Zap,
      color: "text-pink-500 bg-pink-50",
      image: "https://picsum.photos/seed/ai-vaccine-smart/300/200"
    },
    {
      title: t('aiHealthAssistant'),
      description: t('aiHealthAssistantStepDesc'),
      icon: MessageCircle,
      color: "text-orange-500 bg-orange-50",
      image: "https://picsum.photos/seed/ai-bot-step/300/200"
    }
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF2D55] to-[#FF6B35] opacity-5" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF2D55] opacity-10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF6B35] opacity-10 blur-[120px] rounded-full" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50 text-[#FF2D55] font-bold text-sm border border-pink-100">
              <Zap className="w-4 h-4" />
              <span>{t('aiPoweredBabyCare')}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold font-nunito text-[#1A1A2E] leading-tight">
              {t('yourBabys')} <br />
              <span className="text-[#FF2D55]">{t('aiHealthFriend')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 font-dm-sans max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t('heroDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto h-16 px-10 text-xl bg-[#FF2D55] hover:bg-[#E61E44] shadow-lg shadow-pink-200">
                  {t('startFree')}
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto h-16 px-10 text-xl border-[#FF2D55] text-[#FF2D55] hover:bg-pink-50"
                onClick={() => setIsHowItWorksOpen(true)}
              >
                {t('seeHowItWorks')}
              </Button>
            </div>
            <div className="flex flex-wrap justify-center lg:justify-start gap-8 pt-8 border-t border-gray-100">
              <div className="text-center lg:text-left">
                <p className="text-2xl font-bold text-[#1A1A2E]">24/7</p>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">{t('aiSupport')}</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-2xl font-bold text-[#1A1A2E]">14+</p>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">{t('languages')}</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-2xl font-bold text-[#FF6B35]">{t('free')}</p>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">{t('forever')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative z-10 w-[340px] h-[680px] mx-auto bg-[#1A1A2E] rounded-[56px] border-[12px] border-[#1A1A2E] shadow-[0_32px_64px_-12px_rgba(255,45,85,0.25)] overflow-hidden">
              <img
                src="https://picsum.photos/seed/ai-baby-care-interface/340/680"
                alt="AI Chatbot Interface"
                className="w-full h-full object-cover opacity-90"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FF2D55]/60 via-transparent to-transparent" />
              <div className="absolute bottom-16 left-8 right-8 space-y-6">
                <motion.div 
                  animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="w-20 h-20 rounded-3xl bg-[#FF6B35] flex items-center justify-center shadow-2xl border-4 border-white/20"
                >
                  <MessageCircle className="w-10 h-10 text-white" />
                </motion.div>
                <div className="space-y-2">
                  <p className="text-white font-bold text-2xl font-nunito">{t('chaiidAssistant')}</p>
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-3xl shadow-lg">
                    <p className="text-white text-base font-medium leading-relaxed">"{t('chaiidAssistantGreeting')}"</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#FF6B35] opacity-20 blur-[60px] rounded-full" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#FF2D55] opacity-20 blur-[60px] rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* How It Works Modal */}
      <Modal 
        isOpen={isHowItWorksOpen} 
        onClose={() => setIsHowItWorksOpen(false)}
        title={t('whatIsChaiid')}
      >
        <div className="space-y-8 py-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-gray-600 text-lg leading-relaxed font-dm-sans">
            {t('chaiidDescription')}
          </p>
          
          <div className="grid gap-6">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-5 items-start p-5 rounded-3xl bg-pink-50/50 border border-pink-100/50 overflow-hidden group">
                <div className="w-full sm:w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm border border-white">
                  <img 
                    src={step.image} 
                    alt={step.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", step.color)}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-xl text-[#1A1A2E] font-nunito">{step.title}</h4>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Growth Chart Preview Section */}
          <div className="space-y-6 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h4 className="font-bold text-[#1A1A2E] flex items-center gap-2 text-lg">
                <TrendingUp className="w-6 h-6 text-[#FF6B35]" />
                {t('growthChartPreview')}
              </h4>
              <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                {(['daily', 'weekly', 'monthly'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setPreviewView(v)}
                    className={cn(
                      "px-5 py-2 rounded-xl text-xs font-bold transition-all",
                      previewView === v ? "bg-white text-[#FF6B35] shadow-md" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {t(v)}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full bg-white rounded-3xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={previewData[previewView]}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }}
                    interval={previewView === 'monthly' ? 5 : 0}
                  />
                  <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1A1A2E', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#FF6B35" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorWeight)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-sm text-gray-500 font-medium text-center px-4 bg-orange-50/50 py-3 rounded-2xl">
              {previewView === 'daily' && t('dailyGrowthDesc')}
              {previewView === 'weekly' && t('weeklyGrowthDesc')}
              {previewView === 'monthly' && t('monthlyGrowthDesc')}
            </p>
          </div>

          {/* AI Bot Image Section */}
          <div className="space-y-4">
            <h4 className="font-bold text-[#1A1A2E] flex items-center gap-2 text-lg">
              <MessageCircle className="w-6 h-6 text-[#FF2D55]" />
              {t('meetYourAiBot')}
            </h4>
            <div className="aspect-video w-full bg-pink-50 rounded-[32px] overflow-hidden relative group shadow-inner">
              <img 
                src="https://picsum.photos/seed/chatbot-guide/800/450" 
                alt="AI Bot Assistant"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FF2D55]/80 via-[#FF2D55]/20 to-transparent flex items-end p-8">
                <div className="space-y-2">
                  <p className="text-white font-bold text-xl">{t('alwaysAvailable')}</p>
                  <p className="text-white/80 text-sm font-medium">{t('aiHealthAssistantStepDesc')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-8 rounded-[32px] space-y-4 border border-orange-100/50">
            <h4 className="font-bold text-[#FF6B35] flex items-center gap-2 text-lg">
              <Shield className="w-6 h-6" />
              {t('trustedAndSecure')}
            </h4>
            <p className="text-base text-gray-600 leading-relaxed font-dm-sans">
              {t('securityDescription')}
            </p>
          </div>

          <Button className="w-full h-16 text-xl font-bold bg-[#FF2D55] hover:bg-[#E61E44] rounded-3xl shadow-lg shadow-pink-200" onClick={() => setIsHowItWorksOpen(false)}>
            {t('getStartedNow')}
          </Button>
        </div>
      </Modal>

      {/* Features Section */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-4xl md:text-5xl font-bold font-nunito text-[#1A1A2E]">{t('smartFeaturesTitle')}</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-dm-sans leading-relaxed">
              {t('smartFeaturesDescription')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(255,45,85,0.1)] transition-all duration-500 rounded-[40px] overflow-hidden group">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img 
                      src={f.image} 
                      alt={f.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <CardContent className="p-10 space-y-6">
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm", f.color)}>
                      <f.icon className="w-8 h-8" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold font-nunito text-[#1A1A2E]">{f.title}</h3>
                      <p className="text-gray-500 leading-relaxed font-dm-sans">{f.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 px-6 bg-pink-50/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-4xl md:text-5xl font-bold font-nunito text-[#1A1A2E]">{t('trustedByParents')}</h2>
            <p className="text-xl text-gray-500 font-dm-sans">{t('helpingFamilies')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-none shadow-[0_15px_40px_rgba(0,0,0,0.03)] bg-white rounded-[40px] p-2">
                  <CardContent className="p-10 space-y-8">
                    <p className="text-gray-600 italic font-dm-sans text-lg leading-relaxed">"{t.text}"</p>
                    <div className="flex items-center gap-5 pt-6 border-t border-gray-50">
                      <img src={t.avatar} alt={t.name} className="w-14 h-14 rounded-2xl border-2 border-pink-100 shadow-sm" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-bold text-[#1A1A2E] text-lg">{t.name}</p>
                        <p className="text-sm font-bold text-[#FF2D55] uppercase tracking-wider">{t.city}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 bg-[#1A1A2E] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF2D55] opacity-10 blur-[120px] rounded-full" />
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-16 relative z-10">
          <div className="col-span-2 space-y-8">
            <h2 className="text-4xl font-bold font-nunito text-[#FF2D55]">chAIid</h2>
            <p className="text-gray-400 text-lg leading-relaxed max-w-sm font-dm-sans">
              {t('footerDescription')}
            </p>
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                <Globe className="w-6 h-6 text-[#FF6B35]" />
              </div>
              <div className="flex flex-wrap gap-2">
                {['EN', 'HI', 'TA', 'TE', 'KN', 'ML', 'BN', 'MR', 'GU', 'PA'].map(lang => (
                  <span key={lang} className="px-3 py-1.5 rounded-xl bg-white/5 text-[11px] font-bold border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <p className="font-bold text-xl font-nunito">{t('links')}</p>
            <ul className="space-y-4 text-gray-400 font-medium">
              <li><Link href="/privacy" className="hover:text-[#FF2D55] transition-colors">{t('privacyPolicy')}</Link></li>
              <li><Link href="/terms" className="hover:text-[#FF2D55] transition-colors">{t('termsOfService')}</Link></li>
              <li><Link href="/contact" className="hover:text-[#FF2D55] transition-colors">{t('contactUs')}</Link></li>
            </ul>
          </div>
          <div className="space-y-6">
            <p className="font-bold text-xl font-nunito">{t('mission')}</p>
            <p className="text-gray-400 text-base leading-relaxed font-dm-sans">
              {t('missionDescription')}
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-10 border-t border-white/5 text-center text-gray-500 text-sm font-medium tracking-wide">
          {t('allRightsReserved')}
        </div>
      </footer>
    </div>
  )
}
