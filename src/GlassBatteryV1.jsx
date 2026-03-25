import React from 'react';

// Total sections in the glass battery body
const TOTAL_SECTIONS = 20;

export function getSectionCount(discount) {
    // Linear interpolation: 5% = 1 section, 20% = 20 sections
    return Math.round(1 + ((discount - 5) / 15) * 19);
}

export function getBatteryConfig(discount) {
    if (discount >= 20) return {
        label: 'MAX',
        fillColor: '#4CAF50',
        glowColor: 'rgba(76,175,80,0.75)',
        glowColorSoft: 'rgba(76,175,80,0.25)',
        waveDir: 'ltr',
        waveSpeed: '2.2s',
        discountTextColor: '#2E7D32',
        animLabel: 'Full charge — VIP',
    };
    if (discount >= 15) return {
        label: 'HIGH',
        fillColor: '#E8B000',
        glowColor: 'rgba(232,176,0,0.75)',
        glowColorSoft: 'rgba(232,176,0,0.25)',
        waveDir: 'ltr',
        waveSpeed: '1.6s',
        discountTextColor: '#B8860B',
        animLabel: 'Charging…',
    };
    if (discount >= 10) return {
        label: 'LOW',
        fillColor: '#D32F2F',
        glowColor: 'rgba(211,47,47,0.80)',
        glowColorSoft: 'rgba(211,47,47,0.25)',
        waveDir: 'rtl',
        waveSpeed: '0.9s',
        discountTextColor: '#C62828',
        animLabel: 'Discharging — danger!',
    };
    return {
        label: 'BASE',
        fillColor: '#E68A00',
        glowColor: 'rgba(230,138,0,0.70)',
        glowColorSoft: 'rgba(230,138,0,0.20)',
        waveDir: 'ltr',
        waveSpeed: '2.8s',
        discountTextColor: '#E68A00',
        animLabel: 'Connecting…',
    };
}

/**
 * GlassBatteryV1 — Archive of the first photorealistic version.
 */
export default function GlassBatteryV1({ discount }) {
    const cfg = getBatteryConfig(discount);
    const filledCount = getSectionCount(discount);
    const isRTL = cfg.waveDir === 'rtl';
    const N = TOTAL_SECTIONS;

    const W = 500, H = 196;
    const capW = 28;
    const capH = H * 0.74;
    const capY = (H - capH) / 2;
    const capRx = 4;

    const bodyX = capW;
    const bodyW = W - capW * 2;
    const bodyH = H * 0.78;
    const bodyY = (H - bodyH) / 2;
    const bodyRx = 8;

    const innerPad = 14;
    const gap = 3.5;
    const sectionsW = bodyW - innerPad * 2 - gap * (N - 1);
    const sectionW = sectionsW / N;
    const sectionX0 = bodyX + innerPad;
    const sectionH = bodyH * 0.82;
    const sectionY = bodyY + (bodyH - sectionH) / 2;
    const sectionRx = 2.5;

    const fillW = filledCount > 0
        ? sectionW * filledCount + gap * (filledCount - 1)
        : 0;
    const fillX = isRTL
        ? sectionX0 + (sectionW + gap) * (N - filledCount)
        : sectionX0;

    const uid = `v1-${cfg.label}`;

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div style={{
                position: 'absolute',
                inset: '0 -5%',
                background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${cfg.glowColorSoft} 0%, transparent 80%)`,
                filter: 'blur(28px)',
                animation: `glassBatGlow-${uid} ${cfg.waveSpeed} ease-in-out infinite`,
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible', position: 'relative', zIndex: 1 }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id={`cap-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e8e8e8" />
                        <stop offset="15%" stopColor="#d0d0d0" />
                        <stop offset="45%" stopColor="#9a9a9a" />
                        <stop offset="55%" stopColor="#888888" />
                        <stop offset="85%" stopColor="#d5d5d5" />
                        <stop offset="100%" stopColor="#b0b0b0" />
                    </linearGradient>
                    <linearGradient id={`ring-grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f0f0f0" />
                        <stop offset="45%" stopColor="#a0a0a0" />
                        <stop offset="55%" stopColor="#909090" />
                        <stop offset="100%" stopColor="#c0c0c0" />
                    </linearGradient>
                    <linearGradient id={`body-bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#181e2e" />
                        <stop offset="100%" stopColor="#0e1420" />
                    </linearGradient>
                    <linearGradient id={`glass-sheen-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                        <stop offset="22%" stopColor="rgba(255,255,255,0.12)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                    </linearGradient>
                    <linearGradient id={`fill-grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cfg.fillColor} stopOpacity="1.0" />
                        <stop offset="35%" stopColor={cfg.fillColor} stopOpacity="0.85" />
                        <stop offset="100%" stopColor={cfg.fillColor} stopOpacity="0.55" />
                    </linearGradient>
                    <linearGradient id={`empty-grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(200,215,245,0.18)" />
                        <stop offset="100%" stopColor="rgba(140,165,210,0.06)" />
                    </linearGradient>
                    <filter id={`sec-glow-${uid}`} x="-15%" y="-20%" width="130%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <linearGradient id={`wave-${uid}`} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${isRTL ? W : -W}, 0)`}>
                        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.60)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        <animateTransform attributeName="gradientTransform" type="translate" from={isRTL ? `${W} 0` : `${-W} 0`} to={isRTL ? `${-W} 0` : `${W} 0`} dur={cfg.waveSpeed} repeatCount="indefinite" />
                    </linearGradient>
                    <clipPath id={`fill-clip-${uid}`}><rect x={fillX} y={sectionY - 2} width={fillW} height={sectionH + 4}/></clipPath>
                    <filter id={`symbol-inset-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feComponentTransfer in="SourceAlpha"><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
                        <feOffset dx="0.8" dy="1.2" />
                        <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadow" />
                        <feFlood floodColor="rgba(0,0,0,0.4)" /><feComposite in2="shadow" operator="in" /><feComposite in2="SourceGraphic" operator="over" />
                    </filter>
                    <filter id={`battery-drop-shadow-${uid}`} x="-20%" y="-10%" width="140%" height="150%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="6" /><feOffset dx="0" dy="12" result="offsetblur" />
                        <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
                        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <linearGradient id={`ao-left-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(0,0,0,0.45)" /><stop offset="100%" stopColor="rgba(0,0,0,0)" /></linearGradient>
                    <linearGradient id={`ao-right-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(0,0,0,0)" /><stop offset="100%" stopColor="rgba(0,0,0,0.45)" /></linearGradient>
                    <clipPath id={`body-clip-${uid}`}><rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={bodyRx} ry={bodyRx} /></clipPath>
                </defs>
                <g filter={`url(#battery-drop-shadow-${uid})`}>
                    <path d={`M ${capW},${capY} L ${capW},${capY + capH} L 4,${capY + capH} A 4,4 0 0 1 0,${capY + capH - 4} L 0,${capY + 4} A 4,4 0 0 1 4,${capY} Z`} fill={`url(#cap-${uid})`} />
                    <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={bodyRx} ry={bodyRx} fill={`url(#body-bg-${uid})`} />
                    <rect x={bodyX} y={bodyY} width={24} height={bodyH} rx={bodyRx} ry={bodyRx} fill={`url(#ao-left-${uid})`} opacity="0.4" />
                    <rect x={bodyX + bodyW - 24} y={bodyY} width={24} height={bodyH} rx={bodyRx} ry={bodyRx} fill={`url(#ao-right-${uid})`} opacity="0.4" />
                    <path d={`M ${W - capW},${capY} L ${W - capW},${capY + capH} L ${W - 4},${capY + capH} A 4,4 0 0 0 ${W},${capY + capH - 4} L ${W},${capY + 4} A 4,4 0 0 0 ${W - 4},${capY} Z`} fill={`url(#cap-${uid})`} />
                    <rect x={W} y={capY + capH * 0.3} width={4} height={capH * 0.4} rx={2} fill={`url(#cap-${uid})`} />
                </g>
                <g clipPath={`url(#body-clip-${uid})`}>
                    {Array.from({ length: filledCount }).map((_, i) => {
                        const idxFromLeft = isRTL ? N - filledCount + i : i;
                        const sx = sectionX0 + idxFromLeft * (sectionW + gap);
                        return <rect key={`fill-${i}`} x={sx} y={sectionY} width={sectionW} height={sectionH} rx={sectionRx} ry={sectionRx} fill={`url(#fill-grad-${uid})`} filter={`url(#sec-glow-${uid})`} />;
                    })}
                    {Array.from({ length: N }).map((_, i) => {
                        const isFilled = isRTL ? i >= (N - filledCount) : i < filledCount;
                        if (isFilled) return null;
                        const sx = sectionX0 + i * (sectionW + gap);
                        return <rect key={`empty-${i}`} x={sx} y={sectionY} width={sectionW} height={sectionH} rx={sectionRx} ry={sectionRx} fill={`url(#empty-grad-${uid})`} />;
                    })}
                </g>
                {filledCount > 0 && <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} fill={`url(#wave-${uid})`} clipPath={`url(#fill-clip-${uid})`} />}
                <g clipPath={`url(#body-clip-${uid})`}>
                    <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} fill={`url(#glass-sheen-${uid})`} />
                    <rect x={bodyX + 10} y={bodyY + 2} width={bodyW - 20} height={bodyH * 0.18} rx={4} fill="rgba(255,255,255,0.28)" />
                    <rect x={bodyX + 10} y={bodyY + bodyH * 0.84} width={bodyW - 20} height={bodyH * 0.12} rx={3} fill="rgba(255,255,255,0.08)" />
                    {Array.from({ length: N - 1 }).map((_, i) => {
                        const ribX = sectionX0 + (i + 1) * sectionW + i * gap;
                        return <rect key={`rib-${i}`} x={ribX} y={bodyY} width={gap} height={bodyH} fill={`url(#ring-grad-${uid})`} opacity="0.8" />;
                    })}
                </g>
                <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={bodyRx} ry={bodyRx} fill="none" stroke="rgba(160,190,240,0.22)" strokeWidth="1.5" />
                <rect x={capW * 0.25} y={H * 0.5 - 2} width={capW * 0.5} height={4} fill="rgba(40,40,50,0.65)" filter={`url(#symbol-inset-${uid})`} />
                <g filter={`url(#symbol-inset-${uid})`}>
                    <rect x={W - capW * 0.75} y={H * 0.5 - 2} width={capW * 0.5} height={4} fill="rgba(40,40,50,0.65)" />
                    <rect x={W - capW * 0.5 - 2} y={H * 0.5 - capW * 0.25} width={4} height={capW * 0.5} fill="rgba(40,40,50,0.65)" />
                </g>
            </svg>
            <style>{`@keyframes glassBatGlow-${uid} { 0%, 100% { opacity: 0.45; transform: scaleY(0.95); } 50% { opacity: 1.00; transform: scaleY(1.05); } }`}</style>
        </div>
    );
}
