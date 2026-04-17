import re

FILE_PATH = r"c:\Sher_AI_Studio\projects\FriendlyCode\src\UnifiedActivation.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# ───────────────────────────────────────────────
# PATCH 1: extend venueSettings to include tiers
# ───────────────────────────────────────────────
OLD_STATE = "const [venueSettings, setVenueSettings] = useState({ loyaltyInterval: 1, googleReviewLink: '' });"
NEW_STATE  = "const [venueSettings, setVenueSettings] = useState({ loyaltyInterval: 1, googleReviewLink: '', tiers: [] });"

if OLD_STATE in content:
    content = content.replace(OLD_STATE, NEW_STATE)
    print("PATCH 1 OK: venueSettings state extended")
else:
    print("PATCH 1 SKIP: already patched or not found")

# ───────────────────────────────────────────────
# PATCH 2: load tiers from Firestore
# ───────────────────────────────────────────────
OLD_SETTINGS = """                    setVenueSettings({
                        loyaltyInterval: data.loyaltyInterval || 1,
                        googleReviewLink: data.googleReviewLink || data.linkUrl || ''
                    });"""
NEW_SETTINGS = """                    const rawTiers = data.tiers || [];
                    const sortedTiers = [...rawTiers]
                        .filter(t => t.percentage > 0)
                        .sort((a, b) => b.percentage - a.percentage);
                    setVenueSettings({
                        loyaltyInterval: data.loyaltyInterval || 1,
                        googleReviewLink: data.googleReviewLink || data.linkUrl || '',
                        tiers: sortedTiers,
                    });"""

if OLD_SETTINGS in content:
    content = content.replace(OLD_SETTINGS, NEW_SETTINGS)
    print("PATCH 2 OK: tiers loaded from Firestore")
else:
    print("PATCH 2 SKIP: already patched or not found")

# ───────────────────────────────────────────────
# PATCH 3: replace VIP Milestone block with animated teaser
# ───────────────────────────────────────────────
OLD_VIP_BLOCK = """                {/* VIP Milestone */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className=\"w-full mb-4 p-[1px] rounded-[24px]\"
                    style={{ background: `linear-gradient(90deg, ${ambientColor}20, ${ambientColor}10, ${ambientColor}20)` }}
                >
                    <div className=\"bg-[#1C1C1E] rounded-[23px] py-4 px-6 text-center shadow-xl\">
                        <span className=\"text-[11px] font-black text-white/40 uppercase tracking-[0.2em] block mb-1\">{t('loyalty_vip')} STATUS UPGRADE</span>
                        <h2 className=\"text-[14px] font-bold mb-1 text-white\">
                            {discountValue >= 20 
                                ? t('max_vip_achieved', 'YOU HAVE REACHED MAXIMUM VIP!') 
                                : (venueSettings?.loyaltyInterval === 1 
                                    ? t('next_vip_tomorrow') 
                                    : t('next_vip_days', { days: venueSettings?.loyaltyInterval || 1 }))
                            }
                        </h2>
                        <p className=\"text-[10px] text-white/40 uppercase tracking-widest font-bold\">
                            {discountValue >= 20 
                                ? t('vip_maintenance_hint', 'Visit regularly to keep your status')
                                : t('vip_status_control')}
                        </p>
                    </div>
                </motion.div>"""

NEW_VIP_BLOCK = """                {/* VIP Gift Teaser */}
                <VipGiftTeaser
                    tiers={venueSettings.tiers}
                    ambientColor={ambientColor}
                    discountValue={discountValue}
                />"""

if OLD_VIP_BLOCK in content:
    content = content.replace(OLD_VIP_BLOCK, NEW_VIP_BLOCK)
    print("PATCH 3 OK: VIP block replaced with teaser")
else:
    print("PATCH 3 SKIP: already patched or not found")

# ───────────────────────────────────────────────
# PATCH 4: inject VipGiftTeaser component before UnifiedActivation
# ───────────────────────────────────────────────
COMPONENT_ANCHOR = "const UnifiedActivation = () => {"

VIP_COMPONENT = """// ─── VIP Gift Teaser Component ───────────────────────────────
const VipGiftTeaser = ({ tiers, ambientColor, discountValue }) => {
    const [activeIdx, setActiveIdx] = React.useState(0);
    const color = ambientColor || '#FFD700';

    const rows = React.useMemo(() => {
        if (!tiers || tiers.length === 0) return [];
        return tiers
            .filter(t => t.maxHours > 0)
            .map(t => {
                const days = Math.round(t.maxHours / 24);
                const label = days === 1 ? '1 DAY' : `${days} DAYS`;
                return { pct: t.percentage, label };
            });
    }, [tiers]);

    React.useEffect(() => {
        if (rows.length < 2) return;
        const id = setInterval(() => {
            setActiveIdx(prev => (prev + 1) % rows.length);
        }, 2200);
        return () => clearInterval(id);
    }, [rows]);

    if (rows.length === 0) return null;

    const current = rows[activeIdx];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="w-full mb-4 relative"
        >
            {/* Pulsing gradient border */}
            <motion.div
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '24px',
                    padding: '1px',
                    background: `linear-gradient(120deg, ${color}60, ${color}15, ${color}60)`,
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    pointerEvents: 'none',
                }}
            />

            <div style={{
                background: 'linear-gradient(135deg, #1C1C1E 0%, #161618 100%)',
                borderRadius: '23px',
                padding: '14px 20px 12px',
                textAlign: 'center',
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset`,
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Background ambient glow */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(ellipse at 50% 0%, ${color}12 0%, transparent 65%)`,
                    pointerEvents: 'none',
                }} />

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                    <motion.span
                        animate={{ scale: [1, 1.18, 1], rotate: [0, -8, 8, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ fontSize: '18px', lineHeight: 1 }}
                    >🎁</motion.span>
                    <span style={{
                        fontSize: '10px', fontWeight: 900,
                        letterSpacing: '0.22em', textTransform: 'uppercase',
                        color: color, opacity: 0.9,
                    }}>NEXT VISIT GIFT</span>
                </div>

                {/* Animated sliding tier row */}
                <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ y: 18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -18, opacity: 0 }}
                            transition={{ duration: 0.38, ease: 'easeOut' }}
                            style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'absolute' }}
                        >
                            <span style={{
                                fontSize: activeIdx === 0 ? '28px' : '22px',
                                fontWeight: 900,
                                color: '#fff',
                                letterSpacing: '-1px',
                                textShadow: activeIdx === 0 ? `0 0 20px ${color}` : 'none',
                                transition: 'font-size 0.3s',
                            }}>{current.pct}%</span>
                            <span style={{
                                fontSize: '11px', fontWeight: 700,
                                color: 'rgba(255,255,255,0.5)',
                                textTransform: 'uppercase', letterSpacing: '0.12em',
                            }}>OFF  •  IN {current.label}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Dot pagination */}
                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginTop: '10px' }}>
                    {rows.map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{ width: i === activeIdx ? 16 : 5, opacity: i === activeIdx ? 1 : 0.3 }}
                            transition={{ duration: 0.3 }}
                            style={{ height: '4px', borderRadius: '9999px', background: color, cursor: 'pointer' }}
                            onClick={() => setActiveIdx(i)}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
// ─────────────────────────────────────────────────────────────

"""

if "const VipGiftTeaser" not in content:
    content = content.replace(COMPONENT_ANCHOR, VIP_COMPONENT + COMPONENT_ANCHOR)
    print("PATCH 4 OK: VipGiftTeaser component injected")
else:
    print("PATCH 4 SKIP: already exists")

# ───────────────────────────────────────────────
# Write result
# ───────────────────────────────────────────────
with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("\nAll patches applied successfully!")
