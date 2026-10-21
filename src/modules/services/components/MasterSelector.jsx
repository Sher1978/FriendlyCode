import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faStar, faUsers } from '@fortawesome/free-solid-svg-icons';

export const MasterSelector = ({ 
  staff = [], 
  selectedStaffId, 
  onSelectStaff 
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span className="font-semibold text-white/90">Выберите специалиста</span>
        <span className="text-[11px] text-white/40">или выберите любого мастера</span>
      </div>

      <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {/* Option 1: Any available master */}
        <div
          onClick={() => onSelectStaff({ id: 'any', name: 'Любой свободный мастер', role: 'Рекомендуется для лучших слотов' })}
          className={`shrink-0 w-36 p-3 rounded-2xl cursor-pointer border transition-all text-center flex flex-col items-center justify-between ${
            selectedStaffId === 'any'
              ? 'bg-[#1C1C1E] border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.15)]'
              : 'bg-[#18181A]/70 hover:bg-[#1C1C1E] border-white/10'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00FF41]/20 to-[#007AFF]/20 border border-white/10 flex items-center justify-center text-[#00FF41] mb-2">
            <FontAwesomeIcon icon={faUsers} className="text-lg" />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">Любой мастер</div>
            <div className="text-[10px] text-[#00FF41] mt-0.5">Максимум окон</div>
          </div>
        </div>

        {/* Option 2..N: Individual staff members */}
        {staff.map(member => {
          const isSelected = selectedStaffId === member.id;
          const initials = member.name
            ? member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : 'M';

          return (
            <div
              key={member.id}
              onClick={() => onSelectStaff(member)}
              className={`shrink-0 w-36 p-3 rounded-2xl cursor-pointer border transition-all text-center flex flex-col items-center justify-between ${
                isSelected
                  ? 'bg-[#1C1C1E] border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.15)]'
                  : 'bg-[#18181A]/70 hover:bg-[#1C1C1E] border-white/10'
              }`}
            >
              {member.avatarUrl ? (
                <img 
                  src={member.avatarUrl} 
                  alt={member.name} 
                  className="w-12 h-12 rounded-full object-cover border border-white/10 mb-2"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/80 font-bold text-sm mb-2">
                  {initials}
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-white truncate max-w-[120px]">
                  {member.name}
                </div>
                <div className="text-[10px] text-white/50 truncate max-w-[120px] mt-0.5">
                  {member.role || 'Специалист'}
                </div>
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#FBBC04] mt-1 font-semibold">
                  <FontAwesomeIcon icon={faStar} className="text-[9px]" />
                  <span>{(member.rating || 5.0).toFixed(1)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
