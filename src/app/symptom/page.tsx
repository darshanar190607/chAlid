"use client";
import { useState, useEffect } from "react";
import { Camera, Upload, AlertCircle, CheckCircle2, RotateCw, MapPin, Phone, Navigation, Clock, User, Calendar, Map } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import NearbyDoctorsMap from "@/components/symptom/NearbyDoctorsMap";
import imageCompression from "browser-image-compression";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Puducherry"
];

interface AnalysisResult {
  condition: string;
  isNormal: boolean;
  severity: "normal" | "monitor" | "doctor" | "emergency";
  confidence: "high" | "medium" | "low";
  whatYouSee: string;
  explanation: string;
  isCommonThisSeason: boolean;
  seasonNote?: string;
  preventionTips: string[];
  whenToWorry: string[];
  immediateAction: string;
  needsDoctor: boolean;
  urgencyHours?: number;
  searchQuery: string;
  aiModel?: "gemini" | "groq";
}

interface Baby {
  id: string;
  name: string;
  dob: string;
}

export default function SymptomPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [selectedState, setSelectedState] = useState("");
  const [description, setDescription] = useState("");
  const [hasConsent, setHasConsent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchBabies();
    getUserLocation();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      if (typeof window !== 'undefined') {
        const { auth } = await import("@/lib/firebase");
        const user = auth.currentUser;
        if (user) {
          setUserProfile({ 
            name: user.displayName || user.phoneNumber || "Parent" 
          });
        }
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
    }
  };

  const fetchBabies = async () => {
    try {
      // Get current user from Firebase auth
      let user = null;
      
      if (typeof window !== 'undefined') {
        const { auth } = await import("@/lib/firebase");
        user = auth.currentUser;
        
        // If no current user, wait for auth state
        if (!user) {
          return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
              if (user) {
                try {
                  const token = await user.getIdToken();
                  const response = await fetch(`/api/baby?firebaseUid=${user.uid}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    let babiesArray = Array.isArray(data) ? data : [];
                    setBabies(babiesArray);
                  }
                } catch (err) {
                  console.error("Failed to fetch babies:", err);
                  // Add demo baby on error
                  setBabies([{
                    id: 'demo-baby',
                    name: 'Demo Baby (6 months)',
                    dob: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()
                  }]);
                }
              } else {
                // No user, add demo baby
                setBabies([{
                  id: 'demo-baby',
                  name: 'Demo Baby (6 months)',
                  dob: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()
                }]);
              }
              unsubscribe();
              resolve();
            });
          });
        }
      }
      
      if (user) {
        const token = await user.getIdToken();
        const response = await fetch(`/api/baby?firebaseUid=${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          let babiesArray = Array.isArray(data) ? data : [];
          
          // Add demo baby if no babies found (for testing)
          if (babiesArray.length === 0) {
            babiesArray = [{
              id: 'demo-baby',
              name: 'Demo Baby (6 months)',
              dob: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()
            }];
          }
          
          setBabies(babiesArray);
        }
      }
    } catch (err) {
      console.error("Failed to fetch babies:", err);
      // Add demo baby on error as well
      setBabies([{
        id: 'demo-baby',
        name: 'Demo Baby (6 months)',
        dob: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()
      }]);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Location access denied:", error);
        }
      );
    }
  };

  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    return await imageCompression(file, options);
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Create video element and canvas for capture
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Wait for video to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      // Convert to blob and compress
      canvas.toBlob(async (blob) => {
        if (blob) {
          const compressedBlob = await compressImage(blob);
          const reader = new FileReader();
          reader.onload = (e) => {
            setSelectedImage(e.target?.result as string);
            setStep(2);
          };
          reader.readAsDataURL(compressedBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      }, 'image/jpeg', 0.8);
    } catch (err) {
      setError("Camera access denied. Please use gallery upload.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file.");
      return;
    }

    try {
      const compressedBlob = await compressImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setStep(2);
      };
      reader.readAsDataURL(compressedBlob);
    } catch (err) {
      setError("Failed to process image. Please try again.");
    }
  };

  const analyzeSymptom = async () => {
    if (!selectedImage || !selectedBaby || !selectedState) return;
    
    setIsAnalyzing(true);
    setStep(3);
    setError(null);
    
    try {
      // Get Firebase token if user is authenticated
      let token = null;
      if (typeof window !== 'undefined') {
        const { auth } = await import("@/lib/firebase");
        const user = auth.currentUser;
        if (user) {
          token = await user.getIdToken();
        }
      }
      
      const formData = new FormData();
      const blob = await fetch(selectedImage).then(r => r.blob());
      formData.append('image', blob);
      formData.append('babyId', selectedBaby.id);
      formData.append('state', selectedState);
      if (description) formData.append('description', description);

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/symptom', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) throw new Error("Analysis failed");
      
      const result = await response.json();
      setAnalysisResult(result);
      setStep(4);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Unable to analyze image. Please try again.");
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'normal': return 'bg-green-500';
      case 'monitor': return 'bg-yellow-500';
      case 'doctor': return 'bg-orange-500';
      case 'emergency': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'normal': return 'bg-green-50 border-green-200';
      case 'monitor': return 'bg-yellow-50 border-yellow-200';
      case 'doctor': return 'bg-orange-50 border-orange-200';
      case 'emergency': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedImage(null);
    setSelectedBaby(null);
    setSelectedState("");
    setDescription("");
    setHasConsent(false);
    setAnalysisResult(null);
    setError(null);
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <TopBar userName={userProfile?.name} />
        
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Symptom Check</h1>
            <p className="text-gray-600">Take a photo or upload from gallery</p>
          </div>

          <div className="space-y-4 max-w-md mx-auto">
            <Button 
              onClick={handleCameraCapture}
              className="w-full h-20 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-lg font-semibold"
            >
              <Camera className="w-6 h-6 mr-3" />
              📷 Take Photo
            </Button>

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button 
                variant="outline"
                className="w-full h-20 border-2 border-orange-200 bg-white rounded-2xl text-lg font-semibold text-orange-600 hover:bg-orange-50"
              >
                <Upload className="w-6 h-6 mr-3" />
                🖼️ Upload from Gallery
              </Button>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">Tips for best results:</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Ensure good lighting</li>
                      <li>• Keep camera 20-30cm away</li>
                      <li>• Focus on the affected area</li>
                      <li>• Avoid blurry images</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {error && (
            <div className="max-w-md mx-auto">
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <TopBar userName={userProfile?.name} />
        
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Details</h1>
            <p className="text-gray-600">Help us analyze better with context</p>
          </div>

          <div className="max-w-md mx-auto space-y-6">

          {selectedImage && (
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="relative">
                  <img 
                    src={selectedImage} 
                    alt="Selected symptom" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/90"
                    onClick={() => {
                      setSelectedImage(null);
                      setStep(1);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Select Baby
              </label>
              <select
                value={selectedBaby?.id || ""}
                onChange={(e) => {
                  const baby = babies.find(b => b.id === e.target.value);
                  setSelectedBaby(baby || null);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Choose a baby...</option>
                {babies.map(baby => (
                  <option key={baby.id} value={baby.id}>
                    {baby.name}
                  </option>
                ))}
              </select>
              
              {babies.length === 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    No babies found. Please add a baby profile first.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 text-yellow-700 border-yellow-300"
                    onClick={() => window.location.href = '/profile'}
                  >
                    Add Baby Profile
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select state...</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the symptoms..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 h-24 resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <input
                type="checkbox"
                id="consent"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="mt-1 w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
              />
              <label htmlFor="consent" className="text-sm text-gray-700">
                <span className="font-semibold text-orange-900 block">I give explicit consent</span>
                to have my infant's photo and health data processed by AI for analytical purposes. I understand this is not a substitute for professional medical advice.
              </label>
            </div>

            <Button
              onClick={analyzeSymptom}
              disabled={!selectedBaby || !selectedState || !hasConsent || isAnalyzing}
              className="w-full h-14 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-xl text-lg font-semibold disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RotateCw className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Analyze Symptom
                </>
              )}
            </Button>
          </div>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 p-4 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-orange-200">
              {selectedImage && (
                <img src={selectedImage} alt="Analyzing" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="absolute inset-0 border-4 border-orange-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Symptom</h2>
            <p className="text-gray-600">AI is checking the image with medical guidelines</p>
          </div>

          <div className="space-y-2 text-left bg-white rounded-lg p-4 max-w-xs mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Checking age stage...</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span className="text-sm">Analyzing climate factors...</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span className="text-sm">Comparing with symptoms...</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span className="text-sm">Applying IAP guidelines...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4 && analysisResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Severity Card */}
          <Card className={cn("border-2", getSeverityBg(analysisResult.severity))}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-4 h-4 rounded-full", getSeverityColor(analysisResult.severity))}></div>
                <h2 className="text-xl font-bold capitalize">{analysisResult.severity}</h2>
                <span className="text-sm text-gray-500 ml-auto">
                  {analysisResult.confidence} confidence
                </span>
              </div>
              
              {analysisResult.aiModel && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 text-center">
                  🤖 Analysis by {analysisResult.aiModel === 'gemini' ? 'Google Gemini' : 'Groq AI'}
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900">Condition:</p>
                  <p className="text-gray-700">{analysisResult.condition}</p>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-900">What AI sees:</p>
                  <p className="text-gray-700">{analysisResult.whatYouSee}</p>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-900">Explanation:</p>
                  <p className="text-gray-700">{analysisResult.explanation}</p>
                </div>

                {analysisResult.seasonNote && (
                  <div>
                    <p className="font-semibold text-gray-900">Seasonal Note:</p>
                    <p className="text-gray-700">{analysisResult.seasonNote}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prevention Tips */}
          {analysisResult.preventionTips.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Prevention Tips:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                  {analysisResult.preventionTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* When to Worry */}
          {analysisResult.whenToWorry.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-red-900 mb-2">When to Worry:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {analysisResult.whenToWorry.map((worry, index) => (
                    <li key={index}>{worry}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Immediate Action */}
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-orange-900 mb-2">Do This Now:</h3>
              <p className="text-orange-700">{analysisResult.immediateAction}</p>
            </CardContent>
          </Card>

          {/* Emergency Button */}
          {analysisResult.severity === 'emergency' && (
            <Button className="w-full h-16 bg-red-500 hover:bg-red-600 text-white rounded-xl text-lg font-bold animate-pulse">
              🚨 Call 108 - Emergency
            </Button>
          )}

          {/* Doctors Map */}
          {analysisResult.needsDoctor && userLocation && (
            <NearbyDoctorsMap 
              userLocation={userLocation}
              urgencyHours={analysisResult.urgencyHours}
            />
          )}

          {/* Scan Another Button */}
          <Button onClick={resetFlow} variant="outline" className="w-full h-14 border-orange-200 text-orange-600 hover:bg-orange-50">
            Scan Another Symptom
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
