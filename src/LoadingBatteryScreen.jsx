import React, { useState, useEffect } from 'react';
import PngBattery from './PngBattery';
import { useTranslation } from 'react-i18next';

const LoadingBatteryScreen = () => {
    const { t } = useTranslation();
    const [animatedCapacity, setAnimatedCapacity] = useState(10); // Start at lowest tier (red)

    useEffect(() => {
        // Animate from 10 to 100 over 6 seconds
        const duration = 6000;
        const fps = 30; // 30 frames per second
        const totalFrames = (duration / 1000) * fps;
        let currentFrame = 0;
        
        const interval = setInterval(() => {
            currentFrame++;
            const progress = currentFrame / totalFrames;
            
            if (currentFrame >= totalFrames) {
                setAnimatedCapacity(100);
                clearInterval(interval);
            } else {
                // Interpolate from 10 to 100
                const currentVal = 10 + (90 * progress);
                setAnimatedCapacity(Math.min(100, Math.floor(currentVal)));
            }
        }, 1000 / fps);
        
        return () => clearInterval(interval);
    }, []);

    // Get color glow based on capacity to match the background glow
    let bgGlowColor = 'rgba(0, 255, 65, 0.1)'; // Green
    if (animatedCapacity < 25) bgGlowColor = 'rgba(255, 49, 49, 0.1)'; // Red
    else if (animatedCapacity < 50) bgGlowColor = 'rgba(255, 140, 0, 0.1)'; // Orange
    else if (animatedCapacity < 100) bgGlowColor = 'rgba(255, 215, 0, 0.1)'; // Yellow

    return (
        <div className="flex flex-col min-h-[100dvh] bg-black items-center justify-center p-6 text-white relative overflow-hidden">
            <div 
                className="absolute inset-0 pointer-events-none transition-colors duration-300"
                style={{ background: `radial-gradient(ellipse at center, ${bgGlowColor} 0%, transparent 70%)` }}
            />
            <div className="z-10 flex flex-col items-center justify-center w-full max-w-[280px]">
                <PngBattery capacity={animatedCapacity} showGlow={true} disableInternalAnim={true} />
                <p className="mt-8 text-white/50 font-medium text-sm animate-pulse tracking-widest uppercase">
                    {t('calculating_discount', 'Рассчитываем скидку...')}
                </p>
            </div>
        </div>
    );
};

export default LoadingBatteryScreen;
