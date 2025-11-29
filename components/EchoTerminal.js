import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

// Lista stacji radiowych
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
  
  // Stan okna
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Stan terminala
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    { text: 'Witaj w blogOS v1.0. Wpisz "help" aby zobaczyć komendy.', type: 'info' }
  ]);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  // Stan radia i audio
  const [currentStation, setCurrentStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  // Ref do bezpośredniej manipulacji ostatnią linią w DOM (dla wydajności wizualizacji)
  const visualizerLineRef = useRef(null);

  // Stan motywu
  const [theme, setTheme] = useState('dark');

  // Inicjalizacja Audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous"; // Ważne dla CORS i Web Audio API

    // Obsługa błędów odtwarzania
    audioRef.current.onerror = () => {
        setHistory(prev => [...prev, { text: `Błąd odtwarzania stacji. Sprawdź połączenie lub stream.`, type: 'error' }]);
        setIsPlaying(false);
        setCurrentStation(null);
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Ładowanie stanu z localStorage
  useEffect(() => {
    try {
      const savedIsOpen = localStorage.getItem('terminal_isOpen');
      const savedPosition = localStorage.getItem('terminal_position');
      const savedSize = localStorage.getItem('terminal_size');
      const savedHistory = localStorage.getItem('terminal_history');

      if (savedIsOpen !== null) setIsOpen(JSON.parse(savedIsOpen));
      if (savedPosition !== null) setPosition(JSON.parse(savedPosition));
      if (savedSize !== null) setSize(JSON.parse(savedSize));
      if (savedHistory !== null) {
           // Filtrujemy historię, żeby usunąć stare linie wizualizacji przy odświeżeniu
           const parsedHistory = JSON.parse(savedHistory);
           setHistory(parsedHistory.filter(line => line.type !== 'visualizer'));
      }
    } catch (e) {
      console.error("Błąd odczytu stanu terminala z localStorage", e);
    }
  }, []);

  // Zapisywanie stanu
  useEffect(() => {
    localStorage.setItem('terminal_isOpen', JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('terminal_position', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem('terminal_size', JSON.stringify(size));
  }, [size]);

  useEffect(() => {
    // Nie zapisujemy linii wizualizera do historii
    const cleanHistory = history.filter(item => item.type !== 'visualizer');
    localStorage.setItem('terminal_history', JSON.stringify(cleanHistory));
  }, [history]);

  // Pobieranie postów
  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => setPosts(data))
      .catch(err => console.error('Błąd ładowania postów:', err));
  }, []);

  // Scrollowanie
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history, isOpen]);

  // Motyw
  useEffect(() => {
    const detectTheme = () => {
      if (typeof window !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark');
        setTheme(isDark ? 'dark' : 'light');
      }
    };
    detectTheme();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') detectTheme();
      });
    });
    if (typeof window !== 'undefined') observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);


  // --- Logika Audio Wizualizacji ---

  const startVisualizer = () => {
      if (!audioContextRef.current) {
          // Inicjalizacja Contextu (musi być po interakcji użytkownika)
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 32; // Mała rozdzielczość wystarczy dla ASCII
          
          // Podłączenie źródła
          // Uwaga: createMediaElementSource może rzucić błąd CORS jeśli serwer nie wspiera
          try {
              sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
              sourceRef.current.connect(analyserRef.current);
              analyserRef.current.connect(audioContextRef.current.destination);
          } catch (err) {
              console.warn("Wizualizacja może nie działać przez CORS:", err);
              // Fallback: połącz audio normalnie do wyjścia, bez analizatora, żeby chociaż grało
              // (W praktyce element Audio gra sam z siebie, jeśli nie jest podpięty do Web Audio graphu, 
              // ale jak już weźmiemy go w 'createMediaElementSource', to musimy go podpiąć do destination)
          }
      }

      // Jeśli context był zawieszony (autoplay policy), wznów go
      if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
          if (!isPlaying) return; // Stop jeśli nie gramy
          
          animationRef.current = requestAnimationFrame(draw);
          analyserRef.current.getByteFrequencyData(dataArray);

          // Generowanie paska ASCII
          let bar = '';
          // Używamy tylko kilku pierwszych binów dla basów/środka
          const barsToRender = 15; 
          for (let i = 0; i < barsToRender; i++) {
              const value = dataArray[i];
              // Mapowanie głośności na znaki
              if (value > 200) bar += '█';
              else if (value > 150) bar += '▓';
              else if (value > 100) bar += '▒';
              else if (value > 50) bar += '░';
              else bar += '_';
          }

          // Aktualizacja tekstu bezpośrednio w DOM dla wydajności
          if (visualizerLineRef.current) {
              visualizerLineRef.current.innerText = `[RADIO] ${currentStation} Playing... [${bar}]`;
          }
      };

      draw();
  };

  const stopRadio = () => {
      if (audioRef.current) {
          audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentStation(null);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      
      // Usuń linię wizualizera z historii
      setHistory(prev => prev.filter(item => item.type !== 'visualizer'));
  };

  const playRadio = (stationName) => {
      const url = RADIO_STATIONS[stationName];
      if (!url) {
          setHistory(prev => [...prev, { text: `Nieznana stacja: "${stationName}". Wpisz "radio list".`, type: 'error' }]);
          return;
      }

      // Stop previous
      stopRadio();

      setCurrentStation(stationName);
      setIsPlaying(true); // Zakładamy, że zaraz zacznie grać

      // Dodaj placeholder na wizualizację
      setHistory(prev => [...prev, { text: `Łączenie z ${stationName}...`, type: 'info' }, { text: '', type: 'visualizer' }]);

      audioRef.current.src = url;
      audioRef.current.play()
        .then(() => {
            startVisualizer();
        })
        .catch(err => {
            console.error("Błąd odtwarzania:", err);
            setHistory(prev => [...prev, { text: `Błąd: ${err.message}`, type: 'error' }]);
            setIsPlaying(false);
        });
  };


  // --- Command Handler ---

  const handleCommand = () => {
    const cmd = input.trim();
    if (!cmd) return;

    const newHistory = [...history.filter(item => item.type !== 'visualizer'), { text: `> ${cmd}`, type: 'command' }];
    const parts = cmd.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (command) {
      case 'help':
        newHistory.push({ 
          text: `Dostępne komendy:
  ls          - Pokaż listę artykułów
  search <txt>- Szukaj
  open <slug> - Otwórz artykuł
  radio       - Obsługa radia (wpisz "radio help")
  date        - Data/czas
  clear       - Czyść ekran
  exit        - Minimalizuj`, 
          type: 'response' 
        });
        break;

      case 'radio':
          const subCmd = parts[1] ? parts[1].toLowerCase() : '';
          const stationArg = parts[2] ? parts[2].toLowerCase() : ''; // dla 'radio play antyradio'

          if (subCmd === 'list') {
              newHistory.push({ text: 'Dostępne stacje:', type: 'info' });
              Object.keys(RADIO_STATIONS).forEach(s => {
                  newHistory.push({ text: ` - ${s}`, type: 'response' });
              });
          } else if (subCmd === 'stop') {
              stopRadio();
              newHistory.push({ text: 'Radio zatrzymane.', type: 'info' });
          } else if (subCmd === 'play' || (subCmd && RADIO_STATIONS[subCmd])) {
              // Obsługa 'radio play antyradio' ORAZ 'radio antyradio'
              const targetStation = subCmd === 'play' ? stationArg : subCmd;
              if (!targetStation) {
                   newHistory.push({ text: 'Podaj nazwę stacji, np. "radio play antyradio"', type: 'warning' });
              } else {
                   // Odpalamy playRadio asynchronicznie po renderze, żeby placeholder wizualizera istniał
                   // Ale w React state update jest batched.
                   // Najpierw aktualizujemy historię, potem odpalamy radio.
                   // Hack: playRadio wywołamy w useEffect lub bezpośrednio, ale playRadio też modyfikuje historię.
                   // Uprośćmy: playRadio samo doda swoje wpisy.
                   // Więc tutaj tylko ustawiamy historię BEZ wywołania playRadio, a playRadio wywołamy na końcu funkcji?
                   // Nie, funkcja handleCommand jest sync.
                   // Zrobimy tak: playRadio zostanie wywołane po setHistory
              }
          } else {
              newHistory.push({ text: 'Użycie: radio [list | stop | <nazwa_stacji>]', type: 'info' });
          }
          break;

      case 'date':
        const now = new Date();
        newHistory.push({ text: now.toLocaleString('pl-PL'), type: 'info' });
        break;

      case 'ls':
      case 'list':
        if (posts.length === 0) {
            newHistory.push({ text: 'Brak artykułów.', type: 'error' });
        } else {
            posts.forEach(p => {
                newHistory.push({ text: `[${p.date}] ${p.title}`, type: 'response', slug: p.slug });
            });
        }
        break;
      
      case 'open':
          if (!args) newHistory.push({ text: 'Podaj slug.', type: 'error' });
          else {
             const target = posts.find(p => p.slug === args || p.customSlug === args);
             if (target) {
                 newHistory.push({ text: `Otwieranie...`, type: 'success' });
                 router.push(`/posts/${target.slug}`);
             } else {
                 newHistory.push({ text: 'Nie znaleziono.', type: 'warning' });
             }
          }
          break;

      case 'clear':
        const initialClearMessage = isPlaying 
            ? { text: 'System buffer cleared.', type: 'info' }
            : { text: '[💀] SYSTEM READY. Knowledge is power. Type "help".', type: 'success' };
        
        setHistory([initialClearMessage]);
        setInput('');
        
        // Jeśli radio gra, dodaj z powrotem wizualizer
        if (isPlaying) {
            setTimeout(() => {
                setHistory(prev => [...prev, { text: '', type: 'visualizer' }]);
                // restart visualizer loop
                if (!animationRef.current) startVisualizer();
            }, 0);
        }
        return;

      case 'exit':
        setIsOpen(false);
        break;

      default:
        newHistory.push({ text: `Nieznana komenda: ${command}`, type: 'error' });
    }

    setHistory(newHistory);
    setInput('');

    // Obsługa radia "po" aktualizacji historii komendą
    if (command === 'radio') {
        const subCmd = parts[1] ? parts[1].toLowerCase() : '';
        const stationArg = parts[2] ? parts[2].toLowerCase() : '';
        const targetStation = subCmd === 'play' ? stationArg : (RADIO_STATIONS[subCmd] ? subCmd : null);
        
        if (targetStation) {
            // setTimeout żeby stan historii z "radio antyradio" się zapisał, a potem playRadio dodało swoje
            setTimeout(() => playRadio(targetStation), 10);
        }
    }
  };

  // --- Logika Przeciągania i Skalowania ---

  const handleMouseDown = (e) => {
    if (e.target.closest('.terminal-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    } else if (e.target.closest('.resize-handle')) {
      setIsResizing(true);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      setSize({
        width: Math.max(300, e.clientX - position.x),
        height: Math.max(200, e.clientY - position.y)
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);


  // --- Render ---

  const terminalClasses = theme === 'dark' 
    ? "fixed bg-black bg-opacity-90 text-gray-200 font-mono text-sm rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden z-50 backdrop-blur-md"
    : "fixed bg-white bg-opacity-90 text-gray-800 font-mono text-sm rounded-lg shadow-2xl border border-gray-300 flex flex-col overflow-hidden z-50 backdrop-blur-md";

  const headerClasses = theme === 'dark'
    ? "terminal-header bg-gray-900 p-2 flex justify-between items-center cursor-move select-none border-b border-gray-700"
    : "terminal-header bg-gray-100 p-2 flex justify-between items-center cursor-move select-none border-b border-gray-300";

  const minimizeIconClasses = theme === 'dark'
    ? "fixed bottom-5 right-5 bg-black text-green-500 p-3 rounded-full cursor-pointer border border-green-500 shadow-lg hover:scale-110 transition-transform z-50 font-mono"
    : "fixed bottom-5 right-5 bg-white text-blue-600 p-3 rounded-full cursor-pointer border border-blue-600 shadow-lg hover:scale-110 transition-transform z-50 font-mono";


  if (!isOpen) {
    return (
      <div onClick={() => setIsOpen(true)} className={minimizeIconClasses}>&gt;_</div>
    );
  }

  return (
    <div 
      className={terminalClasses}
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
      onMouseDown={handleMouseDown}
    >
      <div className={headerClasses}>
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer hover:bg-red-600" onClick={() => setIsOpen(false)}></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-xs text-gray-500">blogOS --bash {currentStation ? `[♫ ${currentStation}]` : ''}</div>
        <div></div>
      </div>

      <div 
        ref={outputRef}
        className="flex-grow p-4 overflow-y-auto whitespace-pre-wrap scrollbar-thin scrollbar-thumb-gray-700"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, i) => (
          <div key={i} className={`mb-1 ${
            line.type === 'command' ? 'font-bold ' + (theme === 'dark' ? 'text-white' : 'text-gray-900') :
            line.type === 'error' ? 'text-red-500' : 
            line.type === 'visualizer' ? 'text-green-400 font-bold animate-pulse' :
            (theme === 'dark' ? 'text-gray-300' : 'text-gray-700')
          }`}>
             {line.type === 'visualizer' ? (
                 <span ref={visualizerLineRef}>Processing audio stream...</span>
             ) : (
                 line.slug ? (
                  <span onClick={() => router.push(`/posts/${line.slug}`)} className="cursor-pointer underline hover:text-blue-400">{line.text}</span>
                 ) : line.text
             )}
          </div>
        ))}
      </div>

      <div className={`p-2 flex items-center border-t ${theme === 'dark' ? 'bg-black bg-opacity-50 border-gray-800' : 'bg-gray-50 bg-opacity-50 border-gray-200'}`}>
        <span className="text-green-500 mr-2 font-bold">➜</span>
        <input 
          ref={inputRef}
          autoFocus
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCommand(); }}
          className={`flex-grow bg-transparent border-none outline-none font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}
          placeholder="wpisz komendę..."
        />
      </div>
      
      <div className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10" style={{ background: 'linear-gradient(135deg, transparent 50%, #888 50%)' }}></div>
    </div>
  );
};

export default EchoTerminal;
