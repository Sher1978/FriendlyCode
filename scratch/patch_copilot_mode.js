import fs from 'fs';

const path = 'c:/Sher_AI_Studio/projects/FriendlyCode/src/GbpDashboard.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add import ManagerDelegationModal at the top
if (!code.includes("import ManagerDelegationModal")) {
  code = `import ManagerDelegationModal from './ManagerDelegationModal';\n` + code;
}

// 2. Add state for isManagerModalOpen
const stateTarget = "const [showVenuePopup, setShowVenuePopup] = useState(false);";
if (!code.includes("isManagerModalOpen")) {
  code = code.replace(stateTarget, `${stateTarget}\n  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);`);
}

// 3. Add handleCopyText helper
const copyHelper = `
  const handleCopyText = (text, label = 'Текст') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(\`📋 \${label} скопирован в буфер обмена!\`);
  };
`;

if (!code.includes("handleCopyText")) {
  const toastTarget = "const showToast = (msg) => {";
  code = code.replace(toastTarget, `${copyHelper}\n  ${toastTarget}`);
}

// 4. Add ManagerDelegationModal render component at the bottom of modals
const modalTarget = "{/* VENUE POPUP */}";
const managerModalJsx = `<ManagerDelegationModal isOpen={isManagerModalOpen} onClose={() => setIsManagerModalOpen(false)} onToast={showToast} />\n\n        ${modalTarget}`;

if (!code.includes("<ManagerDelegationModal")) {
  code = code.replace(modalTarget, managerModalJsx);
}

// 5. Add "Передать доступ агентству" button into the main venue card action bar
const buttonBarTarget = `<button\n                      onClick={() => setShowVenuePopup(true)}`;
const newButtons = `<button
                      onClick={() => setIsManagerModalOpen(true)}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                    >🤝 Передать доступ</button>
                    ${buttonBarTarget}`;

if (!code.includes("Передать доступ")) {
  code = code.replace(buttonBarTarget, newButtons);
}

// 6. Add 1-Click Copy button to editableDesc section if present
const descTarget = `<button
                                onClick={handlePatchGoogleApi}`;

const descCopyButtons = `<div className="flex items-center gap-2 mb-3">
                              <button
                                onClick={() => handleCopyText(editableDesc, 'ИИ-Описание')}
                                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-xl transition flex items-center gap-1"
                              >
                                📋 Скопировать ИИ-описание
                              </button>
                              <a
                                href="https://business.google.com"
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1"
                              >
                                ↗️ Открыть в Google Business
                              </a>
                            </div>
                            ${descTarget}`;

if (!code.includes("Скопировать ИИ-описание")) {
  code = code.replace(descTarget, descCopyButtons);
}

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully patched GbpDashboard.jsx with Copilot Mode & Manager Delegation!");
