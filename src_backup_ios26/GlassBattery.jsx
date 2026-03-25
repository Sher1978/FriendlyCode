import React from 'react';

// Configuration logic shared between versions
const TOTAL_SECTIONS = 16; // Number of disks

export function getSectionCount(discount) {
    // 5% = 1 disk, 20% = 16 disks
    return Math.round(1 + ((discount - 5) / 15) * 15);
}

export function getBatteryConfig(discount) {
    if (discount >= 20) return {
        label: 'MAX',
        fillColor: '#00FF41', // Matrix green
        glowColor: 'rgba(0,255,65,0.7)',
        coreGlow: 'radial-gradient(circle, rgba(0,255,65,0.4) 0%, transparent 70%)',
        waveDir: 'ltr',
        waveSpeed: '2.5s',
        glowColorSoft: 'rgba(0,255,65,0.2)',
    };
    if (discount >= 15) return {
        label: 'HIGH',
        fillColor: '#FFD700', // Gold
        glowColor: 'rgba(255,215,0,0.6)',
        coreGlow: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
        waveDir: 'ltr',
        waveSpeed: '2s',
        glowColorSoft: 'rgba(255,215,0,0.2)',
    };
    if (discount >= 10) return {
        label: 'LOW',
        fillColor: '#FF3131', // Neon Red
        glowColor: 'rgba(255,49,49,0.7)',
        coreGlow: 'radial-gradient(circle, rgba(255,49,49,0.4) 0%, transparent 70%)',
        waveDir: 'rtl',
        waveSpeed: '1.2s',
        glowColorSoft: 'rgba(255,49,49,0.2)',
    };
    return {
        label: 'BASE',
        fillColor: '#00D4FF', // Electric Blue
        glowColor: 'rgba(0,212,255,0.6)',
        coreGlow: 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, transparent 70%)',
        waveDir: 'ltr',
        waveSpeed: '3s',
        glowColorSoft: 'rgba(0,212,255,0.2)',
    };
}

/**
 * GlassBattery — Ultra-High Fidelity 3D SVG Battery.
 * FEATURES: Internal disks, dynamic energy core, neon edge glows.
 */
export default function GlassBattery({ discount }) {
    const cfg = getBatteryConfig(discount);
    const filledCount = getSectionCount(discount);
    const uid = cfg.label;

    // Viewport
    const W = 500, H = 196;
    const bodyW = 440; 
    const bodyH = 152;
    const bodyX = (W - bodyW) / 2;
    const bodyY = (H - bodyH) / 2;
    
    // Disks
    const N = TOTAL_SECTIONS;
    const gap = (bodyW - 40) / (N - 1);
    const diskW = 5.5;
    const diskH = bodyH * 0.88;
    const diskY = bodyY + (bodyH - diskH) / 2;
    const diskX0 = bodyX + 20;

    return (
        <div style={{ position: 'relative', width: '100%', filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.5))' }}>
            {/* ── Ambient Background Glow ── */}
            <div style={{
                position: 'absolute',
                inset: '10% 15%',
                background: cfg.coreGlow,
                filter: 'blur(45px)',
                animation: `batPulse-${uid} 3s ease-in-out infinite`,
                zIndex: 0,
            }} />

            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible', zIndex: 1 }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    {/* Brushed metal cap */}
                    <linearGradient id={`cap-metal-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e0e0e0" />
                        <stop offset="15%" stopColor="#c0c0c0" />
                        <stop offset="45%" stopColor="#808080" />
                        <stop offset="55%" stopColor="#707070" />
                        <stop offset="85%" stopColor="#b0b0b0" />
                        <stop offset="100%" stopColor="#909090" />
                    </linearGradient>

                    {/* Disk Metal */}
                    <linearGradient id={`disk-metal-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="50%" stopColor="#999999" />
                        <stop offset="100%" stopColor="#cccccc" />
                    </linearGradient>

                    {/* Glass Sheen */}
                    <linearGradient id={`glass-rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="10%" stopColor="rgba(255,255,255,0.1)" />
                        <stop offset="90%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                    </linearGradient>

                    {/* Energy Core */}
                    <radialGradient id={`energy-core-${uid}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={cfg.fillColor} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={cfg.fillColor} stopOpacity="0" />
                    </radialGradient>

                    {/* Glow filters */}
                    <filter id={`neon-glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    
                    <filter id={`symbol-engrave-${uid}`}>
                        <feOffset dx="0.5" dy="1" />
                        <feGaussianBlur stdDeviation="1" result="offset-blur" />
                        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                        <feFlood floodColor="black" floodOpacity="0.7" result="color" />
                        <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                        <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                    </filter>

                    <clipPath id={`body-clip-${uid}`}>
                        <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={12} />
                    </clipPath>
                </defs>

                {/* ══ CASE BACKGROUND ══ */}
                <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={12} fill="#0d121f" />
                
                {/* ══ INNER ENERGY CORE ══ */}
                <ellipse cx={W/2} cy={H/2} rx={bodyW * 0.45} ry={bodyH * 0.45} fill={`url(#energy-core-${uid})`} opacity="0.45">
                    <animate attributeName="opacity" values="0.25;0.6;0.25" dur="3s" repeatCount="indefinite" />
                </ellipse>

                {/* ══ METALLIC DISKS ══ */}
                <g clipPath={`url(#body-clip-${uid})`}>
                    {Array.from({ length: N }).map((_, i) => {
                        const isFilled = i < filledCount;
                        const x = diskX0 + i * gap;
                        
                        return (
                            <g key={`disk-${i}`}>
                                <path 
                                    d={`
                                        M ${x},${diskY} 
                                        L ${x + diskW},${diskY} 
                                        L ${x + diskW},${diskY + diskH} 
                                        L ${x},${diskY + diskH} Z
                                        M ${x + diskW/2},${H/2} 
                                        m -16,0 a 16,16 0 1,0 32,0 a 16,16 0 1,0 -32,0
                                    `} 
                                    fillRule="evenodd"
                                    fill={isFilled ? cfg.fillColor : `url(#disk-metal-${uid})`}
                                    fillOpacity={isFilled ? 0.95 : 0.35}
                                    filter={isFilled ? `url(#neon-glow-${uid})` : 'none'}
                                />
                                <rect x={x} y={diskY} width={diskW} height={diskH} fill="none" 
                                    stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                            </g>
                        );
                    })}
                </g>

                {/* ══ CAPS ══ */}
                {/* Left Cap (-) */}
                <path d={`M ${bodyX + 8},${bodyY} L ${bodyX - 25},${bodyY} A 10,10 0 0 0 ${bodyX - 35},${bodyY + 10} L ${bodyX - 35},${bodyY + bodyH - 10} A 10,10 0 0 0 ${bodyX - 25},${bodyY + bodyH} L ${bodyX + 8},${bodyY + bodyH} Z`} fill={`url(#cap-metal-${uid})`} />
                <rect x={bodyX - 22} y={H/2 - 2} width={14} height={4} rx={1} fill="#1a1a1a" filter={`url(#symbol-engrave-${uid})`} />

                {/* Right Cap (+) */}
                <path d={`M ${bodyX + bodyW - 8},${bodyY} L ${bodyX + bodyW + 25},${bodyY} A 10,10 0 0 1 ${bodyX + bodyW + 35},${bodyY + 10} L ${bodyX + bodyW + 35},${bodyY + bodyH - 10} A 10,10 0 0 1 ${bodyX + bodyW + 25},${bodyY + bodyH} L ${bodyX + bodyW - 8},${bodyY + bodyH} Z`} fill={`url(#cap-metal-${uid})`} />
                <g filter={`url(#symbol-engrave-${uid})`}>
                    <rect x={bodyX + bodyW + 8} y={H/2 - 2} width={14} height={4} rx={1} fill="#1a1a1a" />
                    <rect x={bodyX + bodyW + 13} y={H/2 - 7} width={4} height={14} rx={1} fill="#1a1a1a" />
                </g>
                {/* Nipple */}
                <rect x={bodyX + bodyW + 35} y={H/2 - 22} width={6} height={44} rx={3} fill={`url(#cap-metal-${uid})`} />

                {/* ══ GLASS EFFECTS ══ */}
                <g clipPath={`url(#body-clip-${uid})`}>
                    <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} fill={`url(#glass-rim-${uid})`} />
                    <rect x={bodyX + 20} y={bodyY + 4} width={bodyW - 40} height={2} fill={cfg.fillColor} opacity="0.4">
                         <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite" />
                    </rect>
                    <path d={`M ${bodyX + 20},${bodyY + 10} Q ${W/2},${bodyY + 4} ${bodyX + bodyW - 20},${bodyY + 10}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" opacity="0.8" />
                </g>

                {/* Outer frame */}
                <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={12} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
            </svg>

            <style>{`
                @keyframes batPulse-${uid} {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50%       { opacity: 0.7; transform: scale(1.04); }
                }
            `}</style>
        </div>
    );
}
