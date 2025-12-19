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

const REMOTE_TTS_URL = 'https://tts.lmk.one/api/tts';

const SpeechControl = () => {
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [voices, setVoices] = useState([]);
  
  const utteranceRef = useRef(null);
  const audioRef = useRef(null);
  const isManuallyStopped = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        const synth = window.speechSynthesis;
        const loadVoices = () => {
            const v = synth.getVoices();
            setVoices(v);
            if (v.length === 0) setUseFallback(true);
            else setUseFallback(false);
        };
        loadVoices();
        if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;
        
        setTimeout(() => {
            if (window.speechSynthesis.getVoices().length === 0) setUseFallback(true);
        }, 2000);
    } else {
        setUseFallback(true);
    }
    
    audioRef.current = new Audio();
    audioRef.current.oncanplay = () => {
        if (isManuallyStopped.current) return;
        setIsLoading(false);
        setIsReading(true);
        audioRef.current.play().catch(e => console.error("Play blocked:", e));
    };
    audioRef.current.onended = () => {
        setIsReading(false);
        setIsPaused(false);
        setIsLoading(false);
    };
    audioRef.current.onerror = (e) => {
        console.error("Remote TTS Error:", e);
        setIsLoading(false);
        setIsReading(false);
    };

    return () => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
    };
  }, []);

  const getCleanText = () => {
    const article = document.querySelector('article main .prose');
    if (!article) return "";
    const clone = article.cloneNode(true);
    
    const ignore = ['pre', 'code', '.code-block', 'button', '.no-read', 'script', 'style', 'noscript', 'img', 'svg'];
    ignore.forEach(s => clone.querySelectorAll(s).forEach(el => el.remove()));
    
    // Nagłówki z wymuszoną pauzą (przecinek)
    const headers = clone.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach(h => { h.innerText = h.innerText + ', '; });

    let text = clone.innerText;
    
    text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    
    Object.keys(PRONUNCIATION_MAP).forEach(key => {
      const regex = new RegExp(key.replace('.', '\\.'), 'gi');
      text = text.replace(regex, PRONUNCIATION_MAP[key]);
    });
    
    // USUNIĘCIE KROPEK (To one są czytane jako "kropka")
    text = text.replace(/\./g, ' '); 
    
    return text.replace(/\s+/g, ' ').trim();
  };

  const playRemoteTTS = (text) => {
      if (isManuallyStopped.current) return;
      setIsLoading(true);
      const url = `${REMOTE_TTS_URL}?text=${encodeURIComponent(text)}`;
      if (audioRef.current) {
          audioRef.current.src = url;
      }
  };

  const toggleRead = () => {
    if (isLoading) return;
    isManuallyStopped.current = false;

    if (isReading) {
        if (isPaused) { 
            if (useFallback) audioRef.current.play();
            else window.speechSynthesis.resume();
            setIsPaused(false); 
        } else { 
            if (useFallback) audioRef.current.pause();
            else window.speechSynthesis.pause();
            setIsPaused(true); 
        }
    } else {
        const text = getCleanText();
        if (!text) return;

        if (useFallback) {
            playRemoteTTS(text);
        } else {
            const synth = window.speechSynthesis;
            synth.cancel();
            const ut = new SpeechSynthesisUtterance(text);
            const pl = voices.find(v => v.lang.startsWith('pl'));
            if (pl) ut.voice = pl; else ut.lang = 'pl-PL';
            
            ut.onend = () => { setIsReading(false); setIsPaused(false); };
            ut.onerror = (e) => {
                if (isManuallyStopped.current) return;
                console.warn("Native error -> AI Home");
                setUseFallback(true);
                playRemoteTTS(text);
            };
            
            utteranceRef.current = ut;
            synth.speak(ut);
            setIsReading(true);
        }
    }
  };

  const stopRead = () => {
    isManuallyStopped.current = true;
    if (useFallback) {
        if (audioRef.current) { 
            audioRef.current.pause(); 
            audioRef.current.currentTime = 0; 
            audioRef.current.src = "";
        }
    } else {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
    setIsReading(false);
    setIsPaused(false);
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-between my-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
          Asystent Głosowy 🎧
        </span>
        {useFallback && <span className="text-[10px] text-green-500 ml-1 font-bold">(AI Home)</span>}
        {isLoading && <span className="text-[10px] text-blue-500 ml-1 animate-pulse">Proszę czekać...</span>}
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={toggleRead}
          disabled={isLoading}
          className={`px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center shadow-sm ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
        >
          {isLoading ? (
             <span className="mr-2">⏳</span>
          ) : (
             isReading && !isPaused ? <><span className="mr-2">⏸</span> Pauza</> : <><span className="mr-2">▶</span> Czytaj</>
          )}
        </button>

        <button onClick={stopRead} className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-sm">
          Stop
        </button>
      </div>
    </div>
  );
};

export default SpeechControl;
