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
};

const REMOTE_TTS_URL = 'https://tts.lmk.one/api/tts';

const SpeechControl = () => {
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [voices, setVoices] = useState([]);
  
  const audioRef = useRef(null);
  const isManuallyStopped = useRef(false);
  const currentUtterance = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        const synth = window.speechSynthesis;
        const loadVoices = () => {
            const v = synth.getVoices();
            setVoices(v);
            setUseFallback(v.length === 0);
        };
        loadVoices();
        if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;
        
        // Jeśli po 1.5s nadal nie ma głosów, wymuś AI Home (częste na Linux/Steam Deck)
        setTimeout(() => {
            if (window.speechSynthesis.getVoices().length === 0) setUseFallback(true);
        }, 1500);
    } else {
        setUseFallback(true);
    }
    
    audioRef.current = new Audio();

    return () => {
        stopRead();
    };
  }, []);

  const clearHighlights = () => {
    document.querySelectorAll('.tts-highlight-sentence').forEach(el => el.classList.remove('tts-highlight-sentence'));
    if (typeof CSS !== 'undefined' && CSS.highlights) {
        CSS.highlights.delete('tts-word-highlight');
    }
  };

  const cleanAndFixText = (text) => {
    let t = text;
    
    // 1. Agresywne usuwanie emocji i emoji
    t = t.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    
    // 2. Naprawa wymowy "ó" -> "u"
    t = t.replace(/ó/g, 'u').replace(/Ó/g, 'U');
    
    // 3. Mapowanie skrótów
    Object.keys(PRONUNCIATION_MAP).forEach(key => {
        const regex = new RegExp(key.replace('.', '\\.'), 'gi');
        t = t.replace(regex, PRONUNCIATION_MAP[key]);
    });

    // 4. Czyszczenie znaków specjalnych
    return t.replace(/[^\x00-\x7F\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s\.\!\?]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
  };

  const readParagraphs = async (containers) => {
    for (let i = 0; i < containers.length; i++) {
        if (isManuallyStopped.current) break;

        const el = containers[i];
        const textToRead = cleanAndFixText(el.innerText);
        if (!textToRead || textToRead.length < 2) continue;

        // Podświetlamy akapit
        clearHighlights();
        el.classList.add('tts-highlight-sentence');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        await new Promise((resolve) => {
            if (useFallback) {
                // Tryb AI Home - akapit po akapicie
                setIsLoading(true);
                audioRef.current.src = `${REMOTE_TTS_URL}?text=${encodeURIComponent(textToRead)}`;
                audioRef.current.oncanplay = () => {
                    setIsLoading(false);
                    audioRef.current.play().catch(resolve);
                };
                audioRef.current.onended = resolve;
                audioRef.current.onerror = resolve;
            } else {
                // Tryb Natywny
                const ut = new SpeechSynthesisUtterance(textToRead);
                const pl = voices.find(v => v.lang.startsWith('pl'));
                if (pl) ut.voice = pl; else ut.lang = 'pl-PL';
                
                ut.onboundary = (event) => {
                    if (event.name === 'word' && typeof Highlight !== 'undefined') {
                        try {
                            const range = new Range();
                            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
                            let node = walker.nextNode();
                            if (node) {
                                range.setStart(node, Math.min(event.charIndex, node.textContent.length));
                                range.setEnd(node, Math.min(event.charIndex + event.charLength, node.textContent.length));
                                const highlight = new Highlight(range);
                                CSS.highlights.set('tts-word-highlight', highlight);
                            }
                        } catch (e) {}
                    }
                };
                ut.onend = resolve;
                ut.onerror = resolve;
                currentUtterance.current = ut;
                window.speechSynthesis.speak(ut);
            }
        });
    }

    if (!isManuallyStopped.current) {
        setIsReading(false);
        clearHighlights();
    }
  };

  const toggleRead = () => {
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
        return;
    }

    const article = document.querySelector('.prose');
    if (!article) return;

    const containers = Array.from(article.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'))
        .filter(c => !c.closest('.no-read') && c.innerText.trim().length > 1);

    if (containers.length === 0) return;

    isManuallyStopped.current = false;
    setIsReading(true);
    setIsPaused(false);
    readParagraphs(containers);
  };

  const stopRead = () => {
    isManuallyStopped.current = true;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioRef.current) { 
        audioRef.current.pause(); 
        audioRef.current.src = ""; 
    }
    setIsReading(false);
    setIsPaused(false);
    setIsLoading(false);
    clearHighlights();
  };

  return (
    <div className="flex items-center justify-between my-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full no-read relative z-50">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Asystent Głosowy 🎧 {useFallback && <span className="text-[10px] text-green-500 font-bold ml-1">(AI Home)</span>}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={toggleRead} className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm flex items-center min-w-[100px] justify-center">
          {isLoading ? <span className="animate-pulse">⏳...</span> : (isReading && !isPaused ? '⏸ Pauza' : '▶ Czytaj')}
        </button>
        <button onClick={stopRead} className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm">
          Stop
        </button>
      </div>
    </div>
  );
};

export default SpeechControl;
