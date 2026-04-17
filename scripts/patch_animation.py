import codecs
import os
import re

FILE_PATH = r"c:\Sher_AI_Studio\projects\FriendlyCode\src\ScanInstructionAnimation.jsx"

if not os.path.exists(FILE_PATH):
    print(f"Error: File not found at {FILE_PATH}")
    exit(1)

with codecs.open(FILE_PATH, "r", "utf-8") as f:
    content = f.read()

# 1. Insert Silhouette Component after imports
target_imports = "import { useTranslation } from 'react-i18next';"
replacement_imports = """import { useTranslation } from 'react-i18next';

const WaiterSilhouette = ({ color, isActive }) => (
    <motion.div
        animate={{ 
            opacity: isActive ? 0.3 : 0.05,
            x: isActive ? 0 : 20,
            scale: isActive ? 1.1 : 1,
        }}
        transition={{ duration: 0.8 }}
        style={{
            position: 'absolute',
            right: '-10px',
            bottom: '-20px',
            zIndex: 1,
            pointerEvents: 'none',
        }}
    >
        <svg width="160" height="220" viewBox="0 0 120 150" fill="none">
            <circle cx="60" cy="30" r="25" fill={color} />
            <path d="M60 65C30 65 5 100 5 150H115C115 100 90 65 60 65Z" fill={color} />
        </svg>
    </motion.div>
);"""

if target_imports in content:
    content = content.replace(target_imports, replacement_imports)

# 2. Update frames for interaction
target_frames_pattern = r"const frames = \[.*?\];"
replacement_frames = """const frames = [
        {
            phone: { x: 0, y: 0, rotate: 0, scale: 1.15, opacity: 1 },
            text: t('instruction_hold', 'Возьмите телефон'),
            screenActive: true,
            success: false,
            waiterActive: false,
        },
        {
            phone: { x: 45, y: -10, rotate: 12, scale: 1.25, opacity: 1 },
            text: t('instruction_show', 'Покажите на кассе'),
            screenActive: true,
            success: false,
            waiterActive: true,
        },
        {
            phone: { x: 30, y: 5, rotate: 8, scale: 1.2, opacity: 1 },
            text: t('instruction_redeem', 'Получите награду'),
            screenActive: true,
            success: false,
            waiterActive: true,
        },
        {
            phone: { x: 0, y: 0, rotate: 0, scale: 1.0, opacity: 0.1 },
            text: t('instruction_success', 'Готово!'),
            screenActive: false,
            success: true,
            waiterActive: false,
        },
    ];"""

content = re.sub(target_frames_pattern, replacement_frames, content, flags=re.DOTALL)

# 3. Insert Silhouette Call in JSX
target_line = '<div className="relative w-full h-[240px] flex flex-col items-center justify-center overflow-hidden rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">'
if target_line in content:
    content = content.replace(target_line, target_line + "\\n            \\n            <WaiterSilhouette color={color} isActive={current.waiterActive} />")

with codecs.open(FILE_PATH, "w", "utf-8") as f:
    f.write(content)

print("Successfully patched ScanInstructionAnimation.jsx")
