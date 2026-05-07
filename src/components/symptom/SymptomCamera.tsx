"use client";
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, AlertCircle, CheckCircle2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const symptomCategories = [
  { id: 'skin', name: 'Skin & Rashes', icon: '🔴' },
  { id: 'eyes', name: 'Eyes', icon: '👁️' },
  { id: 'mouth', name: 'Mouth & Throat', icon: '👄' },
  { id: 'swelling', name: 'Swelling', icon: '💧' },
  { id: 'injury', name: 'Injury', icon: '🩹' },
  { id: 'general', name: 'General', icon: '🔍' }
];

export default function SymptomCamera({ user, baby, onAnalysis }: { user: any, baby: any, onAnalysis: (data: any) => void }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Please allow camera access to take a photo.");
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.85);
      setCapturedImage(imageData);
      setIsCapturing(false);
      
      // Stop camera
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!capturedImage || !selectedCategory) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/symptom-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: capturedImage.split(',')[1],
          symptomCategory: selectedCategory,
          babyAgeMonths: 6, // Should ideally be calculated from baby.dob
          language: 'en',
          firebaseUid: user?.uid || user?.firebaseUid
        })
      });
      
      if (!response.ok) throw new Error("Analysis failed server-side");
      const analysis = await response.json();
      onAnalysis({ ...analysis, category: selectedCategory });
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Unable to analyze image. Please try again or consult a doctor.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Selection */}
      <div className="grid grid-cols-3 gap-2">
        {symptomCategories.map(cat => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? "primary" : "outline"}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn("flex flex-col items-center p-3 h-auto rounded-xl transition-all border-orange-100", 
                 selectedCategory === cat.id ? "bg-orange-500 hover:bg-orange-600 text-white border-transparent" : "hover:bg-orange-50 text-orange-900 bg-white")}
          >
            <span className="text-2xl mb-1">{cat.icon}</span>
            <span className="text-xs font-semibold">{cat.name}</span>
          </Button>
        ))}
      </div>

      {/* Camera/Upload Interface */}
      <Card className="overflow-hidden border-orange-50 shadow-sm">
        <CardContent className="p-4">
          {isCapturing ? (
            <div className="space-y-4">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className="w-full rounded-lg bg-gray-900 aspect-video object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <Button onClick={captureImage} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-6 text-lg">
                  <Camera className="w-6 h-6 mr-2" />
                  Capture
                </Button>
                <Button 
                   variant="outline" 
                   onClick={() => {
                        const stream = videoRef.current?.srcObject as MediaStream;
                        stream?.getTracks().forEach(track => track.stop());
                        setIsCapturing(false);
                   }}
                   className="rounded-xl px-6"
                >Cancel</Button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="space-y-4">
              <img 
                src={capturedImage} 
                alt="Captured symptom" 
                className="w-full rounded-lg max-h-[300px] object-contain bg-gray-50"
              />
              <div className="flex gap-2">
                <Button 
                   onClick={analyzeImage} 
                   disabled={isAnalyzing || !selectedCategory}
                   className="flex-1 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-xl py-6 font-bold tracking-wide shadow-md disabled:opacity-50"
                >
                  {isAnalyzing ? <RotateCw className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  {isAnalyzing ? "Analyzing..." : "Analyze Now"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCapturedImage(null)}
                  className="rounded-xl px-4 border-orange-100 text-orange-600"
                >
                  Retake
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-orange-100 rounded-2xl p-8 text-center bg-orange-50/20">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Camera className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-orange-900 font-medium mb-1">Upload a Clear Picture</p>
                <p className="text-orange-600/70 text-sm mb-6">Capture or upload an image of the symptom</p>
                
                <div className="flex flex-col gap-3">
                  <Button onClick={startCamera} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-6">
                    <Camera className="w-5 h-5 mr-2" />
                    Open Camera
                  </Button>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Button variant="outline" className="w-full border-orange-100 rounded-xl py-6 bg-white text-orange-700">
                      <Upload className="w-5 h-5 mr-2" />
                      Gallery
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-red-600 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <p>{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCategory && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900 mb-0.5">
                  Pro-tip for {symptomCategories.find(c => c.id === selectedCategory)?.name}:
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                    {getCategoryTips(selectedCategory)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getCategoryTips(category: string): string {
  const tips: Record<string, string> = {
    skin: "Ensure good lighting and focus directly on the affected area. Avoid using camera flash if it causes glare.",
    eyes: "Place the camera at eye-level from about 12 inches away. Try to capture any discharge or redness clearly.",
    mouth: "Gently open the baby's mouth toward a bright light source. Use your phone's white screen as a soft light if needed.",
    swelling: "Include the surrounding healthy area in the shot to help the AI detect the extent of the swelling.",
    injury: "Take pictures from multiple angles. If there is bleeding, first clean the area gently if safe to do so.",
    general: "Ensure the subject is perfectly in focus. Natural daylight is best for accurate color diagnosis."
  };
  return tips[category] || tips.general;
}
