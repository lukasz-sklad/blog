import React, { useState, useEffect, useRef } from 'react';

const PRONUNCIATION_MAP = {
  ' vs ': ' kontra ',
  ' vs. ': ' kontra ',
  ' np. ': ' na przykład ',
  ' tzn. ': ' to znaczy ',
  ' w/w ': ' wyżej wymienione ',
  ' m.in. ': ' między innymi ',
  ' itd. ': ' i tak dalej ',
  ' ssh ': ' es es ha ',
  ' : ': ' dwukropek ',
  ' -> ': ' strzałka ',
};

const SpeechControl = () => {
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasVoices, setHasVoices] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState([]);
  
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        setIsSupported(false);
        return;
    }

    const synth = window.speechSynthesis;
    
    const loadVoices = () => {
        const v = synth.getVoices();
        setVoices(v);
        setHasVoices(v.length > 0);
    };

    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }
    
    // Ostatnie sprawdzenie po chwili (dla Chrome/Android)
    setTimeout(loadVoices, 1000);

    return () => {
        synth.cancel();
        if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = null;
    };
  }, []);

  const getCleanText = () => {
    const article = document.querySelector('article main .prose');
    if (!article) return "";
    const clone = article.cloneNode(true);
    const ignore = ['pre', 'code', '.code-block', 'button', '.no-read', 'script', 'style', 'noscript', 'img', 'svg'];
    ignore.forEach(s => clone.querySelectorAll(s).forEach(el => el.remove()));
    let text = clone.innerText;
    text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    Object.keys(PRONUNCIATION_MAP).forEach(key => {
      const regex = new RegExp(key.replace('.', '\\.'), 'gi');
      text = text.replace(regex, PRONUNCIATION_MAP[key]);
    });
    return text.replace(/\s+/g, ' ').trim();
  };

  const toggleRead = () => {
    if (!hasVoices) return;

    const synth = window.speechSynthesis;
    if (isReading) {
        if (isPaused) { synth.resume(); setIsPaused(false); } 
        else { synth.pause(); setIsPaused(true); }
    } else {
        const text = getCleanText();
        if (!text) return;

        synth.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        const pl = voices.find(v => v.lang.startsWith('pl'));
        if (pl) ut.voice = pl; else ut.lang = 'pl-PL';
        
        ut.onend = () => { setIsReading(false); setIsPaused(false); };
        ut.onerror = () => { setIsReading(false); setIsPaused(false); };
        
        utteranceRef.current = ut;
        synth.speak(ut);
        setIsReading(true);
    }
  };

  const stopRead = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsReading(false);
    setIsPaused(false);
  };

  if (!isSupported) return null;

  return (
    <div className="flex items-center justify-between my-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
          Asystent Głosowy 🎧
        </span>
        {!hasVoices && (
            <span className="text-[10px] text-red-400 ml-1" title="Zainstaluj pakiet mowy w systemie (np. speech-dispatcher na Linuxie)">
                (Brak TTS)
            </span>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={toggleRead}
          disabled={!hasVoices}
          className={`px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center shadow-sm 
            ${!hasVoices ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400' : ''}`}
        >
          {isReading && !isPaused ? (
            <><span className="mr-2">⏸</span> Pauza</>
          ) : (
            <><span className="mr-2">▶</span> Czytaj</>
          )}
        </button>

        <button 
            onClick={stopRead} 
            disabled={!hasVoices}
            className={`px-4 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-sm ${!hasVoices ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Stop
        </button>
      </div>
    </div>
  );
};

export default SpeechControl;
