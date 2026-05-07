"use client";
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "motion/react"
import { Syringe, CheckCircle2, AlertCircle, Clock, ChevronRight, MapPin, Calendar, Info, Bell, Plus, Filter, Hospital } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { TopBar } from "@/components/layout/TopBar"
import { BottomNav } from "@/components/layout/BottomNav"
import { auth } from "@/lib/firebase"
import { format, isAfter, isBefore, addDays } from "date-fns"
import { Modal } from "@/components/ui/Modal"
import { Input } from "@/components/ui/Input"
import { useToast } from "@/components/ui/Toast"
import { cn } from "@/lib/utils"
import { getVaccineMetadata } from "@/lib/vaccine-metadata"
import Link from "next/link";

interface Vaccine {
  id: string
  name: string
  age_due: string
  description: string
  status: 'done' | 'due' | 'upcoming' | 'overdue'
  given_date?: string
  scheduled_date: string
  hospital_name?: string
  hospital_location?: string
}

export default function VaccineTracker() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [filter, setFilter] = useState<'all' | 'done' | 'due' | 'upcoming'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedVaccine, setSelectedVaccine] = useState<Vaccine | null>(null)
  const [hospitalName, setHospitalName] = useState("")
  const [hospitalLocation, setHospitalLocation] = useState("")
  const [remindersEnabled, setRemindersEnabled] = useState(false)
  const [babyId, setBabyId] = useState<string | null>(null)
  const user = auth.currentUser

  useEffect(() => {
    if (!user) return

    const fetchVaccines = async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch(`/api/vaccine?firebaseUid=${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error("Failed to fetch")
        
        const data = await res.json()
        if (!data.records) {
          setIsLoading(false)
          return
        }

        const fullSchedule = data.records.map((record: any) => {
          const scheduledDate = new Date(record.scheduledDate)
          const metadata = getVaccineMetadata(record.vaccineName)
          let status: Vaccine['status'] = record.status
          
          if (status !== 'done') {
            if (isBefore(scheduledDate, new Date())) {
              status = 'overdue'
            } else if (isBefore(scheduledDate, addDays(new Date(), 7))) {
              status = 'due'
            } else {
              status = 'upcoming'
            }
          }

          return {
            id: record.id,
            name: record.vaccineName,
            age_due: metadata.ageDue,
            description: metadata.description,
            status,
            given_date: record.givenDate,
            scheduled_date: format(scheduledDate, "yyyy-MM-dd"),
            hospital_name: record.hospitalName,
            hospital_location: record.hospitalLocation
          } as Vaccine
        })

        setVaccines(fullSchedule)
      } catch (error) {
        // Error handled silently
      } finally {
        setIsLoading(false)
      }
    }

    fetchVaccines()
  }, [user])

  const filteredVaccines = vaccines.filter(v => {
    if (filter === 'all') return true
    if (filter === 'done') return v.status === 'done'
    if (filter === 'due') return v.status === 'due' || v.status === 'overdue'
    if (filter === 'upcoming') return v.status === 'upcoming'
    return true
  })

  const stats = {
    total: vaccines.length,
    done: vaccines.filter(v => v.status === 'done').length,
    overdue: vaccines.filter(v => v.status === 'overdue').length
  }

  const handleMarkDone = async () => {
    if (!selectedVaccine || !user) return

    try {
      const givenDate = format(new Date(), "yyyy-MM-dd")
      const recordData = {
        id: selectedVaccine.id,
        status: 'done',
        givenDate,
        hospitalName,
        hospitalLocation
      }

      const token = await user.getIdToken()
      const res = await fetch('/api/vaccine', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(recordData)
      })

      if (!res.ok) throw new Error("Failed to save vaccine record")

      const data = await res.json()
      
      setVaccines(prev => prev.map(v => v.id === selectedVaccine.id ? {
        ...v,
        status: 'done',
        given_date: givenDate,
        hospital_name: hospitalName,
        hospital_location: hospitalLocation
      } : v))

      showToast(t('vaccineRecorded'), 'success')
      setIsModalOpen(false)
      setSelectedVaccine(null)
      setHospitalName("")
      setHospitalLocation("")
    } catch (error) {
      showToast(t('failedToRecordVaccine'), 'error')
    }
  }

  const toggleReminders = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/vaccine/reminders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !remindersEnabled })
      });
      if (res.ok) {
        setRemindersEnabled(!remindersEnabled);
        showToast(remindersEnabled ? "Reminders disabled" : "Reminders enabled successfully", "success");
      }
    } catch (e) {
      showToast("Failed to toggle reminders", "error");
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF9F5] pb-24">
      <TopBar />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header & Progress */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-pink-100 rounded-[24px] flex items-center justify-center shadow-lg shadow-pink-100/50 border-4 border-white overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/ai-vaccine-tracker/200/200" 
                  alt="AI Assistant" 
                  className="w-12 h-12 object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold font-nunito text-[#1A1A2E]">{t('vaccineSchedule')}</h2>
                <p className="text-sm text-gray-400 font-dm-sans">{t('aiAssistantTracking')}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("rounded-xl border-gray-200 transition-colors", remindersEnabled && "bg-orange-50 text-orange-600 border-orange-200")}
              onClick={toggleReminders}
            >
              <Bell className={cn("w-4 h-4 mr-2", remindersEnabled && "fill-current")} />
              {remindersEnabled ? "Reminders On" : t('reminders')}
            </Button>
          </div>
          <Card className="bg-white border-none shadow-md overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('progress')}</p>
                <p className="text-lg font-bold text-[#FF2D55]">{stats.done} {t('of')} {stats.total} {t('complete')}</p>
              </div>
              <div className="h-4 w-full bg-pink-50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.done / stats.total) * 100}%` }}
                  className="h-full bg-[#FF2D55]"
                />
              </div>
              {stats.overdue > 0 && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm font-bold">{stats.overdue} {t('vaccinesOverdue')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {(['all', 'done', 'due', 'upcoming'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-all",
                filter === f 
                  ? "bg-[#FF2D55] text-white shadow-lg shadow-pink-100" 
                  : "bg-white border border-gray-100 text-gray-400 hover:border-pink-200"
              )}
            >
              {t(f)}
            </button>
          ))}
        </div>

        {/* Timeline View */}
        <section className="relative space-y-6">
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-orange-100 -z-10" />
          
          {filteredVaccines.map((v, i) => (
            <motion.div
              key={v.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-6 items-start"
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-[#FFF9F5] shadow-sm transition-colors",
                v.status === 'done' ? "bg-emerald-500" :
                v.status === 'overdue' ? "bg-rose-500" :
                v.status === 'due' ? "bg-amber-500" : "bg-blue-400"
              )}>
                {v.status === 'done' ? <CheckCircle2 className="w-6 h-6 text-white" /> :
                 v.status === 'overdue' ? <AlertCircle className="w-6 h-6 text-white" /> :
                 v.status === 'due' ? <Clock className="w-6 h-6 text-white" /> :
                 <Calendar className="w-5 h-5 text-white/80" />}
              </div>

              <Card className={cn(
                "flex-1 border-none shadow-sm hover:shadow-md transition-all border-l-4",
                v.status === 'done' ? "border-emerald-500" :
                v.status === 'overdue' ? "border-rose-500" :
                v.status === 'due' ? "border-amber-500" :
                "border-blue-300"
              )}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm relative group">
                      <img 
                        src={`https://picsum.photos/seed/vaccine-${v.name}/200/200`} 
                        alt={v.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className={cn(
                        "absolute inset-0 opacity-10",
                        v.status === 'done' ? "bg-emerald-500" :
                        v.status === 'overdue' ? "bg-rose-500" :
                        v.status === 'due' ? "bg-amber-500" : "bg-blue-500"
                      )} />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-lg font-bold font-nunito">{v.name}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              {v.age_due}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                              v.status === 'done' ? "bg-emerald-100 text-emerald-700" :
                              v.status === 'overdue' ? "bg-rose-100 text-rose-700" :
                              v.status === 'due' ? "bg-amber-100 text-amber-700" :
                              "bg-blue-100 text-blue-700"
                            )}>
                              {v.status === 'done' && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {v.status === 'overdue' && <AlertCircle className="w-2.5 h-2.5" />}
                              {v.status === 'due' && <Clock className="w-2.5 h-2.5" />}
                              {v.status === 'upcoming' && <Calendar className="w-2.5 h-2.5" />}
                              {t(v.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 font-dm-sans">{v.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('scheduled')}</p>
                          <p className="text-sm font-bold text-[#1A1A2E]">{format(new Date(v.scheduled_date), "MMM d, yyyy")}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                        {v.status === 'done' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              {t('givenOn')} {format(new Date(v.given_date!), "MMM d")}
                            </div>
                            {v.hospital_name && (
                              <div className="flex items-center gap-2 text-gray-500 text-xs">
                                <Hospital className="w-3 h-3" />
                                <span>{v.hospital_name}</span>
                                {v.hospital_location && <span className="text-gray-300">|</span>}
                                {v.hospital_location && <span>{v.hospital_location}</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="h-10 px-6 text-xs font-bold"
                              onClick={() => {
                                setSelectedVaccine(v)
                                setIsModalOpen(true)
                              }}
                            >
                              {t('markDone')}
                            </Button>
                            <Link href="/hospital">
                              <Button variant="outline" size="sm" className="h-10 px-6 text-xs font-bold border-gray-200">
                                <MapPin className="w-3 h-3 mr-2" />
                                {t('findPhc')}
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('recordVaccination')}
      >
        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4 p-4 bg-pink-50 rounded-2xl border border-pink-100">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Syringe className="w-6 h-6 text-[#FF2D55]" />
            </div>
            <div>
              <h4 className="font-bold text-[#1A1A2E]">{selectedVaccine?.name}</h4>
              <p className="text-xs text-gray-500">{selectedVaccine?.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">{t('hospitalName')}</label>
              <Input 
                placeholder={t('enterHospitalName')}
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="rounded-xl border-gray-200 focus:border-[#FF2D55] focus:ring-[#FF2D55]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">{t('location')}</label>
              <Input 
                placeholder={t('enterLocation')}
                value={hospitalLocation}
                onChange={(e) => setHospitalLocation(e.target.value)}
                className="rounded-xl border-gray-200 focus:border-[#FF2D55] focus:ring-[#FF2D55]"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl h-12 font-bold"
              onClick={() => setIsModalOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button 
              variant="primary" 
              className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-pink-100"
              onClick={handleMarkDone}
            >
              {t('saveRecord')}
            </Button>
          </div>
        </div>
      </Modal>

      <BottomNav />
    </div>
  )
}
