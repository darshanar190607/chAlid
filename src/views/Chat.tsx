"use client";
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Send, Mic, MicOff, Paperclip, ArrowLeft, Globe, Info, Volume2, AlertTriangle, CheckCircle2, AlertCircle, Zap, X, IndianRupee, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useToast } from "@/components/ui/Toast"
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils"
import { format, differenceInMonths } from "date-fns"
import { useTranslation } from "react-i18next"
import SymptomCamera from "@/components/symptom/SymptomCamera"
import { ShieldCheck, Stethoscope, Clock } from "lucide-react"

interface Message {
  id: string
  role: 'user' | 'model'
  text: string
  severity?: 'low' | 'medium' | 'high'
  timestamp: Date
  image?: string
  isSymptomAnalysis?: boolean
  analysisData?: any
  isTNSchemes?: boolean
}

export default function Chat() {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [user, setUser] = useState(auth.currentUser)
  const [baby, setBaby] = useState<any>(null)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [showSymptomCamera, setShowSymptomCamera] = useState(false)
  const [isTNSchemesMode, setIsTNSchemesMode] = useState(false)
  const [tnUserContext, setTnUserContext] = useState<{ income?: string; employment?: string; gender?: string }>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const router = useRouter()
  const { showToast } = useToast()

  useEffect(() => {
    setIsMounted(true)
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const token = await u.getIdToken()
          // Fetch Baby
          const babyRes = await fetch(`/api/baby?firebaseUid=${u.uid}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (babyRes.ok) {
            const babyList = await babyRes.json()
            setBaby(Array.isArray(babyList) ? babyList[0] : babyList)
          }

          // Fetch History
          const historyRes = await fetch(`/api/chat?firebaseUid=${u.uid}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (historyRes.ok) {
            const { messages: history } = await historyRes.json()
            if (history) {
              setMessages(history.map((m: any) => ({
                id: m.id,
                role: m.role === 'user' ? 'user' : 'model',
                text: m.content,
                severity: m.severity,
                timestamp: new Date(m.createdAt),
                isTNSchemes: m.isTNSchemes ?? false
              })))
            }
          }
        } catch (error) {
          console.error("Auth initialization error:", error)
        }
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setAttachedImage(reader.result as string)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSend = async (messageText: string = inputText, base64Image?: string) => {
    const finalImage = base64Image || attachedImage
    const trimmedText = messageText.trim()
    
    if ((!trimmedText && !finalImage) || !user) return

    const userMessageContent = trimmedText || (finalImage ? t("photoAttachedMessage", "I've attached a photo. Please analyze it.") : "")
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userMessageContent,
      timestamp: new Date(),
      image: finalImage || undefined
    }

    setMessages(prev => [...prev, newMessage])
    setInputText("")
    setAttachedImage(null)
    setIsLoading(true)

    try {
      const babyAgeMonths = baby ? differenceInMonths(new Date(), new Date(baby.dob)) : 0
      const token = await user.getIdToken()
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'chat',
          message: userMessageContent,
          language: i18n.language,
          babyAgeMonths,
          firebaseUid: user.uid,
          base64Image: finalImage,
          history: messages.slice(-10).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          }))
        })
      })

      if (!response.ok) throw new Error("Chat failed")
      
      const data = await response.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.cleanResponse,
        severity: data.severity,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      if (data.severity === 'high') {
        showToast(t("immediateAttention"), "error")
      }
    } catch (error) {
      console.error("Chat Error:", error)
      showToast(t("failedToSendMessage"), "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceInput = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          setIsTranscribing(true)
          
          try {
            const reader = new FileReader()
            reader.readAsDataURL(audioBlob)
            reader.onloadend = async () => {
              const base64Audio = (reader.result as string).split(',')[1]
              const transcribeRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'transcribe', base64Audio, mimeType: 'audio/webm' })
              })
              const { transcription } = transcribeRes.ok ? await transcribeRes.json() : { transcription: null }
              if (transcription) {
                setInputText(transcription)
              }
              setIsTranscribing(false)
            }
          } catch (error) {
            console.error("Transcription error:", error)
            showToast(t("failedToTranscribe"), "error")
            setIsTranscribing(false)
          }

          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (error) {
        console.error("Microphone access error:", error)
        showToast(t("microphoneAccessDenied"), "error")
      }
    } else {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    }
  }

  const playAudio = async (text: string) => {
    try {
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!ttsRes.ok) throw new Error(await ttsRes.text())
      const { base64Audio } = await ttsRes.json()
      if (base64Audio) {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`)
        audio.play()
      }
    } catch (error) {
      console.error("TTS error:", error)
      showToast(t("failedToPlayAudio"), "error")
    }
  }

  const handleTNSchemes = async (messageText: string) => {
    if (!messageText.trim() || !user) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: messageText.trim(), timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInputText("")
    setIsLoading(true)
    try {
      const babyAgeMonths = baby ? differenceInMonths(new Date(), new Date(baby.dob)) : 0
      const token = await user.getIdToken()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          action: 'tn-schemes',
          message: messageText.trim(),
          language: i18n.language,
          babyAgeMonths,
          firebaseUid: user.uid,
          userContext: tnUserContext,
          history: messages.slice(-6).map(m => ({ role: m.role, parts: [{ text: m.text }] }))
        })
      })
      if (!res.ok) throw new Error("TN Schemes query failed")
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.response,
        timestamp: new Date(),
        isTNSchemes: true
      }])
    } catch {
      showToast(t("failedToSendMessage"), "error")
    } finally {
      setIsLoading(false)
    }
  }

  const renderTNSchemesCard = (text: string) => {
    const lines = text.split('\n').filter(Boolean)
    return (
      <div className="mt-3 space-y-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl">
          <IndianRupee className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Tamil Nadu Govt. Schemes</span>
        </div>
        <div className="space-y-1.5">
          {lines.map((line, i) => {
            const isOpen = line.includes('✅')
            const isPlan = line.includes('📅')
            const isPassed = line.includes('ℹ️')
            const isHeader = line.startsWith('#') || line.startsWith('---') || line.startsWith('**')
            if (isHeader) return (
              <p key={i} className="text-xs font-black text-[#1A1A2E] uppercase tracking-wider pt-2 pb-1 border-b border-gray-100">
                {line.replace(/[#*-]/g, '').trim()}
              </p>
            )
            if (isOpen) return (
              <div key={i} className="flex items-start gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                <span className="text-base leading-none mt-0.5">✅</span>
                <p className="text-xs text-green-900 font-medium leading-relaxed">{line.replace('✅', '').trim()}</p>
              </div>
            )
            if (isPlan) return (
              <div key={i} className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <span className="text-base leading-none mt-0.5">📅</span>
                <p className="text-xs text-blue-900 font-medium leading-relaxed">{line.replace('📅', '').trim()}</p>
              </div>
            )
            if (isPassed) return (
              <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="text-base leading-none mt-0.5">ℹ️</span>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">{line.replace('ℹ️', '').trim()}</p>
              </div>
            )
            return <p key={i} className="text-xs text-gray-700 leading-relaxed px-1">{line}</p>
          })}
        </div>
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl">
          <span className="text-sm">🏥</span>
          <p className="text-[10px] font-bold text-orange-700">Register on PICME portal & visit your nearest PHC/Anganwadi for enrollment.</p>
        </div>
      </div>
    )
  }

  const handleSymptomAnalysis = async (analysis: any) => {
    setShowSymptomCamera(false);
    
    // Create a special message for the analysis
    const symptomMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: `Analyze this ${analysis.category} symptom image.`,
      timestamp: new Date(),
      image: analysis.imageUrl,
      isSymptomAnalysis: true,
      analysisData: analysis
    };

    setMessages(prev => [...prev, symptomMessage]);
    setIsLoading(true);

    // Also add an AI response confirming the analysis
    setTimeout(() => {
        const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: analysis.observation || analysis.result?.observation || "I've analyzed your baby's photo. Here are my observations and recommendations.",
            severity: analysis.severity?.toLowerCase() as any,
            timestamp: new Date(),
            analysisData: analysis
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        
        if (analysis.severity === 'HIGH') {
            showToast(t("immediateAttention"), "error");
        }
    }, 1000);
  }

  const renderSymptomAnalysisCard = (analysis: any) => (
    <div className="mt-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
            <Stethoscope className="w-3.5 h-3.5" />
            Medical Observation
        </div>
        
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 leading-relaxed shadow-sm">
            {analysis.observation || analysis.result?.observation}
        </div>

        <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border border-gray-100 p-3 rounded-xl flex flex-col gap-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    AI Confidence
                </span>
                <span className="text-sm font-bold text-gray-800">{analysis.confidence || analysis.result?.confidence}%</span>
            </div>
            <div className="bg-white border border-gray-100 p-3 rounded-xl flex flex-col gap-1 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    When to see Dr.
                </span>
                <span className="text-sm font-bold text-gray-800 truncate">{analysis.whenToSeeDoctor || analysis.result?.whenToSeeDoctor || "If persistent"}</span>
            </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl space-y-2 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-orange-600 block">Immediate Recommendations</span>
            <p className="text-xs font-medium text-orange-900 leading-relaxed">
                {analysis.recommendations || analysis.result?.recommendations}
            </p>
        </div>
        
        <p className="text-[9px] text-gray-400 italic text-center px-4">
            Disclaimer: This is AI-generated guidance. Always consult a qualified pediatrician for medical diagnosis.
        </p>
    </div>
  );

  const suggestedQuestions = [
    t("fever"), t("notEating"), t("sleepIssues"), t("rashes")
  ]

  const handleSendDispatch = (text: string = inputText) => {
    if (isTNSchemesMode) handleTNSchemes(text)
    else handleSend(text)
  }

  return (
    <div className="flex flex-col h-screen bg-[#FFF9F5]">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-6 h-6 text-[#1A1A2E]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
              <img 
                src="https://picsum.photos/seed/ai-assistant/100/100" 
                alt="AI Assistant" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold font-nunito text-[#1A1A2E]">{t('chaiidAssistant')}</h1>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{t('online')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTNSchemesMode(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
              isTNSchemesMode
                ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-200"
                : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            )}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            TN Schemes
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100">
            <Globe className="w-4 h-4 text-[#FF6B35]" />
            <span className="text-xs font-bold uppercase text-[#1A1A2E]">{isMounted ? i18n.language : 'en'}</span>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <Info className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
      >
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="w-40 h-40 bg-orange-100 rounded-[48px] flex items-center justify-center shadow-2xl shadow-orange-100/50 border-8 border-white">
                <img 
                  src="https://picsum.photos/seed/ai-chatbot-assistant-chat/300/300" 
                  alt="AI Assistant" 
                  className="w-32 h-32 object-cover rounded-[32px]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <motion.div 
                animate={{ y: [0, -10, 0], rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute -top-6 -right-6 w-16 h-16 bg-[#FF2D55] rounded-3xl flex items-center justify-center shadow-xl border-4 border-white"
              >
                <Zap className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>
            <div className="space-y-3 max-w-sm">
              <h2 className="text-3xl font-bold font-nunito text-[#1A1A2E]">{t('askAnything')}</h2>
              <p className="text-gray-500 font-medium leading-relaxed">{t('chatDescription')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {isTNSchemesMode ? (
                <>
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-2xl">
                    <IndianRupee className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">Tamil Nadu Schemes Advisor Active</span>
                  </div>
                  {["Show all schemes for my baby", "What pregnancy schemes am I eligible for?", "Girl child education benefits", "Free delivery hospital schemes"].map(q => (
                    <button key={q} onClick={() => handleTNSchemes(q)}
                      className="px-5 py-3 rounded-2xl bg-white border border-green-100 text-sm font-bold text-green-700 hover:bg-green-50 transition-all shadow-sm">
                      {q}
                    </button>
                  ))}
                </>
              ) : (
                suggestedQuestions.map(q => (
                  <button key={q} onClick={() => handleSend(q)}
                    className="px-6 py-3 rounded-2xl bg-white border border-orange-100 text-sm font-bold text-[#FF6B35] hover:bg-orange-50 hover:border-orange-200 transition-all shadow-sm">
                    {q}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "flex flex-col max-w-[85%]",
              msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className={cn(
              "px-5 py-4 rounded-[24px] shadow-sm relative group",
              msg.role === 'user' 
                ? "bg-[#FF6B35] text-white rounded-tr-none" 
                : "bg-white border border-orange-100 text-[#1A1A2E] rounded-tl-none"
            )}>
              {msg.image && (
                <img src={msg.image} alt="User upload" className="max-w-full rounded-lg mb-3 shadow-sm border border-white/20" />
              )}
              <p className="text-base leading-relaxed font-dm-sans whitespace-pre-wrap">{msg.text}</p>
              
              {msg.role === 'model' && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {msg.severity === 'high' && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase">
                        <AlertCircle className="w-3 h-3" />
                        {t('seeDoctor')}
                      </div>
                    )}
                    {msg.severity === 'medium' && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600 text-[10px] font-bold uppercase">
                        <AlertTriangle className="w-3 h-3" />
                        {t('monitor')}
                      </div>
                    )}
                    {msg.severity === 'low' && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('safe')}
                      </div>
                    )}
                  </div>
                    <button 
                    onClick={() => playAudio(msg.text)}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-[#FF6B35]" />
                  </button>
                </div>
              )}

              {msg.analysisData && renderSymptomAnalysisCard(msg.analysisData)}
              {msg.isTNSchemes && renderTNSchemesCard(msg.text)}
            </div>
            <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
              {msg.timestamp ? format(msg.timestamp, "h:mm a") : t("justNow")}
            </span>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start max-w-[85%] mr-auto">
            <div className="px-5 py-4 rounded-[24px] rounded-tl-none bg-white border border-orange-100 shadow-sm">
              <div className="flex gap-1.5">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-[#2EC4B6]" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-[#2EC4B6]" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-[#2EC4B6]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-6 bg-white border-t border-gray-100 flex flex-col">
        {/* TN Schemes Mode Banner */}
        {isTNSchemesMode && (
          <div className="flex items-center justify-between mb-3 px-4 py-2 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold text-green-700">TN Schemes Advisor — Ask about any scheme</span>
            </div>
            <button onClick={() => setIsTNSchemesMode(false)} className="text-green-500 hover:text-green-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Attachment Preview UI */}
        <AnimatePresence>
          {attachedImage && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="mb-4 relative w-24 h-24"
            >
              <img src={attachedImage} alt="Attachment" className="w-full h-full object-cover rounded-xl border-2 border-orange-100 shadow-sm" />
              <button 
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto flex items-center gap-4 w-full">
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />
           <button 
            onClick={() => setShowSymptomCamera(true)}
            className="p-3 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-100"
            title="Analyze Symptom Photo"
          >
            <Stethoscope className="w-6 h-6 text-orange-500" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <Paperclip className="w-6 h-6 text-gray-400" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendDispatch()}
              placeholder={t('askAnythingPlaceholder')}
              className="w-full h-14 pl-6 pr-14 rounded-full bg-gray-50 border-none focus:ring-2 focus:ring-orange-200 text-base font-dm-sans"
            />
            <button
              onClick={() => handleSendDispatch()}
              disabled={(!inputText.trim() && !attachedImage) || isLoading}
              className={cn(
                "absolute right-2 top-2 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                (inputText.trim() || attachedImage)
                  ? isTNSchemesMode ? "bg-green-500 text-white" : "bg-[#FF6B35] text-white"
                  : "bg-gray-200 text-gray-400"
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleVoiceInput}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95",
              isRecording ? "bg-red-500 animate-pulse shadow-red-200" : "bg-[#FF6B35] shadow-orange-200"
            )}
          >
            {isRecording ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Voice Overlay */}
      <AnimatePresence>
        {(isRecording || isTranscribing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#FF6B35]/95 flex flex-col items-center justify-center text-white p-8"
          >
            <div className="relative mb-12">
              <motion.div
                animate={isTranscribing ? { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] } : { scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ repeat: Infinity, duration: isTranscribing ? 1 : 2 }}
                className="absolute inset-0 bg-white rounded-full"
              />
              <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center">
                {isTranscribing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Zap className="w-16 h-16 text-[#FF6B35]" />
                  </motion.div>
                ) : (
                  <Mic className="w-16 h-16 text-[#FF6B35]" />
                )}
              </div>
            </div>
            <h2 className="text-3xl font-bold font-nunito mb-4">
              {isTranscribing ? t('transcribing') : t('listening')}
            </h2>
            <p className="text-xl opacity-80 font-dm-sans">
              {isTranscribing ? t('pleaseWait') : t('speakInLanguage')}
            </p>
            <div className="mt-12 flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.div
                  key={i}
                  animate={isTranscribing ? { height: [40, 40, 40] } : { height: [20, 60, 20] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                  className="w-2 bg-white/40 rounded-full"
                />
              ))}
            </div>
            {!isTranscribing && (
              <Button
                onClick={() => {
                  mediaRecorderRef.current?.stop()
                  setIsRecording(false)
                }}
                variant="ghost"
                className="mt-24 text-white hover:bg-white/10 border border-white/20 px-8 h-14 rounded-full"
              >
                {t('tapToStop')}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Symptom Camera Modal */}
      <AnimatePresence>
        {showSymptomCamera && (
            <motion.div
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="fixed inset-0 z-[110] bg-orange-50/98 backdrop-blur-md flex flex-col p-6 overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-orange-900 leading-none mb-1">Symptom AI</h2>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-orange-600/70 uppercase tracking-widest">Advanced Pediatric Vision</span>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={() => setShowSymptomCamera(false)}
                        className="rounded-full w-12 h-12 hover:bg-white/50"
                    >
                        <X className="w-8 h-8 text-orange-900/50" />
                    </Button>
                </div>
                
                <div className="max-w-md mx-auto w-full">
                    <SymptomCamera 
                       user={user} 
                       baby={baby} 
                       onAnalysis={handleSymptomAnalysis} 
                    />
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
