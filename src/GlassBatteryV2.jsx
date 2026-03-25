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
    };
    if (discount >= 15) return {
        label: 'HIGH',
        fillColor: '#FFD700', // Gold
        glowColor: 'rgba(255,215,0,0.6)',
        coreGlow: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
        waveDir: 'ltr',
        waveSpeed: '2s',
    };
    if (discount >= 10) return {
        label: 'LOW',
        fillColor: '#FF3131', // Neon Red
        glowColor: 'rgba(255,49,49,0.7)',
        coreGlow: 'radial-gradient(circle, rgba(255,49,49,0.4) 0%, transparent 70%)',
        waveDir: 'rtl',
        waveSpeed: '1.2s',
    };
    return {
        label: 'BASE',
        fillColor: '#00D4FF', // Electric Blue
        glowColor: 'rgba(0,212,255,0.6)',
        coreGlow: 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, transparent 70%)',
        waveDir: 'ltr',
        waveSpeed: '3s',
    };
}

/**
 * GlassBatteryV2 — Ultra-High Fidelity 3D SVG Battery.
 * Features internal metallic disks, glowing energy core, and advanced material optics.
 */
export default function GlassBatteryV2({ discount }) {
    const cfg = getBatteryConfig(discount);
    const filledCount = getSectionCount(discount);
    const uid = cfg.label;

    // Viewport
    const W = 500, H = 196;
    const bodyW = 444; 
    const bodyH = 152;
    const bodyX = (W - bodyW) / 2;
    const bodyY = (H - bodyH) / 2;
    
    // Disks
    const N = TOTAL_SECTIONS;
    const gap = (bodyW - 40) / (N - 1);
    const diskW = 6;
    const diskH = bodyH * 0.85;
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
                    {/* ── Brushed Metal Cap ── */}
                    <linearGradient id={`cap-metal-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d8d8d8" />
                        <stop offset="15%" stopColor="#b8b8b8" />
                        <stop offset="50%" stopColor="#808080" />
                        <stop offset="85%" stopColor="#b0b0b0" />
                        <stop offset="100%" stopColor="#909090" />
                    </linearGradient>

                    {/* ── Disk Metal ── */}
                    <linearGradient id={`disk-metal-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f0f0f0" />
                        <stop offset="50%" stopColor="#888888" />
                        <stop offset="100%" stopColor="#e0e0e0" />
                    </linearGradient>

                    {/* ── Glass Highlights ── */}
                    <linearGradient id={`glass-rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="25%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="75%" stopColor="rgba(255,255,255,0.02)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                    </linearGradient>

                    {/* ── Neon Energy Core ── */}
                    <radialGradient id={`energy-core-${uid}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={cfg.fillColor} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={cfg.fillColor} stopOpacity="0" />
                    </radialGradient>

                    {/* ── Inner Glow Filter ── */}
                    <filter id={`neon-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    <clipPath id={`body-clip-${uid}`}>
                        <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={12} />
                    </clipPath>
                    
                    {/* ── Symbol filter ── */}
                    <filter id={`symbol-engrave-${uid}`}>
                        <feOffset dx="0.5" dy="1" />
                        <feGaussianBlur stdDeviation="1" result="offset-blur" />
                        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                        <feFlood floodColor="black" floodOpacity="0.6" result="color" />
                        <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                        <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                    </filter>
                </defs>

                {/* ══ CASE BACKGROUND ══ */}
                <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={12} fill="#0b101b" />
                
                {/* ══ INNER ENERGY CORE ══ */}
                <ellipse cx={W/2} cy={H/2} rx={bodyW * 0.4} ry={bodyH * 0.4} fill={`url(#energy-core-${uid})`} opacity="0.4">
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="rx" values={`${bodyW * 0.35};${bodyW * 0.45};${bodyW * 0.35}`} dur="4s" repeatCount="indefinite" />
                </ellipse>

                {/* ══ METALLIC DISKS ══ */}
                <g clipPath={`url(#body-clip-${uid})`}>
                    {Array.from({ length: N }).map((_, i) => {
                        const isFilled = i < filledCount;
                        const x = diskX0 + i * gap;
                        
                        return (
                            <g key={`disk-${i}`}>
                                {/* Disk Base Shape with hole */}
                                <path 
                                    d={`
                                        M ${x},${diskY} 
                                        L ${x + diskW},${diskY} 
                                        L ${x + diskW},${diskY + diskH} 
                                        L ${x},${diskY + diskH} Z
                                        M ${x + diskW/2},${H/2} 
                                        m -15,0 a 15,15 0 1,0 30,0 a 15,15 0 1,0 -30,0
                                    `} 
                                    fillRule="evenodd"
                                    fill={isFilled ? cfg.fillColor : `url(#disk-metal-${uid})`}
                                    fillOpacity={isFilled ? 0.9 : 0.4}
                                    filter={isFilled ? `url(#neon-glow-${uid})` : 'none'}
                                />
                                {/* Disk Rim detail */}
                                <rect x={x} y={diskY} width={diskW} height={diskH} fill="none" 
                                    stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                            </g>
                        );
                    })}
                </g>

                {/* ══ CAPS ══ */}
                {/* Left Cap (-) */}
                <path d={`M ${bodyX + 8},${bodyY} L ${bodyX - 25},${bodyY} A 8,8 0 0 0 ${bodyX - 33},${bodyY + 8} L ${bodyX - 33},${bodyY + bodyH - 8} A 8,8 0 0 0 ${bodyX - 25},${bodyY + bodyH} L ${bodyX + 8},${bodyY + bodyH} Z`} fill={`url(#cap-metal-${uid})`} />
                <rect x={bodyX - 20} y={H/2 - 2} width={15} height={4} rx={1} fill="#222" filter={`url(#symbol-engrave-${uid})`} />

                {/* Right Cap (+) */}
                <path d={`M ${bodyX + bodyW - 8},${bodyY} L ${bodyX + bodyW + 25},${bodyY} A 8,8 0 0 1 ${bodyX + bodyW + 33},${bodyY + 8} L ${bodyX + bodyW + 33},${bodyY + bodyH - 8} A 8,8 0 0 1 ${bodyX + bodyW + 25},${bodyY + bodyH} L ${bodyX + bodyW - 8},${bodyY + bodyH} Z`} fill={`url(#cap-metal-${uid})`} />
                <g filter={`url(#symbol-engrave-${uid})`}>
                    <rect x={bodyX + bodyW + 5} y={H/2 - 2} width={15} height={4} rx={1} fill="#222" />
                    <rect x={bodyX + bodyW + 10} y={H/2 - 7} width={4} height={14} rx={1} fill="#222" />
                </g>
                {/* Nipple */}
                <rect x={bodyX + bodyW + 33} y={H/2 - 25} width={6} height={50} rx={3} fill={`url(#cap-metal-${uid})`} />

                {/* ══ GLASS REFRACTION & SHEEN ══ */}
                <g clipPath={`url(#body-clip-${uid})`}>
                    <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} fill={`url(#glass-rim-${uid})`} />
                    {/* Top Neon Tube Glow */}
                    <rect x={bodyX + 15} y={bodyY + 5} width={bodyW - 30} height={2} fill={cfg.fillColor} opacity="0.3">
                         <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" />
                    </rect>
                    {/* Top Thick Edge Highlight */}
                    <path d={`M ${bodyX+15},${bodyY+8} Q ${W/2},${bodyY+4} ${bodyX+bodyW-15},${bodyY+8}`} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" opacity="0.7" />
                    {/* Bottom Thick Edge Highlight */}
                    <path d={`M ${bodyX+15},${bodyY+bodyH-8} Q ${W/2},${bodyY+bodyH-4} ${bodyX+bodyW-15},${bodyY+bodyH-8}`} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" opacity="0.5" />
                </g>

                {/* ══ OUTER CASE RIM ══ */}
                <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={12} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            </svg>

            <style>{`
                @keyframes batPulse-${uid} {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50%       { opacity: 0.6; transform: scale(1.05); }
                }
            `}</style>
        </div>
    );
}
