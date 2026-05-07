"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Upload, ArrowLeft, Loader2, CheckCircle2, AlertCircle, HeartPulse, History } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { differenceInMonths, format } from "date-fns";
import imageCompression from "browser-image-compression";

export default function DailyPhotoView() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [baby, setBaby] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchBabyData(u);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchBabyData = async (user: any) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/baby?firebaseUid=${user.uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const babyList = await res.json();
        const currentBaby = Array.isArray(babyList) ? babyList[0] : babyList;
        if (currentBaby?.id) {
          setBaby(currentBaby);
          fetchPhotos(user.uid, currentBaby.id, token);
        } else {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch baby data:", error);
      setIsLoading(false);
    }
  };

  const fetchPhotos = async (uid: string, babyId: string, token: string) => {
    try {
      const res = await fetch(`/api/baby/daily-photo?firebaseUid=${uid}&babyId=${babyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch photos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        setSelectedImage(base64data);
        await uploadAndAnalyze(base64data);
      };
      
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error processing image:", error);
      setIsUploading(false);
    }
  };

  const uploadAndAnalyze = async (base64Image: string) => {
    if (!user || !baby) return;

    try {
      const token = await user.getIdToken();
      const babyAgeMonths = differenceInMonths(new Date(), new Date(baby.dob));
      
      const res = await fetch('/api/baby/daily-photo', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          base64Image,
          babyId: baby.id,
          babyAgeMonths: Math.max(0, babyAgeMonths),
          language: i18n.language,
          firebaseUid: user.uid
        })
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();
      setAnalysisResult(data);
      
      // Refresh timeline
      fetchPhotos(user.uid, baby.id, token);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to analyze photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF2D55]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <TopBar userName={user?.displayName || "Parent"} />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </Button>
          <h1 className="text-2xl font-bold font-nunito text-[#1A1A2E]">{t('dailyPhotos') || 'Daily Photos'}</h1>
        </div>

        {/* Upload Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-[#FF2D55] to-[#FF6B35] text-white border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-8 relative z-10 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold font-nunito">Snap a Daily Picture!</h2>
                <p className="text-white/80 max-w-sm mx-auto text-sm">
                  Upload a clear photo of {baby?.name || 'your baby'} every day. Our AI will analyze it to ensure they look healthy and alert.
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg max-w-sm mx-auto text-left backdrop-blur-sm border border-white/20">
                <input
                  type="checkbox"
                  id="consent"
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#FF2D55] rounded border-white/50 focus:ring-white bg-white/20"
                />
                <label htmlFor="consent" className="text-xs text-white/90">
                  <span className="font-semibold block mb-0.5">Explicit Consent</span>
                  I consent to AI analyzing my infant's photo. This is not medical advice.
                </label>
              </div>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading || !hasConsent}
                className="h-14 px-8 bg-white text-[#FF2D55] hover:bg-white/90 text-lg font-bold shadow-lg w-full max-w-xs mx-auto flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Upload className="w-5 h-5" /> Upload Photo</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Analysis Result */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-none shadow-soft overflow-hidden">
                <div className={`h-2 ${analysisResult.isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 aspect-square rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {selectedImage && <img src={selectedImage} alt="Current photo" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-3">
                        {analysisResult.isHealthy ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                        )}
                        <div>
                          <h3 className="font-bold text-lg text-[#1A1A2E]">
                            {analysisResult.isHealthy ? 'Looks Healthy!' : 'Attention Recommended'}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">{analysisResult.observation}</p>
                        </div>
                      </div>
                      
                      {analysisResult.recommendations && (
                        <div className="p-4 bg-pink-50 rounded-xl border border-pink-100">
                          <p className="text-sm font-medium text-pink-900">
                            <strong className="block text-pink-700 mb-1">Recommendation:</strong>
                            {analysisResult.recommendations}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline Gallery */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold font-nunito text-[#1A1A2E] flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            Previous Photos
          </h3>
          
          {photos.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500">
              No photos uploaded yet. Start tracking today!
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo: any) => (
                <motion.div 
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm"
                >
                  <img 
                    src={photo.imageUrl} 
                    alt={`Photo on ${format(new Date(photo.date), 'PP')}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <div className="absolute top-2 right-2 p-1.5 rounded-full bg-white/20 backdrop-blur-md">
                    {photo.isHealthy ? (
                      <HeartPulse className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm">{format(new Date(photo.date), 'MMM d, yyyy')}</p>
                    <p className="text-white/80 text-xs truncate">
                      {photo.analysisResult?.observation || (photo.isHealthy ? 'Healthy' : 'Checkup recommended')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
