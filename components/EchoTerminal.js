import React, { useState, useEffect, useRef } from 'react';

const EchoTerminal = () => {
    const [output, setOutput] = useState([]);
    const [input, setInput] = useState('');
    const outputRef = useRef(null);

    const handleCommand = () => {
        if (!input) return;

        // Add the user's command to the output
        setOutput(prev => [...prev, { text: `> ${input}`, color: '#569cd6' }]);
        // Add the "echoed" response
        setOutput(prev => [...prev, { text: input, color: '#d4d4d4' }]);
        
        setInput('');
    };

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    useEffect(() => {
        setOutput([{text: "To jest prosty echo terminal. Wpisz coś i naciśnij Enter.", color: '#b5cea8'}]);
    }, []);

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
                height: '150px',
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
                <span style={{ color: '#569cd6' }}>></span>
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(event) => {
                        if (event.key === 'Enter') handleCommand();
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
                    onClick={handleCommand}
                    style={{
                        background: '#0e639c',
                        border: 'none',
                        color: 'white',
                        padding: '5px 10px',
                        cursor: 'pointer'
                    }}
                >
                    Wyślij
                </button>
            </div>
        </div>
    );
};

export default EchoTerminal;
