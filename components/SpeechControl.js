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
  const [useFallback, setUseFallback] = useState(false);
  const [voices, setVoices] = useState([]);
  
  const utteranceRef = useRef(null);
  const audioRef = useRef(null);
  const sentenceQueue = useRef([]);

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
    
    // Zwykły tag <audio> (bez skryptów zewnętrznych!)
    audioRef.current = new Audio();
    audioRef.current.onended = playNextSentence;
    audioRef.current.onerror = (e) => {
        console.warn("Audio Error (Google Block?):", e);
        // Próbuj następne mimo błędu
        setTimeout(playNextSentence, 500);
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
    let text = clone.innerText;
    text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    Object.keys(PRONUNCIATION_MAP).forEach(key => {
      const regex = new RegExp(key.replace('.', '\\.'), 'gi');
      text = text.replace(regex, PRONUNCIATION_MAP[key]);
    });
    return text.replace(/\s+/g, ' ').trim();
  };

  // --- ODTWARZANIE JAKO PLIK MP3 ---
  const playNextSentence = () => {
      if (sentenceQueue.current.length === 0) {
          setIsReading(false);
          setIsPaused(false);
          return;
      }
      const sentence = sentenceQueue.current.shift();
      
      // Używamy client=tw-ob (działa najlepiej jako "plik")
      // Dzielimy na bardzo krótkie kawałki, żeby nie przekroczyć limitu GET
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(sentence)}&tl=pl&client=tw-ob`;
      
      if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch(e => console.error("Play blocked:", e));
      }
  };

  const startOnlineAudio = (text) => {
      // Dzielimy na bardzo krótkie fragmenty (<100 znaków), bo URL ma limity
      const chunks = text.match(/[^.!?]+[.!?]+|\s*$/g)
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .flatMap(s => s.length > 80 ? s.match(/.{1,80}(\s|$)/g) : [s]);

      sentenceQueue.current = chunks;
      playNextSentence();
      setIsReading(true);
  };

  const toggleRead = () => {
    const text = getCleanText();
    if (!text) return;

    if (useFallback) {
        // FALLBACK: Czyste Audio MP3
        if (isReading) {
            if (isPaused) { audioRef.current.play(); setIsPaused(false); }
            else { audioRef.current.pause(); setIsPaused(true); }
        } else {
            startOnlineAudio(text);
        }
    } else {
        // NATIVE
        const synth = window.speechSynthesis;
        if (isReading) {
            if (isPaused) { synth.resume(); setIsPaused(false); }
            else { synth.pause(); setIsPaused(true); }
        } else {
            synth.cancel();
            const ut = new SpeechSynthesisUtterance(text);
            const pl = voices.find(v => v.lang.startsWith('pl'));
            if (pl) ut.voice = pl; else ut.lang = 'pl-PL';
            
            ut.onend = () => { setIsReading(false); setIsPaused(false); };
            ut.onerror = () => { 
                console.warn("Native error -> switch to MP3");
                setUseFallback(true); 
                startOnlineAudio(text);
            };
            
            utteranceRef.current = ut;
            synth.speak(ut);
            setIsReading(true);
        }
    }
  };

  const stopRead = () => {
    if (useFallback) {
        if (audioRef.current) { audioRef.current.pause(); sentenceQueue.current = []; }
    } else {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
    setIsReading(false);
    setIsPaused(false);
  };

  return (
    <div className="flex items-center justify-between my-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
          Asystent Głosowy 🎧
        </span>
        {useFallback && <span className="text-[10px] text-gray-400 ml-1">(Stream MP3)</span>}
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={toggleRead}
          className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center shadow-sm"
        >
          {isReading && !isPaused ? (
            <><span className="mr-2">⏸</span> Pauza</>
          ) : (
            <><span className="mr-2">▶</span> {isPaused ? "Wznów" : "Czytaj"}</>
          )}
        </button>

        {isReading && (
          <button onClick={stopRead} className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-sm">
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default SpeechControl;