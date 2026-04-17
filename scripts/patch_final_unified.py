import os
import re

def patch():
    path = r"c:\Sher_AI_Studio\projects\FriendlyCode\src\UnifiedActivation.jsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add imports
    content = content.replace(
        "import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';",
        "import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';"
    )

    # 2. Define the VipGiftTeaser component (using standard emoji and bullet)
    TEASER_CODE = """
// VIP Gift Teaser Component
const VipGiftTeaser = ({ tiers, ambientColor, discountValue }) => {
    const [activeIdx, setActiveIdx] = useState(0);

    const rows = React.useMemo(() => {
        if (!tiers || tiers.length === 0) return [];
        return [...tiers]
            .filter(t => t.maxHours > 0)
            .sort((a, b) => b.percentage - a.percentage)
            .map(t => {
                const days = Math.round(t.maxHours / 24);
                const label = days === 1 ? '1 DAY' : `${days} DAYS`;
                
                let tierColor = '#FF3131'; 
                if (t.percentage >= 20) tierColor = '#00FF41'; 
                else if (t.percentage >= 15) tierColor = '#FFD700'; 
                else if (t.percentage >= 10) tierColor = '#FF8800'; 
                
                return { pct: t.percentage, label, color: tierColor };
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
    const activeColor = current.color;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="w-full mb-4 relative"
        >
            <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.01, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: "absolute", inset: 0,
                    borderRadius: "24px",
                    padding: "1px",
                    background: `linear-gradient(120deg, ${activeColor}50, ${activeColor}10, ${activeColor}50)`,
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    pointerEvents: "none",
                }}
            />

            <div style={{
                background: "linear-gradient(135deg, #1C1C1E 0%, #0D0D0F 100%)",
                borderRadius: "23px",
                padding: "16px 20px 14px",
                textAlign: "center",
                boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
                position: "relative",
                overflow: "hidden",
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: `radial-gradient(circle at 50% 10%, ${activeColor}15 0%, transparent 70%)`,
                    pointerEvents: "none",
                }} />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "10px" }}>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        style={{ fontSize: "20px" }}
                    >\U0001F381</motion.div>
                    <span style={{
                        fontSize: "9px", fontWeight: 900,
                        letterSpacing: "0.25em", textTransform: "uppercase",
                        color: activeColor, opacity: 0.9,
                    }}>LOYALTY REWARD TEASER</span>
                </div>

                <div style={{ height: "40px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ y: 20, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -20, opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                            style={{ display: "flex", alignItems: "baseline", gap: "6px", position: "absolute" }}
                        >
                            <span style={{
                                fontSize: "32px",
                                fontWeight: 900,
                                color: activeColor,
                                letterSpacing: "-1px",
                                textShadow: `0 0 25px ${activeColor}40`,
                            }}>{current.pct}%</span>
                            <span style={{
                                fontSize: "12px", fontWeight: 800,
                                color: activeColor,
                                opacity: 0.8,
                                textTransform: "uppercase", letterSpacing: "0.1em",
                            }}>OFF \u2022 IN {current.label}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "12px" }}>
                    {rows.map((r, i) => (
                        <motion.div
                            key={i}
                            animate={{ 
                                width: i === activeIdx ? 18 : 6, 
                                opacity: i === activeIdx ? 1 : 0.25,
                                backgroundColor: i === activeIdx ? r.color : "#fff"
                            }}
                            transition={{ duration: 0.4 }}
                            style={{ height: "4px", borderRadius: "9999px", cursor: "pointer" }}
                            onClick={() => setActiveIdx(i)}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
"""
    content = content.replace("const UnifiedActivation = () => {", TEASER_CODE + "\nconst UnifiedActivation = () => {")

    # 3. Add tiers state
    content = content.replace(
        "const [ambientColor, setAmbientColor] = useState(getTierColor(discountValue));",
        "const [ambientColor, setAmbientColor] = useState(getTierColor(discountValue));\n    const [tiers, setTiers] = useState([]);"
    )

    # 4. Fetch tiers in useEffect
    OLD_EFFECT = """        if (venueId) {
            getDoc(doc(db, 'venues', venueId)).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    setVenueName(data.name);
                    setVenueSettings({
                        loyaltyInterval: data.loyaltyInterval || 1,
                        googleReviewLink: data.googleReviewLink || data.linkUrl || ''
                    });
                }
            });
        }"""
    
    NEW_EFFECT = """        if (venueId) {
            getDoc(doc(db, 'venues', venueId)).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    setVenueName(data.name);
                    setVenueSettings({
                        loyaltyInterval: data.loyaltyInterval || 1,
                        googleReviewLink: data.googleReviewLink || data.linkUrl || ''
                    });
                }
            });

            getDocs(query(collection(db, 'venues', venueId, 'tiers'), orderBy('percentage', 'desc'))).then(snap => {
                setTiers(snap.docs.map(d => d.data()));
            });
        }"""
    content = content.replace(OLD_EFFECT, NEW_EFFECT)

    # 5. Replace VIP Milestone block
    # Match from {/* VIP Milestone */} until nearest secondary div closing
    pattern = r"\{/\* VIP Milestone \*/\}.*?</motion\.div>"
    replacement = "<VipGiftTeaser tiers={tiers} ambientColor={ambientColor} discountValue={discountValue} />"
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    # Final cleanup of surrogate pairs / escapes
    content = content.replace("\\U0001F381", "\U0001f381").replace("\\u2022", "\u2022")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("UnifiedActivation patched successfully")

if __name__ == "__main__":
    patch()
