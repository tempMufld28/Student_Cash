import React, { useState, useEffect } from 'react';

const SplashScreen = ({ onFinish }) => {
    // phase: 'welcome' -> 'fade-out-welcome' -> 'name' -> 'fade-out-name' -> 'done'
    const [phase, setPhase] = useState('welcome');

    useEffect(() => {
        // Show "BIENVENIDO" for 1.4s, then fade out
        const t1 = setTimeout(() => setPhase('fade-out-welcome'), 1400);
        // After fade out (400ms), show "Student-Cash"
        const t2 = setTimeout(() => setPhase('name'), 1800);
        // "Student-Cash" visible for 1.2s, then fade out
        const t3 = setTimeout(() => setPhase('fade-out-name'), 3000);
        // After fade done, call onFinish
        const t4 = setTimeout(() => onFinish(), 3500);
        return () => [t1, t2, t3, t4].forEach(clearTimeout);
    }, [onFinish]);

    const isVisible = phase === 'welcome' || phase === 'name';
    const isFadingOut = phase === 'fade-out-welcome' || phase === 'fade-out-name';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1C1410 0%, #2A1F14 50%, #1C1410 100%)',
                flexDirection: 'column',
                gap: '12px',
            }}
        >
            {/* Animated background dots */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            borderRadius: '50%',
                            background: 'rgba(166, 138, 100, 0.10)',
                            width: `${40 + (i * 20) % 80}px`,
                            height: `${40 + (i * 20) % 80}px`,
                            top: `${(i * 37) % 100}%`,
                            left: `${(i * 53) % 100}%`,
                            animation: `floatDot ${3 + (i % 3)}s ease-in-out infinite alternate`,
                            animationDelay: `${(i * 0.3) % 2}s`,
                        }}
                    />
                ))}
            </div>

            {/* "BIENVENIDO" text */}
            {(phase === 'welcome' || phase === 'fade-out-welcome') && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: phase === 'fade-out-welcome' ? 0 : 1,
                        transform: phase === 'fade-out-welcome' ? 'translateY(-16px) scale(0.95)' : 'translateY(0) scale(1)',
                        transition: 'opacity 0.4s ease, transform 0.4s ease',
                    }}
                >
                    <p
                        style={{
                            fontSize: 'clamp(14px, 4vw, 18px)',
                            fontWeight: 500,
                            letterSpacing: '0.35em',
                            color: 'rgba(230, 199, 141, 0.85)',
                            textTransform: 'uppercase',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            margin: 0,
                            animation: 'fadeInUp 0.6s ease forwards',
                        }}
                    >
                        BIENVENIDO
                    </p>
                    {/* Animated underline */}
                    <div
                        style={{
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, #DDB892, transparent)',
                            animation: 'expandLine 0.8s ease 0.2s forwards',
                            width: 0,
                        }}
                    />
                </div>
            )}

            {/* "Student-Cash" text */}
            {(phase === 'name' || phase === 'fade-out-name') && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        opacity: phase === 'fade-out-name' ? 0 : 1,
                        transform: phase === 'fade-out-name' ? 'translateY(-16px) scale(0.95)' : 'translateY(0) scale(1)',
                        transition: 'opacity 0.45s ease, transform 0.45s ease',
                    }}
                >
                    <h1
                        style={{
                            fontSize: 'clamp(32px, 8vw, 52px)',
                            fontWeight: 800,
                            color: '#F5F1E9',
                            margin: 0,
                            letterSpacing: '-0.02em',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            animation: 'fadeInUp 0.5s ease forwards',
                            textShadow: '0 0 40px rgba(166, 138, 100, 0.5)',
                        }}
                    >
                        Student<span style={{ color: '#A68A64' }}>-Cash</span>
                    </h1>
                    <p
                        style={{
                            fontSize: '13px',
                            color: 'rgba(245, 241, 233, 0.55)',
                            margin: 0,
                            letterSpacing: '0.08em',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            animation: 'fadeInUp 0.5s ease 0.15s both',
                        }}
                    >
                        Controla tus finanzas de manera simple
                    </p>
                    {/* Loading dots */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: '#A68A64',
                                    animation: `bounce 0.9s ease ${i * 0.15}s infinite alternate`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes expandLine {
                    from { width: 0; }
                    to   { width: 120px; }
                }
                @keyframes bounce {
                    from { transform: translateY(0); opacity: 0.5; }
                    to   { transform: translateY(-6px); opacity: 1; }
                }
                @keyframes floatDot {
                    from { transform: translateY(0px) scale(1); }
                    to   { transform: translateY(-20px) scale(1.1); }
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
