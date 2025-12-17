import React, { useState, useEffect } from 'react';

const ChristmasMood = () => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const checkDate = () => {
      const now = new Date();
      const month = now.getMonth(); // 0 = Styczeń, 11 = Grudzień
      const day = now.getDate();

      // Logika: Aktywny od 17 Grudnia (11) do 31 Grudnia ORAZ od 1 Stycznia (0) do 6 Stycznia
      const isDecemberRange = month === 11 && day >= 17;
      const isJanuaryRange = month === 0 && day <= 6;

      if (isDecemberRange || isJanuaryRange) {
        setIsActive(true);
      }
    };

    checkDate();
  }, []);

  if (!isActive) return null;

  // Generowanie płatków śniegu
  const snowflakes = Array.from({ length: 50 }).map((_, i) => {
    const style = {
      left: `${Math.random() * 100}vw`,
      animationDuration: `${Math.random() * 5 + 5}s`, // 5-10s spadania
      animationDelay: `${Math.random() * 5}s`,
      fontSize: `${Math.random() * 10 + 10}px`,
      opacity: Math.random() * 0.7 + 0.3,
    };
    return (
      <div key={i} className="snowflake" style={style}>
        ❄
      </div>
    );
  });

  return (
    <>
      {/* Kontener śniegu - nie blokuje klikania */}
      <div className="snow-container">{snowflakes}</div>

      {/* Dekoracja w rogu */}
      <div className="christmas-corner">
        <span className="tree">🎄</span>
        <span className="santa">🎅</span>
        <div className="ho-ho-ho">Ho! Ho! Ho!</div>
      </div>

      <style jsx>{`
        .snow-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none; /* Kluczowe: przepuszcza kliknięcia */
          z-index: 9998;
          overflow: hidden;
        }

        .snowflake {
          position: absolute;
          top: -20px;
          color: white;
          text-shadow: 0 0 5px rgba(0,0,0,0.2);
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        @keyframes fall {
          0% { transform: translateY(-20px) translateX(0px) rotate(0deg); }
          25% { transform: translateY(25vh) translateX(15px) rotate(45deg); }
          50% { transform: translateY(50vh) translateX(-15px) rotate(90deg); }
          75% { transform: translateY(75vh) translateX(15px) rotate(135deg); }
          100% { transform: translateY(110vh) translateX(0px) rotate(180deg); }
        }

        .christmas-corner {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          font-size: 40px;
          cursor: default;
          animation: float 3s ease-in-out infinite;
          filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
          display: flex;
          align-items: flex-end;
        }

        .tree {
          margin-right: -10px;
          z-index: 1;
        }
        
        .santa {
          animation: wave 2s infinite;
          transform-origin: 70% 70%;
          display: inline-block;
          z-index: 2;
        }

        .ho-ho-ho {
          position: absolute;
          top: -30px;
          right: 0;
          font-size: 14px;
          background: white;
          color: #d32f2f;
          padding: 2px 8px;
          border-radius: 10px;
          opacity: 0;
          font-weight: bold;
          animation: speech 5s infinite;
          white-space: nowrap;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }

        @keyframes speech {
          0%, 80% { opacity: 0; transform: translateY(10px); }
          85%, 95% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }

        /* Tryb ciemny - śnieg bardziej widoczny, tryb jasny - trochę mniej */
        :global(.dark) .snowflake { color: #fff; opacity: 0.8; }
        :global(body:not(.dark)) .snowflake { color: #a1d6e2; opacity: 0.9; }

        @media (max-width: 600px) {
           .christmas-corner {
              font-size: 30px;
              bottom: 10px;
              right: 10px;
           }
        }
      `}</style>
    </>
  );
};

export default ChristmasMood;
