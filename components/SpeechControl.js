import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const PRONUNCIATION_MAP = {
  ' vs ': ' kontra ',
  ' vs. ': ' kontra ',
  ' np. ': ' na przykład ',
  ' tzn. ': ' to znaczy ',
  ' w/w ': ' wyżej wymienione ',
  ' m.in. ': ' między innymi ',
  ' itd. ': ' i tak dalej ',
  ' ssh ': ' es es ha ',
  'గ': ' j ',
};

const REMOTE_TTS_URL = '/api/voice';

const SpeechControl = ({ mode = "post" }) => {
  const router = useRouter();
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [voices, setVoices] = useState([]);
  
  const [readerData, setReaderData] = useState(null); 
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);

  const audioRef = useRef(null); // Zachowujemy dla kompatybilności, ale będziemy tworzyć lokalne obiekty
  const isManuallyStopped = useRef(false);
  const currentUtterance = useRef(null);
  const readerRefs = useRef([]);
  const jsonInputRef = useRef(null);

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

        if (mode === "pdf") {
            const handleReaderStart = (e) => {
                setReaderData(e.detail);
                setCurrentParagraphIndex(0);
                stopRead();
            };
            window.addEventListener('tts-reader-start', handleReaderStart);
            return () => window.removeEventListener('tts-reader-start', handleReaderStart);
        }

        const handleReaderLoadState = (e) => {
            if (e.detail && typeof e.detail.paragraphIndex === 'number') {
                setCurrentParagraphIndex(e.detail.paragraphIndex);
            }
        };
        window.addEventListener('tts-reader-load-state', handleReaderLoadState);
        return () => window.removeEventListener('tts-reader-load-state', handleReaderLoadState);
    }
    audioRef.current = new Audio();
    return () => stopRead();
  }, [mode]);

  const clearHighlights = () => {
    document.querySelectorAll('.tts-highlight-sentence').forEach(el => el.classList.remove('tts-highlight-sentence'));
  };

  const cleanAndFixText = (text) => {
    let t = text;
    t = t.replace(/గ/g, ' j ');
    t = t.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    t = t.replace(/ó/g, 'u').replace(/Ó/g, 'U');
    Object.keys(PRONUNCIATION_MAP).forEach(key => {
        const regex = new RegExp(key.replace('.', '\\.'), 'gi');
        t = t.replace(regex, PRONUNCIATION_MAP[key]);
    });
    return t.replace(/[^\x00-\x7F\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s\.\!\?]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const downloadState = () => {
    const state = { title: readerData?.title || "Post", paragraphIndex: currentParagraphIndex, date: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stan-${state.title.replace(/\s+/g, '-')}.json`; a.click();
  };

  const handleLoadJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const state = JSON.parse(event.target.result);
            if (typeof state.paragraphIndex === 'number') {
                setCurrentParagraphIndex(state.paragraphIndex);
                stopRead();
                setTimeout(() => {
                    const el = readerRefs.current[state.paragraphIndex];
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        } catch (err) { alert("Błąd pliku JSON"); }
        e.target.value = "";
    };
    reader.readAsText(file);
  };

  const readParagraphs = async (containersOrTexts, startIndex = 0) => {
    const synth = window.speechSynthesis;
    for (let i = startIndex; i < containersOrTexts.length; i++) {
        if (isManuallyStopped.current) break;
        setCurrentParagraphIndex(i);
        const content = readerData ? containersOrTexts[i] : containersOrTexts[i].innerText;
        const el = readerData ? readerRefs.current[i] : containersOrTexts[i];
        const textToRead = cleanAndFixText(content);
        if (!textToRead || textToRead.length < 2) continue;
        clearHighlights();
        if (el) { el.classList.add('tts-highlight-sentence'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        
        await new Promise((resolve) => {
            if (useFallback) {
                // Stabilny, pojedynczy obiekt Audio
                if (!audioRef.current) {
                    audioRef.current = new Audio();
                }
                const audio = audioRef.current;
                
                audio.pause();
                audio.src = "";
                setIsLoading(true);

                const onCanPlay = () => {
                    setIsLoading(false);
                    audio.play().catch(() => { cleanup(); resolve(); });
                };

                const onEnded = () => { cleanup(); resolve(); };
                const onError = () => { cleanup(); setIsLoading(false); resolve(); };

                const cleanup = () => {
                    audio.removeEventListener('canplay', onCanPlay);
                    audio.removeEventListener('ended', onEnded);
                    audio.removeEventListener('error', onError);
                };

                audio.addEventListener('canplay', onCanPlay);
                audio.addEventListener('ended', onEnded);
                audio.addEventListener('error', onError);

                audio.src = `${REMOTE_TTS_URL}?text=${encodeURIComponent(textToRead)}&t=${Date.now()}`;
                audio.load();

                // Bezpiecznik: jeśli po 10 sekundach nic się nie dzieje, idziemy dalej
                setTimeout(() => { cleanup(); resolve(); }, 15000);
            } else {
                synth.cancel();
                const ut = new SpeechSynthesisUtterance(textToRead);
                const pl = voices.find(v => v.lang.startsWith('pl'));
                if (pl) ut.voice = pl; else ut.lang = 'pl-PL';
                const timeout = setTimeout(resolve, 60000); 
                ut.onend = () => { clearTimeout(timeout); resolve(); };
                ut.onerror = () => { clearTimeout(timeout); resolve(); };
                currentUtterance.current = ut; synth.speak(ut);
            }
        });
    }
    if (!isManuallyStopped.current) { setIsReading(false); clearHighlights(); }
  };

  const toggleRead = () => {
    if (isReading) {
        if (isPaused) { if (useFallback) audioRef.current.play(); else window.speechSynthesis.resume(); setIsPaused(false); }
        else { if (useFallback) audioRef.current.pause(); else window.speechSynthesis.pause(); setIsPaused(true); }
        return;
    }
    isManuallyStopped.current = false; setIsReading(true); setIsPaused(false);
    if (readerData) readParagraphs(readerData.paragraphs, currentParagraphIndex);
    else {
        const prose = document.querySelector('.prose');
        if (!prose) { setIsReading(false); return; }
        const containers = Array.from(prose.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6')).filter(c => !c.closest('.no-read') && c.innerText.trim().length > 1);
        readParagraphs(containers, currentParagraphIndex);
    }
  };

  const stopRead = () => {
    isManuallyStopped.current = true;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsReading(false); setIsPaused(false); setIsLoading(false); clearHighlights();
  };

  const resetReader = () => { stopRead(); setReaderData(null); setCurrentParagraphIndex(0); window.dispatchEvent(new CustomEvent('tts-reader-close')); };

  if (mode === "pdf") {
    if (!readerData) return null;
    return (
        <div className="fixed inset-0 z-[9990] bg-white dark:bg-black flex flex-col animate-in fade-in duration-500 overflow-hidden text-gray-900 dark:text-white">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col overflow-hidden max-w-[50%]">
                    <h1 className="text-sm md:text-xl font-black text-blue-600 dark:text-blue-400 truncate uppercase">{readerData.title}</h1>
                    <span className="text-[10px] text-gray-500 font-bold font-mono">Akapit {currentParagraphIndex + 1} / {readerData.paragraphs.length}</span>
                </div>
                <div className="flex items-center space-x-1 md:space-x-2">
                    <button onClick={toggleRead} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md">
                        {isLoading ? '⏳' : (isReading && !isPaused ? 'Pauza' : '▶ Czytaj')}
                    </button>
                    <button onClick={() => jsonInputRef.current.click()} className="bg-indigo-600 text-white p-2 rounded-lg text-xs shadow-md" title="Wczytaj JSON">📂</button>
                    <button onClick={downloadState} className="bg-green-600 text-white p-2 rounded-lg text-xs shadow-md" title="Zapisz Stan">💾</button>
                    <button onClick={resetReader} className="bg-red-600 text-white w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-md font-bold ml-2">✖</button>
                </div>
            </div>
            
            <div className="flex flex-grow overflow-hidden">
                {/* LEWA STRONA: Oryginalny Podgląd PDF */}
                <div className="hidden lg:block w-3/5 h-full border-r border-gray-200 dark:border-gray-800">
                    <iframe src={readerData.pdfUrl} className="w-full h-full" title="PDF Preview" />
                </div>
                
                {/* PRAWA STRONA: Panel Tekstowy Lektora */}
                <div className="flex-grow h-full overflow-y-auto bg-gray-100 dark:bg-black/50 p-4 md:p-8 scroll-smooth">
                    <div className="max-w-2xl mx-auto">
                        {readerData.paragraphs.map((p, idx) => (
                            <p key={idx} ref={el => readerRefs.current[idx] = el}
                              onClick={() => { setCurrentParagraphIndex(idx); stopRead(); }}
                              className={`mb-6 transition-all duration-500 p-4 rounded-xl leading-relaxed cursor-pointer ${idx === currentParagraphIndex ? 'bg-blue-100/50 dark:bg-blue-900/30 border-l-8 border-blue-500 shadow-lg scale-[1.02]' : 'opacity-30 text-sm'}`}>
                                {p}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
            <input type="file" ref={jsonInputRef} style={{ display: 'none' }} accept="application/json" onChange={handleLoadJson} />
        </div>
    );
  }

  return (
    <div className="w-full no-read">
      <div className="flex items-center justify-between my-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full relative z-50 shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-tighter text-gray-500 dark:text-gray-400">Asystent Głosowy 🎧</span>
          {useFallback && <span className="text-[9px] text-green-500 font-black">AI HOME</span>}
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={toggleRead} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors min-w-[70px]">
            {isLoading ? '⏳' : (isReading && !isPaused ? '⏸ Pauza' : '▶ Czytaj')}
          </button>
          <button onClick={stopRead} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded ml-2">Stop</button>
        </div>
      </div>
    </div>
  );
};

export default SpeechControl;
