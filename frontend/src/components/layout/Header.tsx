"use client";
import { useState, useEffect } from "react";

export default function Header() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 font-sans">CPT Optimization</h1>
          <p className="text-xs text-gray-500 font-sans">EA Plan v6.7.0</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="text-right">
          {isMounted && currentTime ? (
            <>
              <p className="text-sm font-medium text-gray-900 font-sans">
                {currentTime.toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
              <p className="text-xs text-gray-500 font-sans">
                {currentTime.toLocaleDateString("tr-TR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900 font-sans">--:--:--</p>
              <p className="text-xs text-gray-500 font-sans">Loading...</p>
            </>
          )}
        </div>
        
        <div className="w-px h-8 bg-gray-300"></div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold font-sans shadow-sm">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
