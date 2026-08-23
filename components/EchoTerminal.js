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
        <a href="https://www.netlify.com/" target="_blank" rel="noopener noreferrer" className={iconClasses} title="Netlify">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.49 19.04h-.23L5.13 17.9v-.23l1.73-1.71h1.2l.15.15v1.2L6.5 19.04ZM5.13 6.31V6.1l1.13-1.13h.23L8.2 6.68v1.2l-.15.15h-1.2L5.13 6.31Zm9.96 9.09h-1.65l-.14-.13v-3.83c0-.68-.27-1.2-1.1-1.23-.42 0-.9 0-1.43.02l-.07.08v4.96l-.14.14H8.9l-.13-.14V8.73l.13-.14h3.7a2.6 2.6 0 0 1 2.61 2.6v4.08l-.13.14Zm-8.37-2.44H.14L0 12.82v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14Zm17.14 0h-6.58l-.14-.14v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14ZM11.05 6.55V1.64l.14-.14h1.65l.14.14v4.9l-.14.14h-1.65l-.14-.13Zm0 15.81v-4.9l.14-.14h1.65l.14.13v4.91l-.14.14h-1.65l-.14-.14Z"/>
          </svg>
        </a>
        <a href="https://github.com/lukasz-sklad" target="_blank" rel="noopener noreferrer" className={iconClasses} title="GitHub">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
          </svg>
        </a>
        <a href="https://floss.social/@lmk" target="_blank" rel="me noopener noreferrer" className={iconClasses} title="Mastodon">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/>
          </svg>
        </a>
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
