import re

FILE_PATH = r"c:\Sher_AI_Studio\projects\FriendlyCode\src\NewQRPage.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# -----------------------------------------------
# PATCH 1: Add hasInteracted state
# -----------------------------------------------
OLD_STATE_ANCHOR = "const [minDelayPassed, setMinDelayPassed] = useState(false);"
NEW_STATE = "\\n    const [hasInteracted, setHasInteracted] = useState(false);"

if OLD_STATE_ANCHOR in content and NEW_STATE not in content:
    content = content.replace(OLD_STATE_ANCHOR, OLD_STATE_ANCHOR + NEW_STATE)
    print("PATCH 1 OK: hasInteracted state added")

# -----------------------------------------------
# PATCH 2: Add interaction effect
# -----------------------------------------------
EFFECT_ANCHOR = "useEffect(() => { statusRef.current = status; }, [status]);"
NEW_EFFECT = """
    useEffect(() => {
        if (hasInteracted) return;
        
        const handleInteraction = () => {
            if (window.scrollY > 5) setHasInteracted(true);
        };
        const handleTouch = () => setHasInteracted(true);
        
        // Also show after 3 seconds as a fallback
        const timer = setTimeout(() => setHasInteracted(true), 3000);

        window.addEventListener('scroll', handleInteraction);
        window.addEventListener('touchmove', handleTouch);
        return () => {
            window.removeEventListener('scroll', handleInteraction);
            window.removeEventListener('touchmove', handleTouch);
            clearTimeout(timer);
        };
    }, [hasInteracted]);"""

if EFFECT_ANCHOR in content and "handleInteraction" not in content:
    content = content.replace(EFFECT_ANCHOR, EFFECT_ANCHOR + NEW_EFFECT)
    print("PATCH 2 OK: interaction logic added")

# -----------------------------------------------
# PATCH 3: Replace Sticky CTA with Floating CTA
# -----------------------------------------------
OLD_CTA = """            {/* Sticky CTA (iOS Prominent Modal Button) */}
            <div className="sticky bottom-0 left-0 w-full p-6 pt-10 bg-gradient-to-t from-black via-black/95 to-transparent z-40 flex justify-center mt-auto">
                <button
                    onClick={() => {
                        const guestEmail = safeStorage.getItem('guestEmail');
                        if (guestName || guestEmail) {
                            navigate('/thank-you', { state: { guestName: guestName || 'Friend', guestEmail, discountValue: discount, venueId: safeStorage.getItem('currentVenueId'), userRole } });
                        } else {
                            navigate('/activate', { state: { discount, guestName, userRole } });
                        }
                    }}
                    className="w-full max-w-[400px] h-[56px] text-black bg-white rounded-[20px] font-bold text-[17px] active:scale-[0.97] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                >
                    {(guestName || safeStorage.getItem('guestEmail')) ? t('get_my_reward', 'Get My Reward') : t('get_my_discount')}
                </button>
            </div>"""

NEW_CTA = """            {/* Floating CTA (iOS Prominent Modal Button) */}
            <AnimatePresence>
                {hasInteracted && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 w-full p-6 pt-10 bg-gradient-to-t from-black via-black/95 to-transparent z-[100] flex justify-center"
                    >
                        <button
                            onClick={() => {
                                const guestEmail = safeStorage.getItem('guestEmail');
                                if (guestName || guestEmail) {
                                    navigate('/thank-you', { state: { guestName: guestName || 'Friend', guestEmail, discountValue: discount, venueId: safeStorage.getItem('currentVenueId'), userRole } });
                                } else {
                                    navigate('/activate', { state: { discount, guestName, userRole } });
                                }
                            }}
                            className="w-full max-w-[400px] h-[56px] text-black bg-white rounded-[20px] font-bold text-[17px] active:scale-[0.97] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.18)] flex items-center justify-center gap-2"
                        >
                            <FontAwesomeIcon icon={faGift} className="text-[14px] opacity-70" />
                            {(guestName || safeStorage.getItem('guestEmail')) ? t('get_my_reward', 'Get My Reward') : t('get_my_discount')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>"""

if OLD_CTA in content:
    content = content.replace(OLD_CTA, NEW_CTA)
    print("PATCH 3 OK: CTA replaced with floating version")
else:
    # Handle minor whitespace variations
    pattern = re.escape(OLD_CTA).replace(r"\\ ", r"\\s+").replace(r"\\n", r"\\s*\\n\\s*")
    content = re.sub(pattern, NEW_CTA, content, flags=re.DOTALL)
    print("PATCH 3 OK (REGEX): CTA replaced")

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("\\nNewQRPage patched successfully!")
