import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Bell,
  Search,
  SlidersHorizontal,
  Star,
  ShieldCheck,
  ChevronLeft,
  Calendar,
  Clock,
  MessageSquare,
  User,
  MapPin,
  Phone,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Laptop,
  Check,
  ArrowRight,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Info,
  Home,
  ClipboardList,
  Settings,
  LayoutDashboard,
  Layers,
  Map
} from "lucide-react";
import { AppState, Booking, SlotStatus, Professional } from "./types";
import { 
  electricalProfessionals, 
  plumbingProfessionals, 
  acRepairProfessionals, 
  cleaningProfessionals, 
  paintingProfessionals, 
  carpentryProfessionals, 
  defaultBeforeImages, 
  defaultAfterImages 
} from "./mockData";

export default function App() {
  // Navigation & Shell control
  // "split" = Show side-by-side (recommended for reviewer)
  // "customer" = Customer view only
  // "professional" = Professional view only
  const [shellLayout, setShellLayout] = useState<"split" | "customer" | "professional">("split");
  
  // App state from server
  const [state, setState] = useState<AppState>({
    booking: {
      status: "idle",
      date: "",
      timeSlot: "",
      problemDescription: "",
      paymentMethod: "",
      otp: "",
      beforePhoto: null,
      afterPhoto: null,
      customerRating: 0,
      customerReview: "",
      recommend: null,
      amountPaid: 515,
    },
    slots: {
      "10:00 a.m.": "available",
      "1:00 p.m.": "available",
      "3:00 p.m.": "available",
      "5:30 p.m.": "available",
    },
    notifications: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Customer UI Navigation state
  // "home" | "search" | "profile" | "booking" | "tracking" | "complete"
  const [customerScreen, setCustomerScreen] = useState<string>("home");
  const [selectedCategory, setSelectedCategory] = useState<string>("Electrical");
  const [selectedProfessional, setSelectedProfessional] = useState<Professional>(electricalProfessionals[0]);
  
  // Customer Booking Form state
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingSlot, setBookingSlot] = useState<string>("");
  const [problemDesc, setProblemDesc] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash after service");
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  
  // Customer review screen states
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [reviewInput, setReviewInput] = useState<string>("");
  const [recommendInput, setRecommendInput] = useState<boolean>(true);

  // Professional UI State
  const [otpInputs, setOtpInputs] = useState<string[]>(["", "", "", ""]);
  const [proAfterPhoto, setProAfterPhoto] = useState<string | null>(null);
  const [proActiveTab, setProActiveTab] = useState<"dashboard" | "schedule" | "alerts">("dashboard");

  // Show cancellation confirmation popup
  const [showCancelPopup, setShowCancelPopup] = useState<boolean>(false);

  // New features UI states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState<boolean>(false);
  const [successCountdown, setSuccessCountdown] = useState<number>(3);
  const [trackingProgress, setTrackingProgress] = useState<number>(0);
  const [mapView, setMapView] = useState<"vector" | "satellite">("vector");

  // Success redirect countdown timer
  useEffect(() => {
    let timer: any;
    let interval: any;
    if (customerScreen === "success") {
      setSuccessCountdown(3);
      interval = setInterval(() => {
        setSuccessCountdown(prev => (prev > 1 ? prev - 1 : 1));
      }, 1000);
      timer = setTimeout(() => {
        setCustomerScreen("home");
      }, 3000);
    }
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [customerScreen]);

  // Dynamic smooth tracking progress simulation for "on_the_way" state
  useEffect(() => {
    if (customerScreen !== "tracking") {
      return;
    }
    const status = state.booking.status;
    if (status === "booked" || status === "accepted") {
      setTrackingProgress(0);
    } else if (status === "on_the_way") {
      // Smooth incremental simulation that loops or stays close to arrival
      const interval = setInterval(() => {
        setTrackingProgress((prev) => {
          if (prev >= 100) {
            return 0; // Loops for demo/visual simulation, always moving!
          }
          // Increment smoothly by 0.4% per 100ms
          return Math.min(prev + 0.4, 100);
        });
      }, 100);
      return () => clearInterval(interval);
    } else if (status === "in_progress" || status === "completed") {
      setTrackingProgress(100);
    }
  }, [customerScreen, state.booking.status]);

  // Poll state every 1.5 seconds to keep Customer & Professional perfectly synchronized
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, []);

  // Set default booking date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // Sync screen based on live booking status changes
  useEffect(() => {
    if (state.booking.status === "idle") {
      // If idle and we were tracking, go back to home or review
      if (customerScreen === "tracking") {
        setCustomerScreen("home");
      }
    } else if (state.booking.status === "booked" || state.booking.status === "accepted" || state.booking.status === "on_the_way" || state.booking.status === "in_progress") {
      // If active booking, force tracking screen
      if (customerScreen === "home" || customerScreen === "search" || customerScreen === "profile" || customerScreen === "booking") {
        setCustomerScreen("tracking");
      }
    } else if (state.booking.status === "completed") {
      if (customerScreen !== "complete") {
        setCustomerScreen("complete");
      }
    }
  }, [state.booking.status]);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Failed to load backend state.");
      const data: AppState = await res.json();
      setState(data);
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
      setLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!bookingSlot) {
      alert("Please select an available time slot first!");
      return;
    }
    try {
      setLoading(true);
      
      const computedBefore = beforePhoto || (() => {
        if (problemDesc && problemDesc.trim() && problemDesc.trim() !== "No description provided.") {
          const cleaned = problemDesc.trim();
          let emoji = "⚡";
          if (selectedCategory === "Plumbing") emoji = "🚰";
          else if (selectedCategory === "AC Repair") emoji = "❄️";
          else if (selectedCategory === "Cleaning") emoji = "🧹";
          else if (selectedCategory === "Painting") emoji = "🎨";
          else if (selectedCategory === "Carpentry") emoji = "🔨";
          
          const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
          return `${emoji} ${capitalized}`;
        }
        return defaultBeforeImages[selectedCategory as keyof typeof defaultBeforeImages];
      })();

      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: bookingDate,
          timeSlot: bookingSlot,
          problemDescription: problemDesc,
          paymentMethod,
          beforePhoto: computedBefore,
          category: selectedCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create booking");
      
      await fetchState();
      setCustomerScreen("tracking");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/booking/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowCancelPopup(false);
      setBookingSlot("");
      setProblemDesc("");
      setBeforePhoto(null);
      setProAfterPhoto(null);
      setCustomerScreen("home");
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/booking/accept", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/booking/start-trip", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = otpInputs.join("");
    if (enteredOtp.length < 4) {
      alert("Please enter the complete 4-digit verification code!");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/booking/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: enteredOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setOtpInputs(["", "", "", ""]);
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteService = async () => {
    try {
      setLoading(true);
      
      const computedAfter = proAfterPhoto || (() => {
        const prob = state.booking.problemDescription;
        const cat = state.booking.category || selectedCategory;
        if (prob && prob.trim() && prob.trim() !== "No description provided.") {
          const cleaned = prob.trim();
          const lower = cleaned.toLowerCase();
          
          if (lower.includes("not working") || lower.includes("doesn't work") || lower.includes("does not work")) {
            const subject = cleaned.replace(/is\s+not\s+working|doesn't\s+work|does\s+not\s+work/gi, "").trim();
            const capSubject = subject ? (subject.charAt(0).toUpperCase() + subject.slice(1)) : "Equipment";
            return `✅ ${capSubject} is now repaired and working perfectly!`;
          } else if (lower.includes("broken") || lower.includes("damaged")) {
            const subject = cleaned.replace(/broken|damaged/gi, "").trim();
            const capSubject = subject ? (subject.charAt(0).toUpperCase() + subject.slice(1)) : "Equipment";
            return `✅ ${capSubject} has been fully repaired, aligned and tested!`;
          } else if (lower.includes("leaking") || lower.includes("leak")) {
            const subject = cleaned.replace(/leaking|leak/gi, "").trim();
            const capSubject = subject ? (subject.charAt(0).toUpperCase() + subject.slice(1)) : "Pipe / unit";
            return `✅ ${capSubject} sealed, secured and pressure tested successfully!`;
          } else if (lower.includes("dirty") || lower.includes("dust") || lower.includes("cleaning")) {
            return `✅ Thoroughly cleaned, scrubbed, and polished to pristine condition!`;
          }
          
          const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
          return `✅ Resolved: ${capitalized} fixed and verified!`;
        }
        return defaultAfterImages[cat as keyof typeof defaultAfterImages] || "✅ Resolved successfully!";
      })();

      const res = await fetch("/api/booking/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          afterPhoto: computedAfter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/booking/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: ratingInput,
          review: reviewInput,
          recommend: recommendInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Reset inputs & direct to success screen
      setRatingInput(5);
      setReviewInput("");
      setRecommendInput(true);
      setBookingSlot("");
      setProblemDesc("");
      setBeforePhoto(null);
      setProAfterPhoto(null);
      setCustomerScreen("success");
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipReview = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/booking/skip-review", {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Reset inputs & direct to success screen
      setRatingInput(5);
      setReviewInput("");
      setRecommendInput(true);
      setBookingSlot("");
      setProblemDesc("");
      setBeforePhoto(null);
      setProAfterPhoto(null);
      setCustomerScreen("success");
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSlot = async (slot: string) => {
    try {
      const res = await fetch("/api/slots/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetAll = async () => {
    if (confirm("Are you sure you want to reset all prototype states? This will clear bookings and restore slots.")) {
      try {
        setLoading(true);
        const res = await fetch("/api/state/reset", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setCustomerScreen("home");
        setBookingSlot("");
        setProblemDesc("");
        setBeforePhoto(null);
        setProAfterPhoto(null);
        setOtpInputs(["", "", "", ""]);
        await fetchState();
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle mock file uploads (converting base64 for simplicity, or preloading a visual asset)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "before" | "after") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === "before") {
          setBeforePhoto(reader.result as string);
        } else {
          setProAfterPhoto(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const professionalsByCategory: Record<string, Professional[]> = {
    "Electrical": electricalProfessionals,
    "Plumbing": plumbingProfessionals,
    "AC Repair": acRepairProfessionals,
    "Cleaning": cleaningProfessionals,
    "Painting": paintingProfessionals,
    "Carpentry": carpentryProfessionals,
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery(""); // Clear search query when explicitly selecting category
    const list = professionalsByCategory[category] || electricalProfessionals;
    setSelectedProfessional(list[0]);
    setCustomerScreen("search");
  };

  const getFilteredProfessionals = () => {
    if (!searchQuery.trim()) {
      return professionalsByCategory[selectedCategory] || electricalProfessionals;
    }
    // Combine all professionals across all categories for searching
    const all = Object.values(professionalsByCategory).flat();
    const q = searchQuery.toLowerCase();
    // Unique list by name and specialty
    return all.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.specialty.toLowerCase().includes(q)
      );
    });
  };

  const handleViewProfile = (prof: Professional) => {
    setSelectedProfessional(prof);
    setCustomerScreen("profile");
  };

  const handleGoToBooking = () => {
    setCustomerScreen("booking");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased overflow-x-hidden flex flex-col">
      
      {/* GLOBAL NAVBAR - FROSTED GLASS */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-bold text-lg text-white tracking-wider">TF</span>
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
              TrustFix
            </h1>
          </div>
        </div>

        {/* CONTROLS & SELECTION */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 flex items-center">
            <button
              onClick={() => setShellLayout("split")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                shellLayout === "split"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Laptop size={14} />
              Side-by-Side (Full Sync)
            </button>
            <button
              onClick={() => setShellLayout("customer")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                shellLayout === "customer"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <User size={14} />
              Customer Only
            </button>
            <button
              onClick={() => setShellLayout("professional")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                shellLayout === "professional"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck size={14} />
              Professional Only
            </button>
          </div>

          <button
            onClick={handleResetAll}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/60 flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            title="Reset active booking and slots"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Reset State
          </button>
        </div>
      </header>

      {/* Live sync bar disabled per user request */}

      {/* MAIN CANVAS SHELL CONTAINER */}
      <main className="flex-1 p-4 lg:p-8 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 relative">
        <div className="w-full max-w-7xl mx-auto flex flex-col xl:flex-row items-center xl:items-stretch justify-center gap-8 xl:gap-12">
          
          {/* ======================================================= */}
          {/* CUSTOMER VIEW (ANANYA) PHONE MOCKUP */}
          {/* ======================================================= */}
          {(shellLayout === "split" || shellLayout === "customer") && (
            <div className="w-full max-w-[400px] flex flex-col gap-3">
              {/* Phone view metadata labels */}
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow shadow-blue-500/50"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Customer View: Ananya</span>
                </div>
                <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  {state.booking.status === "idle" ? "READY TO BOOK" : state.booking.status.toUpperCase()}
                </span>
              </div>

              {/* iPhone shell device frame */}
              <div className="h-[780px] w-full bg-slate-950 rounded-[48px] p-3.5 border-[8px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
                {/* iPhone Notch */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-slate-950 rounded-b-2xl z-50 flex items-center justify-center">
                  <div className="w-12 h-1 bg-slate-900 rounded-full mb-1"></div>
                </div>

                {/* Status Bar */}
                <div className="h-9 pt-1 px-6 flex justify-between items-center text-[11px] font-semibold text-slate-400 z-40">
                  <span>9:41</span>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] font-mono tracking-tighter mr-1 text-slate-500">5G</span>
                    <div className="w-4 h-2.5 border border-slate-600 rounded-sm p-0.5 flex items-center">
                      <div className="w-full h-full bg-slate-400 rounded-2xs"></div>
                    </div>
                  </div>
                </div>

                {/* INTERNAL SCREEN CONTAINER */}
                <div className="flex-1 bg-slate-900 rounded-[32px] overflow-hidden flex flex-col relative text-slate-900 border border-slate-800">
                  
                  {/* APP BAR HEADER */}
                  {customerScreen !== "tracking" && customerScreen !== "complete" && (
                    <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Menu size={20} className="text-slate-600 cursor-pointer" />
                        <div>
                          <h2 className="font-black text-lg tracking-tight text-slate-800">TrustFix</h2>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest -mt-0.5">Your home, in trusted hands</p>
                        </div>
                      </div>
                      <div className="relative">
                        <Bell size={18} className="text-slate-600 cursor-pointer" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500"></span>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* SCREEN 1: HOMEPAGE (ANANYA) */}
                  {/* --------------------------------------------------- */}
                  {customerScreen === "home" && (
                    <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto pb-16">
                      
                      {/* Search box with inline search */}
                      <div className="px-4 pt-4 pb-2">
                        <div className="relative flex items-center bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm hover:border-slate-300 transition-colors">
                          <Search size={16} className="text-slate-400 mr-2" />
                          <input 
                            type="text" 
                            placeholder='Search "What service do you need?"'
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setCustomerScreen("search");
                            }}
                            className="text-xs bg-transparent outline-none w-full text-slate-700 font-semibold"
                          />
                          <SlidersHorizontal size={14} className="text-slate-400 absolute right-4 cursor-pointer" />
                        </div>
                      </div>

                      {/* Popular Services Section */}
                      <div className="px-4 py-3">
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Popular Services</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {[
                            { name: "Plumbing", icon: "🚰", active: selectedCategory === "Plumbing" },
                            { name: "Electrical", icon: "⚡", active: selectedCategory === "Electrical" },
                            { name: "AC Repair", icon: "❄️", active: selectedCategory === "AC Repair" },
                            { name: "Cleaning", icon: "🧹", active: selectedCategory === "Cleaning" },
                            { name: "Painting", icon: "🎨", active: selectedCategory === "Painting" },
                            { name: "Carpentry", icon: "🔨", active: selectedCategory === "Carpentry" }
                          ].map((cat) => (
                            <button
                              key={cat.name}
                              onClick={() => handleCategorySelect(cat.name)}
                              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                                cat.active 
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10" 
                                  : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300"
                              }`}
                            >
                              <span className="text-xl">{cat.icon}</span>
                              <span className="text-xs font-bold">{cat.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Near You Section */}
                      <div className="px-4 py-3 mt-1 flex-1">
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Recommended near you</h3>
                        
                        {(() => {
                          const recommendedPro = (professionalsByCategory[selectedCategory] || electricalProfessionals)[0];
                          return (
                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden">
                              {/* Top Tag */}
                              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-950 text-[9px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={10} /> Top Rated
                              </div>

                              <div className="flex gap-4">
                                {/* Profile Placeholder/Photo */}
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-200">
                                  <img 
                                    src={recommendedPro.avatar} 
                                    alt={recommendedPro.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-base text-slate-800 flex items-center gap-1.5">
                                    {recommendedPro.name}
                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5">
                                      <ShieldCheck size={10} /> Verified
                                    </span>
                                  </h4>
                                  
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className="flex items-center text-yellow-500">
                                      <Star size={12} fill="currentColor" />
                                      <span className="text-xs font-black ml-0.5 text-slate-800">{recommendedPro.rating}</span>
                                    </div>
                                    <span className="text-xs text-slate-400">•</span>
                                    <span className="text-xs text-slate-500 font-medium">{recommendedPro.experience} exp</span>
                                  </div>

                                  <p className="text-xs text-slate-500 mt-2 font-medium">Trust Score: <span className="text-green-600 font-bold">{recommendedPro.trustScore}%</span></p>
                                  
                                  <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block leading-none">CHARGES</span>
                                      <span className="text-sm font-black text-slate-800">₹ {recommendedPro.baseCharge}</span>
                                    </div>
                                    <button
                                      onClick={() => handleViewProfile(recommendedPro)}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-500/10 cursor-pointer"
                                    >
                                      Book now
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* SCREEN 2: SEARCH RESULTS (ELECTRICAL) */}
                  {/* --------------------------------------------------- */}
                  {customerScreen === "search" && (
                    <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto pb-16">
                      {/* Sub header with search query & back arrow */}
                      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-slate-100">
                        <button onClick={() => { setCustomerScreen("home"); setSearchQuery(""); }} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-600">
                          <ChevronLeft size={20} />
                        </button>
                        <div className="flex-1 flex items-center bg-slate-100 border border-slate-200/50 rounded-xl px-3 py-1.5 text-slate-700">
                          <Search size={14} className="text-slate-400 mr-2" />
                          <input 
                            type="text"
                            placeholder="Search service, name, specialty..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-xs bg-transparent outline-none w-full text-slate-700 font-bold"
                          />
                          {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <SlidersHorizontal size={16} className="text-slate-600 cursor-pointer" />
                      </div>

                      {/* Header Title */}
                      <div className="px-4 pt-4 pb-1 flex justify-between items-center">
                        <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">
                          {searchQuery ? `Results for "${searchQuery}"` : `Verified Professionals in ${selectedCategory}`}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {getFilteredProfessionals().length} found
                        </span>
                      </div>

                      {/* List of professionals */}
                      <div className="px-4 py-2 space-y-3.5 flex-1">
                        {getFilteredProfessionals().map((prof) => (
                          <div key={`${prof.name}-${prof.title}`} className="bg-white rounded-3xl border border-slate-200/85 p-4.5 shadow-sm">
                            <div className="flex gap-3.5">
                              {/* Left Avatar */}
                              <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-100 flex-shrink-0">
                                <img src={prof.avatar} alt={prof.name} className="w-full h-full object-cover" />
                              </div>

                              {/* Mid Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1 truncate">
                                    {prof.name}
                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                                      <ShieldCheck size={10} /> Verified
                                    </span>
                                  </h4>
                                  <div className="flex items-center text-yellow-500 flex-shrink-0">
                                    <Star size={11} fill="currentColor" />
                                    <span className="text-xs font-bold ml-0.5 text-slate-800">{prof.rating}</span>
                                  </div>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">{prof.title}</p>
                                
                                <div className="flex flex-col gap-0.5 mt-2 text-[11px] text-slate-500 font-medium">
                                  <span>Trust Score: <span className="text-green-600 font-bold">{prof.trustScore}%</span></span>
                                  <span>Charges: <span className="text-slate-800 font-black">₹ {prof.baseCharge}</span></span>
                                </div>

                                {/* Action Buttons matching wireframe */}
                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                  <button
                                    onClick={() => handleViewProfile(prof)}
                                    className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer text-center"
                                  >
                                    View Profile
                                  </button>
                                  <button
                                    onClick={() => handleViewProfile(prof)}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer text-center"
                                  >
                                    Book Now
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {getFilteredProfessionals().length === 0 && (
                          <div className="text-center py-10 bg-white rounded-3xl border border-slate-200 p-6">
                            <span className="text-3xl">🔍</span>
                            <h4 className="font-bold text-slate-700 mt-2 text-sm">No Professionals Found</h4>
                            <p className="text-xs text-slate-400 mt-1">Try searching for other terms like "Ramesh", "Electrician", or "Plumbing".</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* SCREEN 3: PROFESSIONAL PROFILE */}
                  {/* --------------------------------------------------- */}
                  {customerScreen === "profile" && (
                    <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto pb-16">
                      {/* Sub Header */}
                      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100">
                        <button onClick={() => setCustomerScreen("search")} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-600">
                          <ChevronLeft size={20} />
                        </button>
                        <h4 className="font-bold text-sm text-slate-800 truncate">{selectedProfessional.name} • Verified</h4>
                        <div className="w-8"></div>
                      </div>

                      {/* Profile details block */}
                      <div className="bg-white p-5 border-b border-slate-100">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-3xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm">
                            <img src={selectedProfessional.avatar} alt={selectedProfessional.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <div className="border-b border-slate-100 pb-2 mb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">ABOUT</span>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                                Experienced plumber (8 years) specialising in residential repairs.
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Trust Score</span>
                                <span className="text-sm font-bold text-green-600">{selectedProfessional.trustScore}%</span>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Charges</span>
                                <span className="text-sm font-bold text-slate-800">₹ {selectedProfessional.baseCharge}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Available Today Timeslots - REAL STATE ENABLED */}
                        <div className="mt-5">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Available Today</h5>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["10:00 a.m.", "1:00 p.m.", "3:00 p.m.", "5:30 p.m."].map((slot) => {
                              // Check real availability in state
                              const status = state.slots[slot];
                              const isBooked = status === "booked";
                              const isUnavailable = status === "unavailable";
                              const isSelected = bookingSlot === slot;

                              return (
                                <button
                                  key={slot}
                                  disabled={isBooked || isUnavailable}
                                  onClick={() => setBookingSlot(slot)}
                                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                    isBooked
                                      ? "bg-red-50 text-red-400 border-red-100 cursor-not-allowed opacity-60"
                                      : isUnavailable
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                      : isSelected
                                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                      : "bg-white text-slate-700 border-slate-200/80 hover:border-blue-300"
                                  }`}
                                >
                                  {slot}
                                  {isBooked && <span className="block text-[8px] font-medium leading-none mt-0.5">Booked</span>}
                                  {isUnavailable && <span className="block text-[8px] font-medium leading-none mt-0.5">Blocked</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Reviews Panel */}
                      <div className="px-5 py-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">Recent reviews</h5>
                        <div className="space-y-3">
                          {selectedProfessional.reviews.map((rev) => (
                            <div key={rev.author} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-3xs">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                                    {rev.author[0]}
                                  </div>
                                  <div>
                                    <h6 className="text-xs font-bold text-slate-800">{rev.author}</h6>
                                    <span className="text-[9px] text-slate-400 block -mt-0.5">{rev.date}</span>
                                  </div>
                                </div>
                                <div className="flex text-yellow-500">
                                  {Array.from({ length: rev.rating }).map((_, i) => (
                                    <Star key={i} size={10} fill="currentColor" />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
                                {rev.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer CTA */}
                      <div className="p-4 bg-white border-t border-slate-100 mt-auto">
                        <button
                          onClick={handleGoToBooking}
                          disabled={!bookingSlot}
                          className={`w-full py-3.5 rounded-2xl text-xs font-extrabold transition-all uppercase tracking-wider ${
                            bookingSlot
                              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/15 cursor-pointer"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {bookingSlot ? `Book ${bookingSlot} Slot` : "Select Time to Continue"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* SCREEN 4: BOOKING SHEET */}
                  {/* --------------------------------------------------- */}
                  {customerScreen === "booking" && (
                    <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto pb-16">
                      {/* Sub Header */}
                      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100">
                        <button onClick={() => setCustomerScreen("profile")} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-600">
                          <ChevronLeft size={20} />
                        </button>
                        <h4 className="font-bold text-sm text-slate-800">Booking Details</h4>
                        <div className="w-8"></div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Selected Provider Card */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border">
                              <img src={selectedProfessional.avatar} alt={selectedProfessional.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-slate-800">{selectedProfessional.name}</h5>
                              <span className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5">✓ Verified Electrician</span>
                            </div>
                          </div>
                          <div className="bg-blue-50 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase">
                            ₹ {selectedProfessional.baseCharge}
                          </div>
                        </div>

                        {/* Date selection widget */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Select Date</label>
                          <div className="relative flex items-center">
                            <Calendar size={14} className="absolute left-3 text-slate-500" />
                            <input 
                              type="date" 
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              className="w-full bg-white border border-slate-200/80 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>

                        {/* Selected Time check */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Select Time</label>
                          <div className="bg-blue-50 text-blue-700 p-3 rounded-xl border border-blue-100 flex items-center gap-2 text-xs font-bold">
                            <Clock size={14} />
                            <span>Requested Slot: {bookingSlot}</span>
                          </div>
                        </div>

                        {/* Text Problem Description */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Describe the problem</label>
                          <textarea
                            value={problemDesc}
                            onChange={(e) => setProblemDesc(e.target.value)}
                            placeholder="Please share what electrical issue or repair you need Ramesh to resolve..."
                            className="w-full h-20 bg-white border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* File Upload (Optional) */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Upload the photo (Optional)</label>
                          <div className="border border-dashed border-slate-200 bg-white rounded-xl p-4 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, "before")}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {beforePhoto ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-blue-600 font-bold">✓ Selected Custom Photo</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[200px] mt-1">{beforePhoto.substring(0, 30)}...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <Upload size={20} className="text-slate-400 mb-1" />
                                <span className="text-xs text-slate-600 font-bold">Upload image</span>
                                <span className="text-[9px] text-slate-400 mt-0.5">Max: 5MB</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price Estimation */}
                        <div className="p-3 bg-slate-100 rounded-xl flex justify-between items-center text-xs border border-slate-200/50">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Price Estimation</span>
                          <span className="font-extrabold text-slate-800">₹ {selectedProfessional.baseCharge} to ₹ 699</span>
                        </div>

                        {/* Payment Options */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Select Payment Method</label>
                          <div className="grid grid-cols-2 gap-2">
                            {["UPI", "Net Banking", "Credit/Debit card", "Cash after service"].map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setPaymentMethod(method)}
                                className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                  paymentMethod === method
                                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200/80 hover:border-slate-300"
                                }`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Confirm Booking CTA */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleCreateBooking}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Confirm Booking
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* SCREEN 5: LIVE TRACKING */}
                  {/* --------------------------------------------------- */}
                  {customerScreen === "tracking" && (() => {
                    const totalDistanceKm = 3.2;
                    const currentDistanceKm = Math.max(0, totalDistanceKm * (1 - trackingProgress / 100));
                    const currentEstTimeMins = Math.max(0, Math.ceil(10 * (1 - trackingProgress / 100)));

                    const formattedDistance = state.booking.status === "in_progress" || state.booking.status === "completed"
                      ? "Arrived"
                      : currentDistanceKm === 0
                      ? "Arrived"
                      : currentDistanceKm < 0.1
                      ? `${Math.round(currentDistanceKm * 1000)} meters`
                      : `${currentDistanceKm.toFixed(2)} km`;

                    const formattedTime = state.booking.status === "in_progress" || state.booking.status === "completed"
                      ? "Arrived"
                      : currentEstTimeMins === 0
                      ? "Arrived"
                      : `${currentEstTimeMins} mins`;

                    const markerStyle: React.CSSProperties = {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      offsetPath: `path("M 120 130 Q 180 110, 240 70 T 300 30")`,
                      WebkitOffsetPath: `path("M 120 130 Q 180 110, 240 70 T 300 30")`,
                      offsetDistance: `${trackingProgress}%`,
                      WebkitOffsetDistance: `${trackingProgress}%`,
                      offsetRotate: "0deg",
                      WebkitOffsetRotate: "0deg",
                      transform: "translate(-50%, -50%)",
                    };

                    return (
                      <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto pb-16">
                        
                        {/* Back Arrow */}
                        <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-slate-100">
                          <button onClick={() => setCustomerScreen("home")} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-600">
                            <ChevronLeft size={20} />
                          </button>
                          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Track your service</h4>
                        </div>

                        {/* Map Box Component (Animated Pulsing State indicator) */}
                        <div className={`h-44 relative overflow-hidden border-b transition-all duration-300 ${
                          mapView === "satellite" 
                            ? "bg-slate-950 border-slate-950 text-white" 
                            : "bg-blue-50/50 border-slate-100 text-slate-900"
                        }`}>
                          
                          {/* Map Mode Toggler */}
                          <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-slate-200/80 p-1 rounded-xl shadow-md transition-all">
                            <button 
                              onClick={() => setMapView("vector")}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                                mapView === "vector" 
                                  ? "bg-blue-600 text-white shadow" 
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              <Map size={10} />
                              Vector
                            </button>
                            <button 
                              onClick={() => setMapView("satellite")}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                                mapView === "satellite" 
                                  ? "bg-slate-900 text-slate-100 shadow border border-slate-750" 
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              <Layers size={10} />
                              Satellite
                            </button>
                          </div>

                          {/* Map Grid Background pattern */}
                          {mapView === "vector" ? (
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#2563eb_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
                          ) : (
                            <>
                              {/* Satellite Grid Overlay */}
                              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                              
                              {/* Forest/Park Patches */}
                              <div className="absolute left-6 top-4 w-20 h-14 bg-emerald-950/40 rounded-full blur-sm border border-emerald-900/30"></div>
                              <div className="absolute right-14 top-20 w-24 h-14 bg-emerald-950/30 rounded-3xl blur-md border border-emerald-900/20"></div>
                              <div className="absolute left-28 top-2 w-14 h-10 bg-emerald-950/20 rounded-full blur-sm border border-emerald-900/10"></div>
                              
                              {/* Urban Blocks/Buildings */}
                              <div className="absolute left-20 top-24 w-7 h-10 bg-slate-900/80 border border-slate-800/80 rounded shadow-sm"></div>
                              <div className="absolute left-44 top-16 w-10 h-8 bg-slate-900/80 border border-slate-800/80 rounded shadow-sm"></div>
                              <div className="absolute left-10 top-12 w-8 h-8 bg-slate-900/80 border border-slate-800/80 rounded shadow-sm"></div>
                              <div className="absolute right-20 top-4 w-12 h-10 bg-slate-900/80 border border-slate-800/80 rounded shadow-sm"></div>
                              <div className="absolute right-3 top-24 w-10 h-12 bg-slate-900/80 border border-slate-800/80 rounded shadow-sm"></div>

                              {/* Winding River */}
                              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                <path 
                                  d="M 0 80 Q 80 100, 150 150 T 360 160" 
                                  fill="none" 
                                  stroke="#1d4ed8" 
                                  strokeWidth="10" 
                                  opacity="0.25" 
                                  className="blur-[2px]" 
                                />
                                <path 
                                  d="M 0 80 Q 80 100, 150 150 T 360 160" 
                                  fill="none" 
                                  stroke="#1e40af" 
                                  strokeWidth="6" 
                                  opacity="0.35" 
                                />
                              </svg>

                              {/* HUD telemetry readings */}
                              <span className="absolute top-1.5 left-2 font-mono text-[7px] text-slate-500 select-none tracking-wider">
                                GPS AUTO-TRACK • 12.9716° N, 77.5946° E
                              </span>
                              <span className="absolute bottom-1.5 right-2 font-mono text-[7px] text-slate-500 select-none tracking-wider uppercase">
                                ALT: 412M • ACCURACY: 3M
                              </span>
                            </>
                          )}
                          
                          {/* Interactive path line */}
                          <svg className="absolute inset-0 w-full h-full">
                            {/* Background route track */}
                            <path 
                              d="M 120 130 Q 180 110, 240 70 T 300 30" 
                              fill="none" 
                              stroke={mapView === "satellite" ? "#334155" : "#cbd5e1"} 
                              strokeWidth="3.5" 
                              strokeLinecap="round"
                            />
                            {/* Active covered route path */}
                            <path 
                              d="M 120 130 Q 180 110, 240 70 T 300 30" 
                              fill="none" 
                              stroke={mapView === "satellite" ? "#06b6d4" : "#3b82f6"} 
                              strokeWidth="4" 
                              strokeLinecap="round"
                              strokeDasharray="220"
                              strokeDashoffset={220 - (220 * trackingProgress) / 100}
                              className="transition-all duration-100"
                            />
                            {/* Pulse effect overlay on dotted trail */}
                            <path 
                              d="M 120 130 Q 180 110, 240 70 T 300 30" 
                              fill="none" 
                              stroke={mapView === "satellite" ? "#22d3ee" : "#60a5fa"} 
                              strokeWidth="3" 
                              strokeDasharray="6 4"
                              className="animate-dash opacity-80"
                            />
                          </svg>

                          {/* TrustFix Hub Start pin */}
                          <div 
                            style={{ left: 120, top: 130, transform: "translate(-50%, -50%)" }}
                            className="absolute w-5 h-5 rounded-full bg-slate-900 border-2 border-white shadow-md flex items-center justify-center text-white z-10"
                          >
                            <span className="text-[7px] font-black">H</span>
                          </div>

                          {/* Dynamic professional pulsing marker (moves based on status) */}
                          <div 
                            style={markerStyle}
                            className="flex flex-col items-center z-20 pointer-events-none"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center relative">
                              <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-35"></span>
                              <img 
                                src={selectedProfessional.avatar} 
                                alt={selectedProfessional.name} 
                                className="w-full h-full object-cover rounded-full" 
                              />
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 border border-white flex items-center justify-center text-[7px] text-white">
                                ⚡
                              </span>
                            </div>
                            <span className="text-[7px] font-black bg-slate-950 text-white px-1.5 py-0.5 rounded-md mt-1 shadow border border-slate-800 uppercase tracking-wider whitespace-nowrap">
                              {state.booking.status === "on_the_way" 
                                ? `Ramesh (${Math.round(trackingProgress)}%)` 
                                : state.booking.status === "in_progress" 
                                ? "ON SITE" 
                                : "ASSIGNED"}
                            </span>
                          </div>

                          {/* Customer home anchor point at ending coordinate */}
                          <div 
                            style={{ left: 300, top: 30, transform: "translate(-50%, -50%)" }}
                            className="absolute w-9 h-9 rounded-full bg-green-500 border-2 border-white shadow-lg flex items-center justify-center text-white z-10"
                          >
                            <MapPin size={15} />
                          </div>

                          {/* Floating status bubble with Distance and Time Remaining */}
                          <div className={`absolute bottom-2.5 left-2.5 backdrop-blur-md border px-3 py-1.5 rounded-xl text-[9px] font-bold flex flex-col gap-0.5 shadow-xl z-20 transition-all ${
                            mapView === "satellite"
                              ? "bg-slate-950/95 text-white border-slate-800"
                              : "bg-white/95 text-slate-800 border-slate-200"
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full animate-ping ${mapView === "satellite" ? "bg-cyan-400" : "bg-green-500"}`}></span>
                              <span className={mapView === "satellite" ? "text-slate-300" : "text-slate-600"}>Live service tracking</span>
                            </div>
                            <div className={`text-[10px] font-black tracking-wide mt-0.5 uppercase ${mapView === "satellite" ? "text-cyan-400" : "text-blue-600"}`}>
                              {formattedDistance} remaining • {formattedTime}
                            </div>
                          </div>
                        </div>

                        {/* Status Card Overlay */}
                        <div className="bg-white p-5 border-b border-slate-100 flex-1">
                          <div className="pb-4 mb-4 border-b border-slate-100">
                            <h4 className="font-extrabold text-base text-slate-800">Congratulations!</h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {state.booking.status === "booked" && "Your booking is confirmed. Waiting for Ramesh Patel to accept."}
                              {state.booking.status === "accepted" && "Your booking is confirmed. Ramesh Patel is preparing to head your way."}
                              {state.booking.status === "on_the_way" && "Ramesh Patel is currently on his way to your location."}
                              {state.booking.status === "in_progress" && "Ramesh Patel is currently working on your electrical repair."}
                            </p>
                          </div>

                          {/* Professional Card Mini */}
                          <div className="flex gap-3 mb-5">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border">
                              <img src={selectedProfessional.avatar} alt={selectedProfessional.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h5 className="font-bold text-xs text-slate-800">{selectedProfessional.name}</h5>
                                <span className="text-[10px] text-yellow-600 font-extrabold">★ {selectedProfessional.rating}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">Electrician • 92% Trust Score</p>
                            </div>
                          </div>

                          {/* VERIFICATION OTP BLOCK (HIGHLIGHTED) */}
                          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center mb-5">
                            <div>
                              <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block leading-none mb-1">Verification OTP</span>
                              <span className="text-2xl font-mono font-black text-blue-900 tracking-wider">
                                {state.booking.otp || "4829"}
                              </span>
                              <span className="text-[8px] text-slate-400 block mt-1">(Share the OTP only with the service provider.)</span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Mobile No</span>
                              <span className="text-xs font-bold text-slate-700 block mt-0.5 whitespace-nowrap">+91 98210 59821</span>
                            </div>
                          </div>

                          {/* WIREFRAME CHECKLIST STATUS TIMELINE */}
                          <div className="space-y-3 mb-6">
                            <h6 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</h6>
                            
                            <div className="relative pl-6 space-y-4">
                              {/* Vertical line indicator */}
                              <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-200"></div>

                              {[
                                { label: "Booking Confirmed", desc: "Waiting for review", active: true },
                                { label: "Professional assigned", desc: "Ramesh Patel accepted", active: ["accepted", "on_the_way", "in_progress", "completed"].includes(state.booking.status) },
                                { label: "On the way", desc: "Ramesh is travelling", active: ["on_the_way", "in_progress", "completed"].includes(state.booking.status) },
                                { label: "Service started", desc: "OTP verification complete", active: ["in_progress", "completed"].includes(state.booking.status) },
                                { label: "Completed", desc: "Before/After review", active: ["completed"].includes(state.booking.status) },
                              ].map((step, idx) => (
                                <div key={idx} className="relative flex gap-3">
                                  {/* Dot */}
                                  <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                                    step.active ? "bg-blue-600 shadow shadow-blue-500/50" : "bg-slate-200"
                                  }`}></div>
                                  <div>
                                    <p className={`text-xs font-bold leading-none ${step.active ? "text-slate-800" : "text-slate-400"}`}>{step.label}</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">{step.desc}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="space-y-2">
                            <a 
                              href="tel:+919821059821"
                              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                            >
                              <Phone size={14} />
                              Call Professional
                            </a>
                            <button
                              onClick={() => setShowCancelPopup(true)}
                              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all border border-red-100 cursor-pointer text-center"
                            >
                              Cancel Booking
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* --------------------------------------------------- */}
                  {/* SCREEN 6: SERVICE COMPLETE (BEFORE & AFTER REVIEW) */}
                  {/* --------------------------------------------------- */}
                  {customerScreen === "complete" && (
                    <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto pb-16">
                      
                      {/* Top completed banner */}
                      <div className="bg-green-600 text-white pt-10 pb-6 px-5 text-center relative overflow-hidden shrink-0">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full z-0 animate-pulse"></div>
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md relative z-10">
                          <CheckCircle2 size={22} className="text-green-600" />
                        </div>
                        <h4 className="font-extrabold text-sm relative z-10 uppercase tracking-wide">Service Completed</h4>
                        <p className="text-[9px] text-green-100 mt-0.5 relative z-10">Ramesh has resolved your issue flawlessly</p>
                      </div>

                      <div className="p-4 space-y-4">
                        
                        {/* Before & After comparison row */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Before & After Work Photos</label>
                          <div className="grid grid-cols-2 gap-3.5">
                            {/* Before Card */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden p-2.5">
                              <div className="aspect-video bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-center p-2 text-[10px] font-semibold border border-red-100">
                                {state.booking.beforePhoto || "⚡ Damaged Panel with frayed wires"}
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 text-center block mt-1.5 uppercase">Before</span>
                            </div>

                            {/* After Card */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden p-2.5">
                              <div className="aspect-video bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-center p-2 text-[10px] font-semibold border border-green-100">
                                {state.booking.afterPhoto || "✅ Polished Panel beautifully fixed!"}
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 text-center block mt-1.5 uppercase">After</span>
                            </div>
                          </div>
                        </div>

                        {/* Amount details */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-[9px]">Amount Paid</span>
                            <span className="text-base font-black text-slate-800">₹ {state.booking.amountPaid}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">Paid via UPI</p>
                        </div>

                        {/* Ratings Component */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Rate your Experience</label>
                          
                          {/* Stars matching wireframe */}
                          <div className="flex gap-1.5 justify-center py-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRatingInput(star)}
                                className="p-1 hover:scale-110 transition-transform cursor-pointer"
                              >
                                <Star 
                                  size={24} 
                                  fill={star <= ratingInput ? "#f59e0b" : "none"} 
                                  className={star <= ratingInput ? "text-yellow-500" : "text-slate-200"} 
                                />
                              </button>
                            ))}
                          </div>

                          {/* Leave review text area */}
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Leave a review</label>
                            <textarea
                              value={reviewInput}
                              onChange={(e) => setReviewInput(e.target.value)}
                              placeholder="Share what stood out with Ramesh's punctuality and quality..."
                              className="w-full h-16 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Would you recommend? Yes/No Radio options */}
                          <div className="pt-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Would you recommend Ramesh Patel?</p>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 font-bold cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="recommend" 
                                  checked={recommendInput === true} 
                                  onChange={() => setRecommendInput(true)} 
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                Yes
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 font-bold cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="recommend" 
                                  checked={recommendInput === false} 
                                  onChange={() => setRecommendInput(false)} 
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                No
                              </label>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSubmitReview}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer mt-2"
                          >
                            Submit Review
                          </button>

                          <button
                            type="button"
                            onClick={handleSkipReview}
                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer mt-1 text-center"
                          >
                            Continue without giving a review
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* SCREEN: SUCCESS / THANK YOU (ANANYA) */}
                  {/* --------------------------------------------------- */}
                  {customerScreen === "success" && (
                    <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-md border border-green-100 animate-bounce">
                        <CheckCircle2 size={44} className="text-green-500" />
                      </div>
                      <h4 className="font-extrabold text-xl text-slate-800">Thank You!</h4>
                      <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
                        Your feedback helps us maintain Ramesh's 92% Trust Score and keeps TrustFix reliable.
                      </p>
                      
                      {/* Dynamic Countdown */}
                      <div className="mt-8 bg-blue-50 border border-blue-100/50 rounded-2xl px-5 py-3 text-blue-700 text-xs font-bold flex items-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-blue-500" />
                        <span>Redirecting to your dashboard in {successCountdown}s...</span>
                      </div>

                      <button
                        onClick={() => setCustomerScreen("home")}
                        className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Go to Dashboard Now
                      </button>
                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* SCREEN: CUSTOMER PROFILE & ACCOUNT (ANANYA) */}
                  {/* --------------------------------------------------- */}
                  {customerScreen === "customer_profile" && (
                    <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto pb-16">
                      
                      {/* Cover & Profile Header */}
                      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-6 pb-8 relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl z-0"></div>
                        
                        {/* Title */}
                        <div className="flex justify-between items-center mb-4 relative z-10">
                          <h4 className="font-extrabold text-base tracking-wide uppercase">My Profile</h4>
                          <span className="bg-blue-500/25 border border-blue-400/30 text-blue-300 text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest">
                            Customer View
                          </span>
                        </div>

                        {/* Profile Info */}
                        <div className="flex items-center gap-4 relative z-10 mt-2">
                          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/25 flex items-center justify-center text-2xl font-black text-white shadow-md overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150" alt="Ananya Sharma" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h5 className="font-bold text-lg leading-none">Ananya Sharma</h5>
                            <p className="text-slate-300 text-xs mt-1.5 font-medium">34-year-old working professional</p>
                            <span className="inline-block bg-green-500/20 text-green-300 border border-green-500/30 text-[8px] font-bold px-2 py-0.5 rounded-md mt-2 uppercase tracking-wide">
                              ✓ Gold Tier Member
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Profile details list */}
                      <div className="p-4 space-y-4">
                        
                        {/* Account Details Card */}
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3.5">
                          <h6 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Contact Information</h6>
                          
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                              <User size={14} />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Full Name</span>
                              <span className="text-xs font-bold text-slate-700 block">Ananya Sharma</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                              <Phone size={14} />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Mobile Number</span>
                              <span className="text-xs font-bold text-slate-700 block">+91 98210 59821</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                              <span className="text-xs font-extrabold">@</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Email Address</span>
                              <span className="text-xs font-bold text-slate-700 block">ananya.sharma@example.com</span>
                            </div>
                          </div>
                        </div>

                        {/* Saved Addresses Card */}
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3.5">
                          <h6 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Saved Addresses</h6>
                          
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                              <Home size={14} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-extrabold text-slate-800 block">Home Address (Default)</span>
                              <span className="text-[11px] text-slate-400 font-medium leading-relaxed block mt-0.5">Flat 405, Block B, Green Glen Layout, Bangalore - 560103</span>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-2.5 border-t border-slate-100">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                              <Laptop size={14} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-extrabold text-slate-800 block">Office Address</span>
                              <span className="text-[11px] text-slate-400 font-medium leading-relaxed block mt-0.5">Signature Towers, Tech Park, Bangalore - 560100</span>
                            </div>
                          </div>
                        </div>

                        {/* Booking History Card */}
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3.5">
                          <div className="flex justify-between items-center mb-1">
                            <h6 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Past Booking History</h6>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">3 bookings</span>
                          </div>
                          
                          {/* Live booking if active */}
                          {state.booking.status !== "idle" && (
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-extrabold text-blue-600 block uppercase font-mono">Active Job ({selectedCategory})</span>
                                <span className="text-xs font-bold text-slate-700 block mt-0.5">{selectedProfessional.name}</span>
                              </div>
                              <button 
                                onClick={() => setCustomerScreen("tracking")}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                              >
                                Track Live
                              </button>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                              <div>
                                <span className="text-xs font-extrabold text-slate-800 block">AC Service & Repair</span>
                                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Amit Singh • 2nd June 2026</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-800 block">₹ 599</span>
                                <span className="inline-block text-[9px] font-extrabold text-green-600 bg-green-100/60 px-1.5 py-0.5 rounded-md mt-1 uppercase">Completed</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                              <div>
                                <span className="text-xs font-extrabold text-slate-800 block">Electrical Socket Replacement</span>
                                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Ramesh Patel • 12th May 2026</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-800 block">₹ 399</span>
                                <span className="inline-block text-[9px] font-extrabold text-green-600 bg-green-100/60 px-1.5 py-0.5 rounded-md mt-1 uppercase">Completed</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                              <div>
                                <span className="text-xs font-extrabold text-slate-800 block">Bathroom Pipe Leakage Fix</span>
                                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Amit Singh • 20th April 2026</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-800 block">₹ 299</span>
                                <span className="inline-block text-[9px] font-extrabold text-green-600 bg-green-100/60 px-1.5 py-0.5 rounded-md mt-1 uppercase">Completed</span>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* BOTTOM REPLICATED WIREFRAME NAV */}
                  {customerScreen !== "tracking" && customerScreen !== "complete" && customerScreen !== "success" && (
                    <div className="bg-slate-900 text-slate-400 py-3.5 px-6 flex justify-between items-center mt-auto border-t border-slate-800/60 z-30">
                      <button onClick={() => setCustomerScreen("home")} className={`flex flex-col items-center gap-0.5 cursor-pointer ${customerScreen === "home" ? "text-blue-500" : "hover:text-white"}`}>
                        <Home size={16} strokeWidth={customerScreen === "home" ? 2.5 : 2} className={customerScreen === "home" ? "text-blue-500" : "text-slate-400"} />
                        <span className="text-[8px] font-bold uppercase mt-0.5">Home</span>
                      </button>
                      <button onClick={() => setCustomerScreen("search")} className={`flex flex-col items-center gap-0.5 cursor-pointer ${customerScreen === "search" ? "text-blue-500" : "hover:text-white"}`}>
                        <Search size={16} strokeWidth={customerScreen === "search" ? 2.5 : 2} className={customerScreen === "search" ? "text-blue-500" : "text-slate-400"} />
                        <span className="text-[8px] font-bold uppercase mt-0.5">Search</span>
                      </button>
                      <button onClick={() => setCustomerScreen("customer_profile")} className={`flex flex-col items-center gap-0.5 cursor-pointer ${customerScreen === "customer_profile" ? "text-blue-500" : "hover:text-white"}`}>
                        <User size={16} strokeWidth={customerScreen === "customer_profile" ? 2.5 : 2} className={customerScreen === "customer_profile" ? "text-blue-500" : "text-slate-400"} />
                        <span className="text-[8px] font-bold uppercase mt-0.5">Account</span>
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* SERVICE PROFESSIONAL VIEW (RAMESH) PHONE MOCKUP */}
          {/* ======================================================= */}
          {(shellLayout === "split" || shellLayout === "professional") && (
            <div className="w-full max-w-[400px] flex flex-col gap-3">
              {/* Phone view metadata labels */}
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow shadow-green-500/50"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Provider View: Ramesh</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[10px] font-extrabold text-slate-400">ACTIVE SESSION</span>
                </div>
              </div>

              {/* iPhone shell device frame */}
              <div className="h-[780px] w-full bg-slate-950 rounded-[48px] p-3.5 border-[8px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
                {/* iPhone Notch */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-slate-950 rounded-b-2xl z-50 flex items-center justify-center">
                  <div className="w-12 h-1 bg-slate-900 rounded-full mb-1"></div>
                </div>

                {/* Status Bar */}
                <div className="h-9 pt-1 px-6 flex justify-between items-center text-[11px] font-semibold text-slate-400 z-40">
                  <span>9:41</span>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] font-mono tracking-tighter mr-1 text-slate-500">5G</span>
                    <div className="w-4 h-2.5 border border-slate-600 rounded-sm p-0.5 flex items-center">
                      <div className="w-full h-full bg-slate-400 rounded-2xs"></div>
                    </div>
                  </div>
                </div>

                {/* INTERNAL SCREEN CONTAINER */}
                <div className="flex-1 bg-slate-900 rounded-[32px] overflow-hidden flex flex-col relative text-slate-900 border border-slate-800">
                  
                  {/* APP BAR HEADER */}
                  <div className="bg-slate-900 px-5 py-4 flex items-center justify-between border-b border-slate-800 text-white relative">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 overflow-hidden border border-blue-500">
                        <img src={electricalProfessionals[0].avatar} alt="Ramesh" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-sm tracking-tight text-white">Ramesh Patel</h2>
                        <div className="mt-0.5">
                          <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border border-green-500/20">
                            <span className="h-1 w-1 bg-green-500 rounded-full animate-pulse"></span> Electrician Specialist
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)} 
                      className="relative p-1.5 hover:bg-slate-800 rounded-full cursor-pointer text-slate-300 hover:text-white transition-colors"
                    >
                      <Bell size={18} />
                      {(state.notifications.length > 0 || state.booking.status === "booked") && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 shadow shadow-blue-500/50"></span>
                      )}
                    </button>
                  </div>

                  {/* SLIDE-DOWN NOTIFICATION DRAWER FOR RAMESH */}
                  {showNotificationsDrawer && (
                    <div className="absolute top-[68px] inset-x-0 bg-slate-900 border-b border-slate-800/80 shadow-2xl z-50 max-h-[320px] flex flex-col text-white animate-in slide-in-from-top duration-200">
                      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800/60 flex justify-between items-center">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Notifications & Alerts</span>
                        <button 
                          onClick={() => setShowNotificationsDrawer(false)}
                          className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {/* CURRENT CUSTOMER REQUEST BLOCK */}
                        {state.booking.status === "booked" && (
                          <div className="bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-800/50 rounded-2xl p-3.5 shadow">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[8px] font-extrabold text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded uppercase tracking-wider">
                                New Incoming Job
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold font-mono">{state.booking.timeSlot}</span>
                            </div>
                            <h5 className="font-extrabold text-xs text-white">Ananya Sharma (Electrical)</h5>
                            <p className="text-[10px] text-slate-300 mt-1.5 leading-relaxed bg-slate-950/40 p-2 rounded-lg border border-slate-800/40">
                              "{state.booking.problemDescription || "No issue description provided"}"
                            </p>
                            
                            {/* Action Buttons matching wireframe */}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={async () => {
                                  await handleCancelBooking();
                                  setShowNotificationsDrawer(false);
                                }}
                                className="flex-1 py-1.5 bg-red-950 hover:bg-red-900 border border-red-900/30 text-red-300 text-[9px] font-black rounded-lg uppercase tracking-wider cursor-pointer text-center"
                              >
                                Decline
                              </button>
                              <button
                                onClick={async () => {
                                  await handleAcceptBooking();
                                  setShowNotificationsDrawer(false);
                                  setProActiveTab("dashboard");
                                }}
                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-lg uppercase tracking-wider cursor-pointer text-center"
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Standard Notification logs */}
                        <div className="space-y-2">
                          {state.notifications.map((notif) => (
                            <div key={notif.id} className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl flex gap-2.5 items-start">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                                  {notif.text}
                                </p>
                                <span className="text-[8px] font-mono text-slate-500 mt-0.5 block">{notif.time}</span>
                              </div>
                            </div>
                          ))}
                          {state.notifications.length === 0 && state.booking.status !== "booked" && (
                            <div className="text-center py-6 text-xs text-slate-500">
                              No notifications logged yet. Try triggering a booking.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB TAB CONTROLLER FOR DASHBOARD VIEWS */}
                  <div className="bg-slate-950 px-3 py-2 flex gap-1 border-b border-slate-800/80 text-white">
                    <button
                      onClick={() => setProActiveTab("dashboard")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        proActiveTab === "dashboard"
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Active Job
                    </button>
                    <button
                      onClick={() => setProActiveTab("schedule")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        proActiveTab === "schedule"
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Schedule
                    </button>
                    <button
                      onClick={() => setProActiveTab("account")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        proActiveTab === "account"
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Account
                    </button>
                  </div>

                  {/* --------------------------------------------------- */}
                  {/* PRO TAB 1: ACTIVE JOB MANAGEMENT */}
                  {/* --------------------------------------------------- */}
                  {proActiveTab === "dashboard" && (
                    <div className="flex-1 bg-slate-950 flex flex-col overflow-y-auto pb-4">
                      
                      {state.booking.status === "idle" ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white">
                          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow">
                            <Clock size={28} className="text-slate-500 animate-pulse" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-300">Waiting for Bookings</h4>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                            No active service requests right now. Configure your schedule slots in the next tab to get matches.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 space-y-4 text-white">
                          
                          {/* Customer Information summary */}
                          <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg relative overflow-hidden">
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">Current Customer Request</p>
                            <h4 className="text-lg font-black mt-0.5">Ananya Sharma</h4>
                            
                            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                              <div className="flex items-center gap-1.5 opacity-90">
                                <MapPin size={12} />
                                <span>3.2 km away</span>
                              </div>
                              <div className="flex items-center gap-1.5 opacity-90">
                                <Clock size={12} />
                                <span>{state.booking.timeSlot} Slot</span>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-white/20 text-xs">
                              <span className="text-[9px] font-bold block opacity-60 uppercase">Problem Description</span>
                              <p className="italic mt-0.5 text-slate-100 font-medium truncate">
                                "{state.booking.problemDescription}"
                              </p>
                            </div>
                          </div>

                          {/* STEP-BY-STEP PRO ACTIONS */}
                          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
                            
                            {/* STATE 1: Booking Received (Accept) */}
                            {state.booking.status === "booked" && (
                              <div className="space-y-3.5">
                                <div className="text-center">
                                  <AlertTriangle size={24} className="text-yellow-500 mx-auto mb-2" />
                                  <h5 className="font-bold text-xs">New Service Booking Alert!</h5>
                                  <p className="text-[10px] text-slate-400 mt-1">Ananya has requested you for Electrical repair. Accept booking to proceed.</p>
                                </div>
                                <button
                                  onClick={handleAcceptBooking}
                                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer shadow-lg shadow-blue-600/10"
                                >
                                  Accept Booking Request
                                </button>
                              </div>
                            )}

                            {/* STATE 2: Accepted (Start Trip) */}
                            {state.booking.status === "accepted" && (
                              <div className="space-y-3">
                                <div className="text-center">
                                  <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
                                  <h5 className="font-bold text-xs">Booking Accepted!</h5>
                                  <p className="text-[10px] text-slate-400 mt-1">Prepare your gear and hit the road. Press "Start Trip" to let Ananya track your location.</p>
                                </div>
                                <button
                                  onClick={handleStartTrip}
                                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer"
                                >
                                  Start Trip (Notify Client)
                                </button>
                              </div>
                            )}

                            {/* STATE 3: On The Way (OTP Verification Prompt) */}
                            {state.booking.status === "on_the_way" && (
                              <div className="space-y-4">
                                <div className="text-center">
                                  <Clock size={24} className="text-blue-500 mx-auto mb-2" />
                                  <h5 className="font-bold text-xs text-slate-200">OTP Code Verification Required</h5>
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    Ask Ananya for the 4-digit verification code displayed on her live tracking screen to start the job.
                                  </p>
                                </div>

                                {/* Custom OTP fields matching wireframes */}
                                <div className="flex justify-center gap-2">
                                  {otpInputs.map((digit, idx) => (
                                    <input
                                      key={idx}
                                      type="text"
                                      maxLength={1}
                                      value={digit}
                                      onChange={(e) => {
                                        const newOtp = [...otpInputs];
                                        newOtp[idx] = e.target.value.replace(/[^0-9]/g, "");
                                        setOtpInputs(newOtp);
                                        // Auto-focus next field
                                        if (e.target.value && idx < 3) {
                                          const nextInput = document.getElementById(`otp-${idx + 1}`);
                                          nextInput?.focus();
                                        }
                                      }}
                                      id={`otp-${idx}`}
                                      placeholder="-"
                                      className="w-12 h-14 bg-slate-950 border-2 border-slate-800 focus:border-blue-500 rounded-xl text-center text-xl font-bold text-white outline-none"
                                    />
                                  ))}
                                </div>

                                <button
                                  onClick={handleVerifyOtp}
                                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <ShieldCheck size={14} />
                                  Verify Code & Start Service
                                </button>

                                <div className="p-2.5 bg-slate-950 rounded-xl text-[9px] text-slate-400 border border-slate-800 flex items-center gap-1.5 justify-center">
                                  <Info size={10} className="text-blue-400 flex-shrink-0" />
                                  <span>Test Hint: Use OTP <span className="text-blue-400 font-bold">{state.booking.otp}</span></span>
                                </div>
                              </div>
                            )}

                            {/* STATE 4: In Progress (After photo upload & completion) */}
                            {state.booking.status === "in_progress" && (
                              <div className="space-y-4">
                                <div className="text-center">
                                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto mb-2 border border-yellow-500/20">
                                    <span className="text-xs animate-spin block">⚡</span>
                                  </div>
                                  <h5 className="font-bold text-xs">Service In Progress</h5>
                                  <p className="text-[10px] text-slate-400 mt-1">Carry out the electrical repair work. When completed, upload an "After" photo to finalize.</p>
                                </div>

                                {/* After photo upload portal */}
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1.5">Image Upload Portal (After Work State)</label>
                                  <div className="border border-dashed border-slate-800 bg-slate-950 rounded-xl p-4 text-center hover:border-slate-700 transition-colors relative cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handlePhotoUpload(e, "after")}
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {proAfterPhoto ? (
                                      <div className="flex flex-col items-center">
                                        <CheckCircle2 size={16} className="text-green-500 mb-1" />
                                        <span className="text-[10px] text-green-400 font-bold">Image loaded successfully</span>
                                        <span className="text-[8px] text-slate-500 truncate max-w-[200px] mt-0.5">{proAfterPhoto.substring(0, 30)}...</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <Upload size={18} className="text-slate-500 mb-1" />
                                        <span className="text-xs text-slate-300 font-bold">Upload After Work Photo</span>
                                        <span className="text-[8px] text-slate-500 mt-0.5">Click to browse or take photo</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={handleCompleteService}
                                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer"
                                >
                                  Complete Service
                                </button>
                              </div>
                            )}

                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* PRO TAB 2: SCHEDULE CONFIGURATOR */}
                  {/* --------------------------------------------------- */}
                  {proActiveTab === "schedule" && (
                    <div className="flex-1 bg-slate-950 flex flex-col p-4 overflow-y-auto">
                      <div className="mb-4">
                        <h4 className="text-white text-xs font-bold uppercase tracking-wider block mb-1">Calendar & Schedule Configuration</h4>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Manage your active time slots for today. Toggling a slot to "Unavailable" instantly disables it on the customer booking page. Booked slots cannot be changed.
                        </p>
                      </div>

                      {/* Small Calendar Peek */}
                      <div className="flex gap-2 mb-5">
                        <div className="flex-shrink-0 w-11 h-14 bg-blue-900/30 text-blue-400 rounded-xl border border-blue-900/40 flex flex-col items-center justify-center">
                          <span className="text-[8px] font-bold">MON</span>
                          <span className="text-base font-bold">12</span>
                        </div>
                        <div className="flex-shrink-0 w-11 h-14 bg-slate-900 text-slate-400 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                          <span className="text-[8px] font-bold text-slate-500">TUE</span>
                          <span className="text-base font-bold">13</span>
                        </div>
                        <div className="flex-shrink-0 w-11 h-14 bg-slate-900 text-slate-400 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                          <span className="text-[8px] font-bold text-slate-500">WED</span>
                          <span className="text-base font-bold">14</span>
                        </div>
                        <div className="flex-1 h-14 bg-slate-900 rounded-xl border border-slate-850 flex items-center justify-center px-3.5">
                          <div className="w-full h-1 bg-slate-800 rounded-full relative">
                            <div className="absolute left-0 top-0 w-1/3 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Time Slots Configulator */}
                      <div className="space-y-2.5 flex-1">
                        <h5 className="text-white text-[10px] font-bold uppercase tracking-wider text-slate-400">Timeslots Status</h5>
                        
                        {["10:00 a.m.", "1:00 p.m.", "3:00 p.m.", "5:30 p.m."].map((slot) => {
                          const status = state.slots[slot];
                          return (
                            <div 
                              key={slot}
                              className={`p-3.5 rounded-2xl border flex items-center justify-between text-white transition-all ${
                                status === "booked"
                                  ? "bg-red-950/20 border-red-900/40"
                                  : status === "unavailable"
                                  ? "bg-slate-900/40 border-slate-800/80"
                                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Clock size={16} className={status === "booked" ? "text-red-400" : status === "unavailable" ? "text-slate-500" : "text-blue-400"} />
                                <div>
                                  <span className="text-xs font-bold block">{slot}</span>
                                  <span className="text-[8px] text-slate-500 font-bold block uppercase mt-0.5">Status: {status}</span>
                                </div>
                              </div>

                              <button
                                disabled={status === "booked"}
                                onClick={() => handleToggleSlot(slot)}
                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  status === "booked"
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed"
                                    : status === "unavailable"
                                    ? "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
                                    : "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                                }`}
                              >
                                {status === "booked" ? "Booked" : status === "unavailable" ? "Enable" : "Disable"}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* PRO TAB 3: ALERTS LOG */}
                  {/* --------------------------------------------------- */}
                  {proActiveTab === "alerts" && (
                    <div className="flex-1 bg-slate-950 flex flex-col p-4 overflow-y-auto">
                      <div className="mb-4">
                        <h4 className="text-white text-xs font-bold uppercase tracking-wider">State Synchronization alerts Log</h4>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          View chronological notifications synced automatically in real-time from user activities.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {state.notifications.map((notif) => (
                          <div key={notif.id} className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] font-mono text-slate-500 uppercase">{notif.time}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                              {notif.text}
                            </p>
                          </div>
                        ))}
                        {state.notifications.length === 0 && (
                          <div className="text-center py-10 text-slate-600 text-xs">
                            No notifications logged yet. Try triggering a booking.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --------------------------------------------------- */}
                  {/* PRO TAB 4: PROFESSIONAL PROFILE & ACCOUNT */}
                  {/* --------------------------------------------------- */}
                  {proActiveTab === "account" && (
                    <div className="flex-1 bg-slate-950 flex flex-col overflow-y-auto pb-4 text-white">
                      
                      {/* Provider Header Background */}
                      <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 border-b border-slate-800 relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl z-0"></div>
                        
                        <div className="flex justify-between items-center mb-4 relative z-10">
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Professional Profile</h4>
                          <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                            ✓ ACTIVE SPECIALIST
                          </span>
                        </div>

                        <div className="flex items-center gap-4 relative z-10">
                          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative flex-shrink-0">
                            <img src={electricalProfessionals[0].avatar} alt="Ramesh Patel" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-base">Ramesh Patel</h5>
                            <p className="text-[11px] text-slate-400 mt-1 font-medium">Electrician Specialist • 8+ years exp</p>
                            
                            {/* Trust Score badge */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-[9px] bg-green-950/40 text-green-400 border border-green-900/30 px-2 py-0.5 rounded font-black uppercase tracking-wide flex items-center gap-0.5">
                                <ShieldCheck size={10} /> 92% Trust Score
                              </span>
                              <span className="text-[9px] bg-yellow-950/40 text-yellow-400 border border-yellow-900/30 px-2 py-0.5 rounded font-black uppercase tracking-wide flex items-center gap-0.5">
                                ★ 4.9 Rating
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="p-4 space-y-4">
                        
                        {/* Earnings Dashboard Section */}
                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                          <h6 className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Earnings Dashboard</h6>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850">
                              <span className="text-[8px] font-extrabold text-slate-500 block uppercase font-mono">Today's Earnings</span>
                              <span className="text-base font-black text-white block mt-1">₹ 1,197</span>
                              <span className="text-[8px] text-green-400 block mt-0.5 font-bold">3 bookings completed</span>
                            </div>
                            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850">
                              <span className="text-[8px] font-extrabold text-slate-500 block uppercase font-mono">Monthly Income</span>
                              <span className="text-base font-black text-white block mt-1">₹ 24,580</span>
                              <span className="text-[8px] text-blue-400 block mt-0.5 font-bold">58 bookings completed</span>
                            </div>
                          </div>
                        </div>

                        {/* Verified Verification Badges */}
                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 space-y-3 shadow-sm">
                          <h6 className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Verified Credentials</h6>
                          
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-green-950/40 border border-green-900/30 flex items-center justify-center text-green-400">
                                <ShieldCheck size={14} />
                              </div>
                              <div>
                                <span className="text-xs font-bold block">Electrical Specialist License</span>
                                <span className="text-[9px] text-slate-500 block font-mono">Issued by KPTCL • ID: #EL-58209</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-blue-950/40 border border-blue-900/30 flex items-center justify-center text-blue-400">
                                <User size={14} />
                              </div>
                              <div>
                                <span className="text-xs font-bold block">Biometric KYC & ID Verified</span>
                                <span className="text-[9px] text-slate-500 block">Aadhaar verified via Digilocker</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-yellow-950/40 border border-yellow-900/30 flex items-center justify-center text-yellow-400">
                                <Check size={14} strokeWidth={3} />
                              </div>
                              <div>
                                <span className="text-xs font-bold block">Punctuality Verified</span>
                                <span className="text-[9px] text-slate-500 block">Average prompt arrival rate: 98.4%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 space-y-3 shadow-sm text-xs text-slate-300">
                          <h6 className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">Provider Contact Details</h6>
                          
                          <div className="flex justify-between py-1 border-b border-slate-850/50">
                            <span className="text-slate-500 font-bold">Email:</span>
                            <span className="font-bold text-white">ramesh.patel@trustfix.in</span>
                          </div>
                          
                          <div className="flex justify-between py-1 border-b border-slate-850/50">
                            <span className="text-slate-500 font-bold">Mobile:</span>
                            <span className="font-bold text-white">+91 91204 88392</span>
                          </div>

                          <div className="flex justify-between py-1">
                            <span className="text-slate-500 font-bold">Base Service Fee:</span>
                            <span className="font-bold text-white">₹ 399</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* BOTTOM REPLICATED WIREFRAME NAV */}
                  <div className="bg-slate-950 text-slate-500 py-3.5 px-6 flex justify-between items-center mt-auto border-t border-slate-850/80 z-30">
                    <button onClick={() => setProActiveTab("dashboard")} className={`flex flex-col items-center gap-0.5 cursor-pointer ${proActiveTab === "dashboard" ? "text-blue-500" : "hover:text-slate-400"}`}>
                      <LayoutDashboard size={16} strokeWidth={proActiveTab === "dashboard" ? 2.5 : 2} className={proActiveTab === "dashboard" ? "text-blue-500" : "text-slate-500"} />
                      <span className="text-[8px] font-bold uppercase mt-0.5">Dashboard</span>
                    </button>
                    <button onClick={() => setProActiveTab("schedule")} className={`flex flex-col items-center gap-0.5 cursor-pointer ${proActiveTab === "schedule" ? "text-blue-500" : "hover:text-slate-400"}`}>
                      <Calendar size={16} strokeWidth={proActiveTab === "schedule" ? 2.5 : 2} className={proActiveTab === "schedule" ? "text-blue-500" : "text-slate-500"} />
                      <span className="text-[8px] font-bold uppercase mt-0.5">Schedule</span>
                    </button>
                    <button onClick={() => setProActiveTab("account")} className={`flex flex-col items-center gap-0.5 cursor-pointer ${proActiveTab === "account" ? "text-blue-500" : "hover:text-slate-400"}`}>
                      <User size={16} strokeWidth={proActiveTab === "account" ? 2.5 : 2} className={proActiveTab === "account" ? "text-blue-500" : "text-slate-500"} />
                      <span className="text-[8px] font-bold uppercase mt-0.5">Account</span>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ======================================================= */}
      {/* POPUP: CANCEL BOOKING SAFETY VALVE */}
      {/* ======================================================= */}
      {showCancelPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl relative">
            <button 
              onClick={() => setShowCancelPopup(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-white font-bold text-lg">Cancel Active Booking?</h4>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Are you sure you want to trigger the cancellation safety valve? Ramesh Patel will be notified immediately and your selected slot will become available for booking again.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCancelPopup(false)}
                className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelBooking}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SYSTEM HEALTH BAR */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-4 px-6 md:px-8 flex flex-col md:flex-row items-center justify-center gap-4 text-xs text-slate-500">
        <div className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
          TrustFix Integration Dashboard • Built with AI Studio
        </div>
      </footer>
    </div>
  );
}
