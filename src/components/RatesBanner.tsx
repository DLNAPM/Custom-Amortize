import React, { useState } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';
import { fetchRatesForZip } from '../services/geminiService';

export default function RatesBanner() {
  const [zipCode, setZipCode] = useState('');
  const [ratesText, setRatesText] = useState('Enter your Zip Code to see current local Home & Auto Interest Rates');
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleFetchRates = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!zipCode || zipCode.length < 5) return;
    
    setIsLoading(true);
    try {
      const text = await fetchRatesForZip(zipCode);
      if (text) {
        setRatesText(text);
      }
    } catch (error) {
      console.error(error);
      setRatesText('Failed to fetch rates. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-indigo-900 text-white flex items-center px-4 py-2 text-sm overflow-hidden relative border-b border-indigo-800">
      <form onSubmit={handleFetchRates} className="flex items-center gap-2 z-10 bg-indigo-900 pr-4 shrink-0 shadow-[20px_0_20px_-10px_rgba(49,46,129,1)]">
        <MapPin className="w-4 h-4 text-indigo-300" />
        <input 
          type="text" 
          placeholder="Zip Code" 
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
          className="w-24 px-2 py-1 text-white bg-indigo-800 placeholder-indigo-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button 
          type="submit" 
          disabled={isLoading || zipCode.length < 5}
          className="bg-indigo-700 hover:bg-indigo-600 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          Get Rates
        </button>
      </form>
      
      <div 
        className="marquee-container flex-1 ml-2 cursor-pointer hover:bg-indigo-800/50 rounded transition-colors"
        onClick={() => setIsPaused(!isPaused)}
        title={isPaused ? "Click to resume scrolling" : "Click to pause scrolling"}
      >
        <div 
          className="animate-marquee font-medium tracking-wide text-indigo-100"
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
        >
          {ratesText}
        </div>
      </div>
    </div>
  );
}
