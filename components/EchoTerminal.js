import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const EchoTerminal = () => {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  
  // Stan okna
  const [isOpen, setIsOpen] = useState(false); // Domyślnie zminimalizowany
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

  // Stan motywu
  const [theme, setTheme] = useState('dark'); // Domyślny motyw

  // Ładowanie stanu z localStorage przy starcie
  useEffect(() => {
    try {
      const savedIsOpen = localStorage.getItem('terminal_isOpen');
      const savedPosition = localStorage.getItem('terminal_position');
      const savedSize = localStorage.getItem('terminal_size');
      const savedHistory = localStorage.getItem('terminal_history');

      if (savedIsOpen !== null) setIsOpen(JSON.parse(savedIsOpen));
      if (savedPosition !== null) setPosition(JSON.parse(savedPosition));
      if (savedSize !== null) setSize(JSON.parse(savedSize));
      if (savedHistory !== null) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error("Błąd odczytu stanu terminala z localStorage", e);
    }
  }, []);

  // Zapisywanie stanu do localStorage przy zmianach
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
    localStorage.setItem('terminal_history', JSON.stringify(history));
  }, [history]);

  // Pobieranie postów
  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => setPosts(data))
      .catch(err => console.error('Błąd ładowania postów:', err));
  }, []);

  // Scrollowanie do dołu przy nowej wiadomości
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history, isOpen]);

  // Detekcja i nasłuchiwanie zmian motywu
  useEffect(() => {
    const detectTheme = () => {
      if (typeof window !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark');
        setTheme(isDark ? 'dark' : 'light');
      }
    };

    detectTheme(); // Ustaw początkowy motyw

    // Obserwuj zmiany klasy na elemencie <html>
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          detectTheme();
        }
      });
    });

    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true });
    }

    return () => {
      observer.disconnect();
    };
  }, []); // Pusta tablica zależności, aby uruchomić tylko raz

  // Obsługa komend
  const handleCommand = () => {
    const cmd = input.trim();
    if (!cmd) return;

    const newHistory = [...history, { text: `> ${cmd}`, type: 'command' }];
    const parts = cmd.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (command) {
      case 'help':
        newHistory.push({ 
          text: `Dostępne komendy:
  ls          - Pokaż listę wszystkich artykułów
  search <txt>- Szukaj artykułów (tytuł/opis)
  open <slug> - Otwórz artykuł (wpisz slug z listy)
  date        - Pokaż aktualną datę i godzinę
  clear       - Wyczyść ekran
  exit        - Minimalizuj terminal`, 
          type: 'response' 
        });
        break;

      case 'date':
        const now = new Date();
        const dateOptions = { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        };
        // Format: "czwartek, 26 listopada 2025, 14:30" -> replace last comma with "godz."
        let dateStr = now.toLocaleDateString('pl-PL', dateOptions);
        // Simple heuristic to insert "godz." before time if locale string matches expectations
        // Note: toLocaleDateString format varies, but usually ends with time.
        // Let's manually construct slightly to be safe or just append time.
        const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const datePart = now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        newHistory.push({ text: `${datePart} godz. ${time}`, type: 'info' });
        break;

      case 'ls':
      case 'list':
        if (posts.length === 0) {
          newHistory.push({ text: 'Brak artykułów lub trwa ładowanie...', type: 'error' });
        } else {
          newHistory.push({ text: 'Lista artykułów:', type: 'info' });
          posts.forEach(p => {
            const displaySlug = p.customSlug || p.slug;
            newHistory.push({ 
              text: `[${p.date}] ${p.title} (slug: ${displaySlug})`, 
              type: 'response',
              slug: p.slug 
            });
          });
        }
        break;

      case 'search':
        if (!args) {
          newHistory.push({ text: 'Podaj frazę do wyszukania, np. "search python"', type: 'error' });
        } else {
          const results = posts.filter(p => 
            p.title.toLowerCase().includes(args.toLowerCase()) || 
            p.description.toLowerCase().includes(args.toLowerCase()) ||
            p.slug.toLowerCase().includes(args.toLowerCase()) ||
            (p.customSlug && p.customSlug.toLowerCase().includes(args.toLowerCase()))
          );
          if (results.length === 0) {
            newHistory.push({ text: `Nie znaleziono artykułów dla frazy: "${args}"`, type: 'warning' });
          } else {
            newHistory.push({ text: `Znaleziono ${results.length} pasujących artykułów:`, type: 'info' });
            results.forEach(p => {
              const displaySlug = p.customSlug || p.slug;
              newHistory.push({ 
                text: `[${p.date}] ${p.title} (slug: ${displaySlug})`, 
                type: 'response',
                slug: p.slug
              });
            });
          }
        }
        break;

      case 'open':
        if (!args) {
          newHistory.push({ text: 'Podaj slug artykułu, np. "open python-intro"', type: 'error' });
        } else {
          // Remove extension if user typed it
          const cleanSlug = args.replace(/\.mdx?$/, '');
          
          // Szukamy czy taki slug istnieje (opcjonalne, ale dobre dla UX)
          // Sprawdzamy zarówno nazwę pliku (p.slug) jak i customSlug z frontmattera
          const target = posts.find(p => p.slug === cleanSlug || (p.customSlug && p.customSlug === cleanSlug));
          
          if (target) {
             newHistory.push({ 
               text: `Otwieranie: ${target.title}... (kliknij, jeśli nie nastąpi przekierowanie)`, 
               type: 'success',
               slug: target.slug // Używamy technicznego sluga do linku
             });
             router.push(`/posts/${target.slug}`);
          } else {
             // NIE wykonujemy automatycznego przekierowania, jeśli nie znaleziono dokładnego sluga.
             // Dajemy użytkownikowi klikalny link do spróbowania.
             newHistory.push({ 
               text: `Nie znaleziono dokładnego sluga "${cleanSlug}". Kliknij, aby spróbować otworzyć ten adres.`, 
               type: 'warning',
               slug: cleanSlug // Udostępniamy slug jako link, ale nie przekierowujemy automatycznie
             });
             // router.push(`/posts/${cleanSlug}`); // Usunięto automatyczne przekierowanie
          }
        }
        break;

      case 'clear':
        setHistory([]);
        setInput('');
        return; // Nie dodajemy reszty

      case 'exit':
        setIsOpen(false);
        break;

      default:
        newHistory.push({ text: `Nieznana komenda: "${command}". Wpisz "help".`, type: 'error' });
    }

    setHistory(newHistory);
    setInput('');
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

  // Klasy zależne od motywu
  const terminalClasses = theme === 'dark' 
    ? "fixed bg-black bg-opacity-90 text-gray-200 font-mono text-sm rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden z-50 backdrop-blur-md"
    : "fixed bg-white bg-opacity-90 text-gray-800 font-mono text-sm rounded-lg shadow-2xl border border-gray-300 flex flex-col overflow-hidden z-50 backdrop-blur-md";

  const headerClasses = theme === 'dark'
    ? "terminal-header bg-gray-900 p-2 flex justify-between items-center cursor-move select-none border-b border-gray-700"
    : "terminal-header bg-gray-100 p-2 flex justify-between items-center cursor-move select-none border-b border-gray-300";

  const inputContainerClasses = theme === 'dark'
    ? "p-2 flex items-center bg-black bg-opacity-50 border-t border-gray-800"
    : "p-2 flex items-center bg-gray-50 bg-opacity-50 border-t border-gray-200";

  const inputTextClasses = theme === 'dark'
    ? "flex-grow bg-transparent border-none outline-none text-white font-mono"
    : "flex-grow bg-transparent border-none outline-none text-gray-800 font-mono";
  
  const minimizeIconClasses = theme === 'dark'
    ? "fixed bottom-5 right-5 bg-black text-green-500 p-3 rounded-full cursor-pointer border border-green-500 shadow-lg hover:scale-110 transition-transform z-50 font-mono"
    : "fixed bottom-5 right-5 bg-white text-blue-600 p-3 rounded-full cursor-pointer border border-blue-600 shadow-lg hover:scale-110 transition-transform z-50 font-mono";


  if (!isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        className={minimizeIconClasses}
        title="Otwórz terminal"
      >
        &gt;_
      </div>
    );
  }

  return (
    <div 
      className={terminalClasses}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className={headerClasses}>
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer hover:bg-red-600" onClick={() => setIsOpen(false)}></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>blogOS --bash</div>
        <div></div>
      </div>

      {/* Output */}
      <div 
        ref={outputRef}
        className="flex-grow p-4 overflow-y-auto whitespace-pre-wrap scrollbar-thin scrollbar-thumb-gray-700" // scrollbar-thumb-gray-700 could change for light theme
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, i) => (
          <div key={i} className={`mb-1 ${
            line.type === 'command' ? (theme === 'dark' ? 'text-white font-bold' : 'text-gray-900 font-bold') :
            line.type === 'error' ? 'text-red-500' : 
            line.type === 'warning' ? 'text-yellow-600' : 
            line.type === 'success' ? 'text-green-500' : 
            line.type === 'info' ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-700') : 
            (theme === 'dark' ? 'text-gray-300' : 'text-gray-700')
          }`}>
            {line.slug ? (
              <span 
                onClick={() => router.push(`/posts/${line.slug}`)}
                className="cursor-pointer underline hover:no-underline hover:text-blue-400 transition-colors"
                title={`Otwórz artykuł: ${line.text}`}
              >
                {line.text}
              </span>
            ) : (
              line.text
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className={inputContainerClasses}>
        <span className={theme === 'dark' ? 'text-green-500 mr-2 font-bold' : 'text-green-700 mr-2 font-bold'}>➜</span>
        <span className={theme === 'dark' ? 'text-blue-500 mr-2 font-bold' : 'text-blue-700 mr-2 font-bold'}>~</span>
        <input 
          ref={inputRef}
          autoFocus
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommand();
          }}
          className={inputTextClasses}
          placeholder="wpisz komendę..."
        />
      </div>

      {/* Resize Handle */}
      <div 
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
        style={{
          background: theme === 'dark' ? 'linear-gradient(135deg, transparent 50%, #555 50%)' : 'linear-gradient(135deg, transparent 50%, #bbb 50%)'
        }}
      ></div>
    </div>
  );
};

export default EchoTerminal;