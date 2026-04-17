import re

FILE_PATH = r"c:\Sher_AI_Studio\projects\FriendlyCode\src\UnifiedActivation.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

NEW_COMPONENT = """// VIP Gift Teaser Component
const VipGiftTeaser = ({ tiers, ambientColor, discountValue }) => {
    const [activeIdx, setActiveIdx] = React.useState(0);
    const ambient = ambientColor || '#FFD700';

    const getRowColor = (val) => {
        if (val >= 20) return '#00FF41'; // Green (Max)
        if (val >= 15) return '#FFD700'; // Gold (Level 1)
        if (val >= 10) return '#FF8800'; // Orange (Level 2)
        return '#FF3131'; // Red (Base)
    };

    const rows = React.useMemo(() => {
        if (!tiers || tiers.length === 0) return [];
        return tiers
            .filter(t => t.maxHours > 0)
            .map(t => {
                const days = Math.round(t.maxHours / 24);
                const label = days === 1 ? '1 DAY' : `${days} DAYS`;
                return { 
                    pct: t.percentage, 
                    label,
                    color: getRowColor(t.percentage)
                };
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
            <motion.div
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: "absolute", inset: 0,
                    borderRadius: "24px",
                    padding: "1px",
                    background: `linear-gradient(120deg, ${ambient}60, ${ambient}15, ${ambient}60)`,
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    pointerEvents: "none",
                }}
            />

            <div style={{
                background: "linear-gradient(135deg, #1C1C1E 0%, #161618 100%)",
                borderRadius: "23px",
                padding: "14px 20px 12px",
                textAlign: "center",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
                position: "relative",
                overflow: "hidden",
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: `radial-gradient(ellipse at 50% 0%, ${current.color}15 0%, transparent 65%)`,
                    pointerEvents: "none",
                }} />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "8px" }}>
                    <motion.span
                        animate={{ scale: [1, 1.18, 1], rotate: [0, -8, 8, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        style={{ fontSize: "18px", lineHeight: 1 }}
                    >??</motion.span>
                    <span style={{
                        fontSize: "10px", fontWeight: 900,
                        letterSpacing: "0.22em", textTransform: "uppercase",
                        color: ambient, opacity: 0.9,
                    }}>NEXT VISIT GIFT</span>
                </div>

                <div style={{ height: "36px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ y: 18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -18, opacity: 0 }}
                            transition={{ duration: 0.38, ease: "easeOut" }}
                            style={{ display: "flex", alignItems: "baseline", gap: "6px", position: "absolute" }}
                        >
                            <span style={{
                                fontSize: activeIdx === 0 ? "28px" : "22px",
                                fontWeight: 900,
                                color: current.color,
                                letterSpacing: "-1px",
                                textShadow: `0 0 20px ${current.color}50`,
                                transition: 'all 0.3s'
                            }}>{current.pct}%</span>
                            <span style={{
                                fontSize: "11px", fontWeight: 700,
                                color: current.color,
                                opacity: 0.7,
                                textTransform: "uppercase", letterSpacing: "0.12em",
                            }}>OFF • IN {current.label}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div style={{ display: "flex", gap: "5px", justifyContent: "center", marginTop: "10px" }}>
                    {rows.map((r, i) => (
                        <motion.div
                            key={i}
                            animate={{ 
                                width: i === activeIdx ? 16 : 5, 
                                opacity: i === activeIdx ? 1 : 0.3,
                                backgroundColor: i === activeIdx ? r.color : ambient
                            }}
                            transition={{ duration: 0.3 }}
                            style={{ height: "4px", borderRadius: "9999px", background: ambient, cursor: "pointer" }}
                            onClick={() => setActiveIdx(i)}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};"""

pattern = r"// VIP Gift Teaser Component\s+const VipGiftTeaser =.*?};\n\n"
new_content = re.sub(pattern, NEW_COMPONENT + "\\n\\n", content, flags=re.DOTALL)

if new_content != content:
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("PATCH OK: VipGiftTeaser colors updated")
else:
    print("PATCH FAILED: Could not find anchor")
