import React, { useState, useCallback, useEffect } from 'react';
import { AnalysisResult, AnalysisState } from './types';
import { analyzeVideoContent } from './services/geminiService';
import VideoPlayer from './components/VideoPlayer';
import EventCard from './components/EventCard';
import UploadZone from './components/UploadZone';
import { LoaderIcon, AlertIcon, KeyIcon } from './components/Icons';

const isAIStudio = typeof window !== 'undefined' && (window as any).aistudio;

const App: React.FC = () => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>(AnalysisState.IDLE);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Auth state
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    const checkApiKey = async () => {
      // 1. Check for AI Studio env
      if (isAIStudio && (window as any).aistudio.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
        return;
      } 
      
      // 2. Check for manual key in localStorage
      const storedKey = localStorage.getItem('sentinal_api_key');
      if (storedKey) {
        setCustomApiKey(storedKey);
        setHasApiKey(true);
        return;
      }

      // 3. Check for build-time env var (Only use this for local dev, avoid in production for security)
      if (process.env.API_KEY) {
        setHasApiKey(true);
        return;
      }
      
      setHasApiKey(false);
    };
    checkApiKey();
  }, []);

  const handleApiKeyAction = async () => {
    if (isAIStudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
      if (errorMsg && errorMsg.includes("API Key")) setErrorMsg(null);
    } else {
      // Open manual entry modal
      setShowSettings(true);
    }
  };

  const saveCustomKey = (key: string) => {
    localStorage.setItem('sentinal_api_key', key);
    setCustomApiKey(key);
    setHasApiKey(true);
    setShowSettings(false);
    if (errorMsg && errorMsg.includes("API Key")) setErrorMsg(null);
  };

  const clearCustomKey = () => {
    localStorage.removeItem('sentinal_api_key');
    setCustomApiKey('');
    setHasApiKey(false);
    setShowSettings(false);
    setAnalysisResult(null);
    setVideoFile(null);
  };

  const handleFileSelect = useCallback((file: File) => {
    setErrorMsg(null);
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setAnalysisResult(null);
    setAnalysisState(AnalysisState.IDLE);
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!videoFile) return;

    setAnalysisState(AnalysisState.UPLOADING);
    setErrorMsg(null);

    try {
      // Pass the setAnalysisState callback and the custom API key (if set)
      const result = await analyzeVideoContent(videoFile, (state) => {
        setAnalysisState(state);
      }, customApiKey);
      
      setAnalysisResult(result);
      setAnalysisState(AnalysisState.COMPLETE);
    } catch (error: any) {
      setAnalysisState(AnalysisState.ERROR);
      
      const isAuthError = error.message && (
        error.message.includes("Requested entity was not found") || 
        error.message.includes("403") || 
        error.message.includes("API Key is missing")
      );

      if (isAuthError) {
         setHasApiKey(false);
         // If we had a stored key, it might be invalid
         if (customApiKey && !isAIStudio) {
            setErrorMsg("The provided API Key appears to be invalid or expired.");
            setShowSettings(true);
         } else if (isAIStudio) {
            setErrorMsg("API Key invalid, missing, or project not found. Please select a valid key.");
         } else {
             setErrorMsg(error.message);
         }
      } else {
         setErrorMsg(error.message || "Failed to analyze video. Please check API key and try again.");
      }
    }
  }, [videoFile, customApiKey]);

  const parseTimestamp = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const handleEventClick = (timeStr: string) => {
    const seconds = parseTimestamp(timeStr);
    setSeekTime(seconds);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">API Configuration</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Your API Key is stored locally in your browser's storage. It is never sent to our servers.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Gemini API Key</label>
                <input 
                  type="password"
                  placeholder="AIza..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={clearCustomKey}
                  className="text-red-400 hover:text-red-300 text-sm font-medium hover:underline"
                >
                  Clear Key
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="text-zinc-400 hover:text-white px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => saveCustomKey(customApiKey)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
                    disabled={!customApiKey}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="font-bold text-white">S</span>
            </div>
            <h1 className="font-bold text-xl tracking-tight">Sentinal<span className="text-zinc-500 font-normal">AI Audit</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <button 
               onClick={handleApiKeyAction}
               className={`transition-colors p-2 rounded border ${hasApiKey ? 'text-zinc-400 hover:text-white hover:bg-zinc-900 border-transparent hover:border-zinc-800' : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/50 animate-pulse'}`}
               title="Configure API Key"
             >
               <KeyIcon className="w-5 h-5" />
             </button>
             <span className="hidden sm:inline-block text-xs font-mono text-zinc-500 px-2 py-1 bg-zinc-900 rounded border border-zinc-800">
               Model: gemini-2.5-flash
             </span>
             <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Documentation</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Intro / Upload Section */}
        {analysisState === AnalysisState.IDLE && !analysisResult && (
           <div className="max-w-2xl mx-auto mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                  Automated Security Intelligence
                </h2>
                <p className="text-zinc-400">
                  Upload CCTV footage to generate structured, searchable event timelines powered by computer vision.
                </p>
              </div>

              {/* Show Upload Zone if Key is valid */}
              {hasApiKey ? (
                <>
                  <UploadZone 
                    onFileSelect={handleFileSelect} 
                    isProcessing={false} 
                  />
                  
                  {videoFile && (
                    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">
                            MP4
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-zinc-200">{videoFile.name}</p>
                            <p className="text-zinc-500">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                      </div>
                      <button 
                        onClick={startAnalysis}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        Analyze Footage
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* API Key Selection Card */
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center space-y-6 shadow-2xl">
                   <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                     <KeyIcon className="w-8 h-8 text-zinc-400" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-xl font-medium text-zinc-100">Authentication Required</h3>
                      <p className="text-zinc-400 max-w-sm mx-auto text-sm">
                         To analyze footage, you must provide a valid Gemini API Key.
                      </p>
                   </div>
                   <button 
                      onClick={handleApiKeyAction}
                      className="inline-flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-3 rounded-lg font-bold transition-all"
                   >
                      <span>{isAIStudio ? "Select API Key" : "Enter API Key"}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                      </svg>
                   </button>
                   <p className="text-xs text-zinc-600">
                      Need a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">Get one here</a>
                   </p>
                </div>
              )}
              
              {errorMsg && (
                  <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                      <AlertIcon className="w-5 h-5 flex-shrink-0" />
                      {errorMsg}
                  </div>
              )}
           </div>
        )}

        {/* Processing State */}
        {(analysisState === AnalysisState.ANALYZING || analysisState === AnalysisState.UPLOADING) && (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
             <div className="relative">
               <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-blue-500 animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-8 h-8 rounded-full bg-blue-500/20 animate-pulse"></div>
               </div>
             </div>
             <div className="text-center space-y-1">
               <h3 className="text-xl font-medium text-zinc-100">
                 {analysisState === AnalysisState.UPLOADING ? "Uploading Footage..." : "Analyzing Footage"}
               </h3>
               <p className="text-zinc-500 text-sm">
                 {analysisState === AnalysisState.UPLOADING 
                   ? "Sending video securely to Gemini (this may take a moment for large files)" 
                   : "Detecting entities, behaviors, and anomalies..."}
               </p>
             </div>
          </div>
        )}

        {/* Dashboard View */}
        {(analysisState === AnalysisState.COMPLETE || (analysisState === AnalysisState.IDLE && analysisResult)) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            
            {/* Left Column: Video Player */}
            <div className="lg:col-span-2 flex flex-col gap-4">
               {videoUrl && (
                 <VideoPlayer 
                   src={videoUrl} 
                   seekTime={seekTime} 
                   className="flex-grow bg-black w-full"
                 />
               )}
               
               {/* Metadata Bar */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                    <span className="text-zinc-500 text-xs uppercase tracking-wider block mb-1">Duration</span>
                    <span className="text-zinc-200 font-mono text-lg">{analysisResult?.video_meta.duration || "--:--"}</span>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                    <span className="text-zinc-500 text-xs uppercase tracking-wider block mb-1">Lighting Condition</span>
                    <span className="text-zinc-200 text-lg">{analysisResult?.video_meta.lighting || "Unknown"}</span>
                  </div>
               </div>

               {/* Summary */}
               <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Executive Summary</h3>
                  <p className="text-zinc-300 leading-relaxed text-sm">
                    {analysisResult?.summary}
                  </p>
               </div>
            </div>

            {/* Right Column: Event Log */}
            <div className="lg:col-span-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full shadow-2xl">
               <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex justify-between items-center">
                 <h3 className="font-semibold text-zinc-100">Event Log</h3>
                 <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-1 rounded-full border border-blue-800/50">
                   {analysisResult?.events.length || 0} Detected
                 </span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/50">
                 {analysisResult?.events.map((event, idx) => (
                   <EventCard 
                     key={idx} 
                     event={event} 
                     onClick={handleEventClick}
                     isActive={false} // Could extend to track current playing time
                   />
                 ))}
                 
                 {(!analysisResult?.events || analysisResult.events.length === 0) && (
                   <div className="text-center py-12 text-zinc-500 text-sm">
                     No significant security events detected.
                   </div>
                 )}
               </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
