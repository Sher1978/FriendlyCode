import React from 'react';

export function getBatteryConfig(capacity) {
    if (capacity === 10) return {
        label: '10_PERCENT',
        fillColor: '#FF3131', 
        glowColor: 'rgba(255,49,49,0.85)',
        glowColorSoft: 'rgba(255,49,49,0.5)',
        direction: 'ltr',
        activeCount: 2, 
        pulseDuration: '3s',   // slowed down 2x
        flowDuration: '2.4s',  // slowed down 2x
    };
    if (capacity === 25) return {
        label: '25_PERCENT',
        fillColor: '#FF8800', 
        glowColor: 'rgba(255,136,0,0.85)',
        glowColorSoft: 'rgba(255,136,0,0.5)',
        direction: 'ltr',
        activeCount: 4, 
        pulseDuration: '1.5s',
        flowDuration: '1.2s',
    };
    if (capacity === 50) return {
        label: '50_PERCENT',
        fillColor: '#FFD700', 
        glowColor: 'rgba(255,215,0,0.8)',
        glowColorSoft: 'rgba(255,215,0,0.5)',
        direction: 'rtl',
        activeCount: 7, 
        pulseDuration: '1.5s',
        flowDuration: '1.5s',
    };
    if (capacity === 100) return {
        label: '100_PERCENT',
        fillColor: '#00FF41', 
        glowColor: 'rgba(0,255,65,0.85)',
        glowColorSoft: 'rgba(0,255,65,0.5)',
        direction: 'ltr',
        activeCount: 14, 
        pulseDuration: '1.5s',
        flowDuration: '1.2s',
    };
    
    if (capacity < 15) return getBatteryConfig(10);
    if (capacity < 30) return getBatteryConfig(25);
    if (capacity < 60) return getBatteryConfig(50);
    return getBatteryConfig(100);
}

const TOTAL_SEGMENTS = 14;

export default function PngBattery({ capacity, discount }) {
    // Current rank-based system uses 10, 25, 50, 100
    // We prioritize 'capacity' if provided, then 'discount', then default to 10
    const batteryLevel = capacity ?? discount ?? 10;
    const cfg = getBatteryConfig(batteryLevel);
    const uid = cfg.label;

    const fillStart = 14.5;
    const fillEnd = 85.5;
    
    // Continuous charge ratio for the sweeping wave mask
    const chargeRatio = (capacity || 10) / 100;
    const currentFill = fillStart + (fillEnd - fillStart) * chargeRatio;

    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: '520px', margin: '0 auto' }}>
            {/* ── Outer Ambient Glow ── */}
            <div style={{
                position: 'absolute',
                inset: '-10%',
                background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${cfg.glowColorSoft} 0%, transparent 70%)`,
                filter: 'blur(35px)',
                opacity: 0.6,
                zIndex: 0,
            }} />

            {/* ══ PNG BASE ══ */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <img 
                    src="/assets/battery_v2_final.png" 
                    alt="Battery Core"
                    style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        userSelect: 'none',
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.5))'
                    }}
                />

                {/* ── Layer 1: Continuous Flowing Wave (From previous animation) ── */}
                <div style={{
                    position: 'absolute',
                    top: '15.5%',
                    bottom: '15.5%',
                    left: `${fillStart}%`,
                    width: `${fillEnd - fillStart}%`,
                    clipPath: `inset(0 ${100 - (chargeRatio * 100)}% 0 0)`, // Mask to current capacity
                    transition: 'clip-path 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 2,
                    overflow: 'hidden',
                }}>
                    {/* Sweeping Energy Wave */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '200%', height: '100%',
                        background: `linear-gradient(90deg, 
                            transparent 0%, 
                            ${cfg.glowColor} 25%, 
                            transparent 50%, 
                            ${cfg.glowColor} 75%,
                            transparent 100%)`,
                        backgroundSize: '50% 100%',
                        opacity: 0.85,
                        mixBlendMode: 'screen',
                        animation: cfg.direction === 'ltr' 
                            ? `energyFlowLTR-${uid} ${cfg.flowDuration} linear infinite` 
                            : `energyFlowRTL-${uid} ${cfg.flowDuration} linear infinite`,
                    }} />

                    {/* Glowing Energy Sparkles / Bubbles */}
                    {Array.from({ length: 35 }).map((_, i) => {
                        // Generate deterministic pseudo-random values based on index
                        const size = 2 + (i % 4) * 1.5; // Sizes betwen 2px and 6.5px
                        const left = (i * 13) % 100; // Spread across 0-100% width
                        const top = (i * 29) % 100; // Spread vertically across 0-100% height
                        const animDuration = 1.5 + (i % 5) * 0.4; // 1.5s to 3.1s
                        const delay = (i % 7) * 0.3; // 0s to 1.8s delay

                        return (
                            <div key={i} style={{
                                position: 'absolute',
                                width: `${size}px`,
                                height: `${size}px`,
                                left: `${left}%`,
                                top: `${top}%`, // Spawn vertically across the entire active liquid
                                borderRadius: '50%',
                                backgroundColor: '#fff',
                                boxShadow: `0 0 ${size * 3}px ${size}px ${cfg.fillColor}`,
                                opacity: 0,
                                mixBlendMode: 'screen',
                                animation: `sparkleFloat-${uid} ${animDuration}s infinite ease-in-out`,
                                animationDelay: `${delay}s`,
                            }} />
                        );
                    })}
                </div>

                {/* ── Layer 2: Discrete Segment Overlays (Current animation) ── */}
                <div style={{
                    position: 'absolute',
                    top: '15.5%',         
                    bottom: '15.5%',      
                    left: `${fillStart}%`,
                    width: `${fillEnd - fillStart}%`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    zIndex: 3, // Sit on top of the sweeping wave
                    pointerEvents: 'none',
                }}>
                    {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
                        const isActive = i < cfg.activeCount;
                        const distanceFromCenter = (i - 6.5) / 6.5; 
                        const curveMaxRadius = 24; 
                        
                        let borderRadius = '4px'; 
                        if (distanceFromCenter < -0.1) {
                            const r = Math.abs(distanceFromCenter) * curveMaxRadius;
                            borderRadius = `${r}px 2px 2px ${r}px`;
                        } else if (distanceFromCenter > 0.1) {
                            const r = Math.abs(distanceFromCenter) * curveMaxRadius;
                            borderRadius = `2px ${r}px ${r}px 2px`;
                        }

                        const delayIndex = cfg.direction === 'ltr' ? i : (TOTAL_SEGMENTS - 1 - i);
                        const animDelay = delayIndex * 0.1; 

                        return (
                            <div key={i} style={{
                                flex: 1,
                                margin: '0 0.8%', 
                                borderRadius: borderRadius,
                                background: isActive 
                                    ? `linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, ${cfg.fillColor} 20%, ${cfg.fillColor} 80%, rgba(255,255,255,0.7) 100%)`
                                    : 'transparent',
                                opacity: isActive ? 1 : 0, // removed the 0.9 to make it fully solid
                                mixBlendMode: 'hard-light', // using hard-light makes the colors pop and removes transparency washout
                                boxShadow: isActive ? `0 0 15px ${cfg.glowColorSoft}, inset 0 0 15px rgba(255,255,255,0.7)` : 'none',
                                transition: 'opacity 0.5s ease-in-out, background 0.5s ease-in-out, box-shadow 0.5s',
                                animation: isActive ? `segmentPulse-${uid} ${cfg.pulseDuration} infinite ease-in-out` : 'none',
                                animationDelay: `${animDelay}s`
                            }} />
                        );
                    })}
                </div>
                
            </div>

            <style>{`
                @keyframes segmentPulse-${uid} {
                    0%, 100% { filter: brightness(1); transform: scale(1); }
                    50%      { filter: brightness(1.6); transform: scale(1.02); box-shadow: 0 0 25px ${cfg.fillColor}; }
                }
                @keyframes energyFlowLTR-${uid} {
                    0%   { background-position: -100% 0; }
                    100% { background-position: 100% 0; }
                }
                @keyframes energyFlowRTL-${uid} {
                    0%   { background-position: 100% 0; }
                    100% { background-position: -100% 0; }
                }
                @keyframes sparkleFloat-${uid} {
                    0%   { transform: translateY(0px) scale(0.5); opacity: 0; }
                    30%  { opacity: 1; transform: translateY(-15px) scale(1.2); }
                    70%  { opacity: 0.8; transform: translateY(-30px) scale(1.1); }
                    100% { transform: translateY(-45px) scale(0); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
