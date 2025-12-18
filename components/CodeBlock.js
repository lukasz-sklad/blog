import React, { useState, useRef, useEffect } from 'react';

const CodeBlock = ({ children, className, ...props }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLongContent, setIsLongContent] = useState(false);
  const codeRef = useRef(null);
  const containerRef = useRef(null);

  // Próba wyciągnięcia języka z className dziecka (zazwyczaj elementu <code>)
  const language = children?.props?.className?.replace(/language-/, '') || 'kod';
  
  // Wysokość dla podglądu (ok. 6-7 linii tekstu + padding)
  const PREVIEW_HEIGHT = 160; 

  useEffect(() => {
    // Sprawdź, czy zawartość jest faktycznie wyższa niż nasz podgląd
    if (containerRef.current && containerRef.current.scrollHeight > PREVIEW_HEIGHT) {
      setIsLongContent(true);
    } else {
      setIsLongContent(false);
    }
  }, [children]);

  const handleCopy = async (e) => {
    e.stopPropagation(); 
    if (codeRef.current) {
      const text = codeRef.current.textContent;
      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy!', err);
      }
    }
  };

  const toggleExpand = () => {
      if (isLongContent) {
          setIsExpanded(!isExpanded);
      }
  };

  return (
    <div className="my-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] shadow-lg dark:shadow-2xl not-prose flex flex-col relative">
      
      {/* Pasek nagłówka */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-[#2d2d2d] border-b border-gray-200 dark:border-gray-700 select-none z-10 no-read">
        <div className="flex items-center gap-2">
             <span className="font-mono text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                {language}
            </span>
        </div>

        <button
            onClick={handleCopy}
            className="flex items-center gap-1 p-1 px-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all duration-200 group border border-transparent hover:border-gray-300 dark:hover:border-gray-500"
            title="Kopiuj do schowka"
        >
            {isCopied ? (
                    <>
                    <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Skopiowano!</span>
                    </>
            ) : (
                <>
                    <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Kopiuj</span>
                </>
            )}
        </button>
      </div>

      {/* Kontener kodu */}
      <div 
        className="relative transition-all duration-500 ease-in-out bg-white dark:bg-[#1e1e1e]"
        style={{
            maxHeight: isExpanded ? 'none' : (isLongContent ? `${PREVIEW_HEIGHT}px` : 'none'),
            overflow: 'hidden'
        }}
        ref={containerRef}
      >
         <pre 
            {...props} 
            className={`${className} !m-0 !p-4 !bg-transparent text-sm leading-relaxed font-mono text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words`} 
            ref={codeRef}
         >
            {children}
         </pre>

         {/* Gradient i przycisk "Pokaż więcej" (tylko gdy zwinięte i długie) */}
         {!isExpanded && isLongContent && (
             <div 
                className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white via-[#ffffffd9] dark:from-[#1e1e1e] dark:via-[#1e1e1ee6] to-transparent flex items-end justify-center pb-4 cursor-pointer"
                onClick={toggleExpand}
             >
                 <div className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 dark:bg-blue-900 dark:hover:bg-blue-800 text-white text-[10px] font-semibold uppercase tracking-wide rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-1">
                    Pokaż cały kod
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                 </div>
             </div>
         )}
      </div>
      
      {/* Przycisk "Zwiń" na dole (tylko gdy rozwinięte i długie) */}
      {isExpanded && isLongContent && (
          <div 
            onClick={toggleExpand}
            className="h-6 bg-gray-50 hover:bg-gray-100 dark:bg-[#2d2d2d] dark:hover:bg-[#3d3d3d] cursor-pointer flex justify-center items-center transition-colors border-t border-gray-200 dark:border-gray-700"
            title="Zwiń kod"
          >
             <svg className="w-4 h-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
             </svg>
          </div>
      )}
    </div>
  );
};

export default CodeBlock;
