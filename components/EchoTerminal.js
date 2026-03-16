import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const RADIO_STATIONS = {
  'antyradio': 'https://an.cdn.eurozet.pl/ant-web.mp3',
  'zawiercie': 'http://51.255.8.139:9078/listen.xtl?sid=1',
  'zet': 'https://zet.cdn.eurozet.pl/zet-waw.mp3',
  'rmf': 'https://rs.rmf.fm/rmffm.mp3',
  'rmfclassic': 'https://rs.rmf.fm/rmfclassic.mp3',
  'tokfm': 'https://pl-play.adtonos.com/tok-fm',
  'eska': 'https://radio.stream.pl/eska_warszawa.mp3',
  'nowyswiat': 'https://stream.rcs.revma.com/ypqt40u0x1zuv',
  '357': 'https://stream.rcs.revma.com/ye5kghkgcm0uv'
};

const EchoTerminal = () => {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([{ text: 'Witaj w blogOS v1.0. Wpisz "help" aby zobaczyć komendy.', type: 'default' }]);
  const outputRef = useRef(null);
  const inputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const [currentStation, setCurrentStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [theme, setTheme] = useState('dark');
  const [isChristmas, setIsChristmas] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; };
        document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    setIsChristmas((now.getMonth() === 11 && now.getDate() >= 6) || (now.getMonth() === 0 && now.getDate() <= 6));
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous";
    return () => { if (audioRef.current) audioRef.current.src = ''; };
  }, []);

  useEffect(() => {
    const detectTheme = () => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    detectTheme();
    const obs = new MutationObserver(detectTheme);
    obs.observe(document.documentElement, { attributes: true });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      else if (isResizing) setSize({ width: Math.max(300, e.clientX - position.x), height: Math.max(200, e.clientY - position.y) });
    };
    const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };
    if (isDragging || isResizing) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, isResizing, dragOffset, position]);

  useEffect(() => {
    const saved = localStorage.getItem('terminal_isOpen');
    if (saved) setIsOpen(JSON.parse(saved));
    fetch('/api/posts').then(res => res.json()).then(setPosts);
  }, []);

  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, [history, isOpen]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Tworzymy lokalny adres URL do podglądu pliku
    const fileUrl = URL.createObjectURL(file);
    
    setHistory(prev => [...prev, { text: `Przetwarzanie: ${file.name}...`, type: 'info' }]);

    if (file.type === 'application/pdf') {
      if (!window.pdfjsLib) {
        setHistory(prev => [...prev, { text: "Błąd: Biblioteka PDF nie została jeszcze załadowana.", type: 'error' }]);
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const typedArray = new Uint8Array(event.target.result);
          const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + "\n\n";
          }
          const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 10);
          
          window.dispatchEvent(new CustomEvent('tts-reader-start', { detail: { title: file.name, paragraphs, pdfUrl: fileUrl } }));
          setHistory(prev => [...prev, { text: `Sukces! Wczytano ${pdf.numPages} stron. Lektor gotowy z podglądem.`, type: 'success' }]);
        } catch (err) { setHistory(prev => [...prev, { text: `Błąd PDF: ${err.message}`, type: 'error' }]); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Obsługa plików TXT i MD
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target.result;
          const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 2);
          
          window.dispatchEvent(new CustomEvent('tts-reader-start', { detail: { title: file.name, paragraphs, pdfUrl: fileUrl } }));
          setHistory(prev => [...prev, { text: `Sukces! Wczytano plik tekstowy. Lektor gotowy.`, type: 'success' }]);
        } catch (err) { setHistory(prev => [...prev, { text: `Błąd pliku: ${err.message}`, type: 'error' }]); }
      };
      reader.readAsText(file);
    }
  };

  const handleCommand = () => {
    const cmd = input.trim();
    if (!cmd) return;
    const h = [...history, { text: `> ${cmd}`, type: 'command' }];
    const parts = cmd.toLowerCase().split(' ');

    const monthMap = {
      'styczeń': '01', 'stycznia': '01',
      'luty': '02', 'lutego': '02',
      'marzec': '03', 'marca': '03',
      'kwiecień': '04', 'kwietnia': '04',
      'maj': '05', 'maja': '05',
      'czerwiec': '06', 'czerwca': '06',
      'lipiec': '07', 'lipca': '07',
      'sierpień': '08', 'sierpnia': '08',
      'wrzesień': '09', 'września': '09',
      'październik': '10', 'października': '10',
      'listopad': '11', 'listopada': '11',
      'grudzień': '12', 'grudnia': '12'
    };

    switch (parts[0]) {
      case 'help':
        h.push({ text: `Dostępne komendy:
  ls          - Lista artykułów
  search <txt>- Szukaj (tytuł, data, miesiąc)
  open <slug> - Otwórz artykuł
  czytaj      - Tryb Lektora (PDF, TXT, MD)
  radio       - Radio (wpisz "radio help")
  date        - Pokazuje datę
  clear       - Czyść ekran
  exit        - Minimalizuj`, type: 'response' });
        break;
      case 'clear': setHistory([{ text: '[💀] SYSTEM READY. Knowledge is power. Type "help".', type: 'default' }]); setInput(''); return;
      case 'exit': setIsOpen(false); break;
      case 'czytaj': pdfInputRef.current.click(); break;
      case 'radio':
        if (parts[1] === 'list') Object.keys(RADIO_STATIONS).forEach(s => h.push({ text: ` - ${s}`, type: 'response' }));
        else if (parts[1] === 'stop') { setIsPlaying(false); audioRef.current.pause(); }
        else if (parts[1] === 'help') h.push({ text: 'radio list, radio stop, radio <nazwa>', type: 'info' });
        else if (RADIO_STATIONS[parts[1]]) {
            const st = parts[1]; setCurrentStation(st); setIsPlaying(true);
            audioRef.current.src = RADIO_STATIONS[st]; audioRef.current.play();
        }
        break;
      case 'open':
        const slug = parts[1];
        if (!slug) {
          h.push({ text: 'Użycie: open <slug>', type: 'info' });
        } else {
          const post = posts.find(p => p.slug === slug || (p.title && p.title.toLowerCase().includes(slug.toLowerCase())));
          if (post) {
            h.push({ text: `Otwieranie: ${post.title}...`, type: 'success' });
            setTimeout(() => {
              setIsOpen(false);
              router.push(`/posts/${post.slug}`);
            }, 500);
          } else {
            h.push({ text: `Nie znaleziono artykułu o identyfikatorze "${slug}".`, type: 'error' });
          }
        }
        break;
      case 'search':
        const query = parts.slice(1).join(' ').trim();
        if (!query) {
          h.push({ text: 'Użycie: search <fraza>', type: 'info' });
        } else {
          const lowerQuery = query.toLowerCase();
          const monthNum = monthMap[lowerQuery];
          
          const results = posts.filter(p => {
            const inTitle = p.title && p.title.toLowerCase().includes(lowerQuery);
            const inDate = p.date && (p.date.toLowerCase().includes(lowerQuery) || (monthNum && p.date.includes(`-${monthNum}-`)));
            return inTitle || inDate;
          });

          if (results.length > 0) {
            h.push({ text: `Znaleziono ${results.length} artykułów dla "${query}":`, type: 'info' });
            results.forEach(p => h.push({ text: ` - ${p.title}`, type: 'link', slug: p.slug }));
          } else {
            h.push({ text: `Brak wyników dla "${query}".`, type: 'error' });
          }
        }
        break;
      case 'ls': posts.forEach(p => h.push({ text: `[${p.date}] ${p.title}`, type: 'response' })); break;
      case 'date': h.push({ text: new Date().toLocaleString(), type: 'success' }); break;
      default: h.push({ text: 'Nieznana komenda', type: 'error' });
    }
    setHistory(h); setInput('');
  };

  const iconClasses = `w-12 h-12 flex items-center justify-center rounded-full cursor-pointer border shadow-lg transition-transform hover:scale-110 ${theme === 'dark' ? 'bg-black text-green-500 border-green-500' : 'bg-white text-blue-600 border-blue-600'}`;

  if (!isOpen) {
    return (
      <div className={`fixed ${isChristmas ? 'top-5' : 'bottom-5'} right-5 z-[9999] flex flex-col gap-3 items-center`}>
        <a href="https://buycoffee.to/lmk.one" target="_blank" rel="noopener noreferrer" className={iconClasses} title="Kup kawę">☕</a>
        <div onClick={() => setIsOpen(true)} className={iconClasses + " font-bold"}>&gt;_</div>
      </div>
    );
  }

  return (
    <div className={`fixed flex flex-col overflow-hidden z-[9999] backdrop-blur-md rounded-lg shadow-2xl border ${theme === 'dark' ? 'bg-black bg-opacity-90 text-gray-200 border-gray-700' : 'bg-white bg-opacity-90 text-gray-800 border-gray-300'}`} 
         style={{ left: position.x, top: position.y, width: size.width, height: size.height }} 
         onMouseDown={e => {
            if (e.target.closest('.terminal-header')) { setIsDragging(true); setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y }); }
            else if (e.target.closest('.resize-handle')) setIsResizing(true);
         }}>
      <div className={`terminal-header p-2 flex justify-between items-center cursor-move border-b ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
        <div className="flex space-x-2"><div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer" onClick={() => setIsOpen(false)}></div><div className="w-3 h-3 rounded-full bg-yellow-500"></div><div className="w-3 h-3 rounded-full bg-green-500"></div></div>
        <div className="text-xs flex items-center gap-2">
          blogOS --bash {currentStation && `[♫ ${currentStation}]`}
          {isPlaying && (
            <div className="flex items-end gap-0.5 h-4 mb-0.5">
              <div className="radio-bar w-1 bg-green-500 rounded-t-sm"></div>
              <div className="radio-bar w-1 bg-green-500 rounded-t-sm"></div>
              <div className="radio-bar w-1 bg-green-500 rounded-t-sm"></div>
              <div className="radio-bar w-1 bg-green-500 rounded-t-sm"></div>
            </div>
          )}
        </div>
        <div />
      </div>
      <div ref={outputRef} className="flex-grow p-4 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
        {history.map((l, i) => {
          if (l.type === 'link') {
            return (
              <div key={i} className="mb-1 text-blue-400">
                <span className="text-gray-200"> - </span>
                <span 
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/posts/${l.slug}`);
                  }}
                  className="cursor-pointer hover:underline hover:text-blue-300"
                >
                  {l.text.replace(' - ', '')}
                </span>
              </div>
            );
          }
          return (
            <div key={i} className={`mb-1 ${l.type === 'error' ? 'text-red-500' : l.type === 'success' ? 'text-green-500' : l.type === 'info' ? 'text-blue-400' : ''}`}>
              {l.text}
            </div>
          );
        })}
      </div>
      <div className={`p-2 flex items-center border-t ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <span className="text-green-500 mr-2 font-bold">➜</span>
        <input ref={inputRef} autoFocus type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCommand()} className="flex-grow bg-transparent outline-none" />
        <input type="file" ref={pdfInputRef} style={{ display: 'none' }} accept="application/pdf,text/plain,text/markdown,.md,.txt" onChange={handleFileUpload} />
      </div>
      <div className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" style={{ background: 'linear-gradient(135deg, transparent 50%, #888 50%)' }}></div>
    </div>
  );
};

export default EchoTerminal;
