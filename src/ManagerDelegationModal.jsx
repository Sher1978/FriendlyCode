import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManagerDelegationModal({ isOpen, onClose, onToast }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const managerEmail = 'manager@revoo-local.com'; // Сервисный email агентства

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(managerEmail);
    setCopiedEmail(true);
    if (onToast) onToast('📋 Email скопирован в буфер обмена!');
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090A0F]/90 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition"
          >
            ✕
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-black">
              🤝
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Передача прав Менеджера в Google</h3>
              <p className="text-xs text-slate-400">Инструкция: Как предоставить доступ нашему агентству за 30 секунд</p>
            </div>
          </div>

          {/* Email Copy Card */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Сервисный Email нашей платформы</div>
              <div className="text-sm font-mono text-amber-300 font-bold mt-1 select-all">{managerEmail}</div>
            </div>
            <button
              onClick={handleCopyEmail}
              className={`w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                copiedEmail
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
              }`}
            >
              <span>{copiedEmail ? '✅ Скопировано!' : '📋 Скопировать Email'}</span>
            </button>
          </div>

          {/* Step-by-Step Guide */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Инструкция из 4 простых шагов:</h4>

            {/* Step 1 */}
            <div className="flex gap-4 p-3.5 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                1
              </div>
              <div className="text-xs">
                <div className="font-bold text-white mb-0.5">Перейдите в консоль Google Business</div>
                <div className="text-slate-400">
                  Откройте личный кабинет{' '}
                  <a
                    href="https://business.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 underline font-semibold hover:text-blue-300"
                  >
                    business.google.com ↗
                  </a>{' '}
                  и выберите ваше заведение.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 p-3.5 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div className="text-xs">
                <div className="font-bold text-white mb-0.5">Откройте настройки доступа</div>
                <div className="text-slate-400">
                  Нажмите на 3 точки (вверху справа) →Выберите <span className="text-slate-200 font-semibold">«Настройки профиля бизнеса»</span> → <span className="text-slate-200 font-semibold">«Пользователи и доступ»</span>.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 p-3.5 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                3
              </div>
              <div className="text-xs">
                <div className="font-bold text-white mb-0.5">Вставьте наш Email и выберите роль</div>
                <div className="text-slate-400">
                  Нажмите <span className="text-slate-200 font-semibold">«Добавить»</span>, вставьте <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">{managerEmail}</code> и выберите роль <span className="text-emerald-300 font-bold">Менеджер (Manager)</span>.
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4 p-3.5 bg-slate-800/40 rounded-2xl border border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                4
              </div>
              <div className="text-xs">
                <div className="font-bold text-white mb-0.5">Нажмите «Пригласить»</div>
                <div className="text-slate-400">
                  Готово! Наша система моментально получит приглашение и подхватит управление вашим заведением.
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              🛡️ Ваши данные защищены. Вы сможете отказать в доступе в любой момент.
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
            >
              Понятно
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
