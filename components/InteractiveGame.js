import React, { useState, useEffect, useRef } from 'react';

const InteractiveGame = () => {
    const [output, setOutput] = useState([]);
    const [input, setInput] = useState('');
    const [secretNumber, setSecretNumber] = useState(0);
    const [gameActive, setGameActive] = useState(false);
    const outputRef = useRef(null);

    const printToTerminal = (message, color = '#d4d4d4') => {
        setOutput(prev => [...prev, { text: message, color }]);
    };

    const startGame = React.useCallback(() => {
        const newSecret = Math.floor(Math.random() * 100) + 1;
        setSecretNumber(newSecret);
        setGameActive(true);
        setOutput([]);
        setInput('');
        setTimeout(() => {
            printToTerminal('--- Witaj w grze \'Zgadnij Liczbę\'! ---');
            printToTerminal('Pomyślałem sobie liczbę od 1 do 100. Spróbuj ją odgadnąć.');
        }, 0);
    }, []); // Empty dependency array for useCallback

    const handleGuess = () => {
        if (!gameActive) {
            startGame();
            return;
        }
        if (!input) return;

        printToTerminal(`> ${input}`, '#569cd6');
        const guessInt = parseInt(input, 10);

        if (isNaN(guessInt)) {
            printToTerminal('To nie jest liczba! Spróbuj ponownie.', '#ce9178');
        } else if (guessInt < secretNumber) {
            printToTerminal('Za mało! Spróbuj wyżej. 🔼', '#b5cea8');
        } else if (guessInt > secretNumber) {
            printToTerminal('Za dużo! Spróbuj niżej. 🔽', '#b5cea8');
        } else {
            printToTerminal(`\nBrawo! Wygrałeś! Sekretna liczba to rzeczywiście ${secretNumber}. 🏆`, '#4ec9b0');
            printToTerminal('--- Dziękuję za grę! ---');
            setGameActive(false);
        }
        setInput('');
    };

    useEffect(() => {
        startGame();
    }, [startGame]);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    return (
        <div style={{
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'monospace',
            border: '1px solid #333',
            borderRadius: '5px',
            padding: '15px',
            maxWidth: '600px',
            margin: '20px auto'
        }}>
            <div ref={outputRef} style={{
                height: '250px',
                overflowY: 'auto',
                marginBottom: '10px',
                borderBottom: '1px solid #333',
                paddingBottom: '10px'
            }}>
                {output.map((line, index) => (
                    <p key={index} style={{ color: line.color, margin: '5px 0' }}>{line.text}</p>
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#569cd6' }}>&gt;</span>
                <input 
                    type="text" 
                    value={input}
                    disabled={!gameActive}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(event) => {
                        if (event.key === 'Enter') handleGuess();
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#d4d4d4',
                        fontFamily: 'monospace',
                        flexGrow: 1,
                        marginLeft: '10px',
                        fontSize: '1em'
                    }}
                />
                <button 
                    onClick={handleGuess}
                    style={{
                        background: '#0e639c',
                        border: 'none',
                        color: 'white',
                        padding: '5px 10px',
                        cursor: 'pointer'
                    }}
                >
                    {gameActive ? 'Zgaduj!' : 'Zagraj ponownie'}
                </button>
            </div>
        </div>
    );
};

export default InteractiveGame;
