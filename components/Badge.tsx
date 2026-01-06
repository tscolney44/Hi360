
import React from 'react';

interface BadgeProps {
  label: string;
  type: 'hi-res' | 'lossless' | 'standard';
}

const Badge: React.FC<BadgeProps> = ({ label, type }) => {
  if (type === 'hi-res') {
    return (
      <span className="px-1.5 py-0.5 rounded-sm bg-[#e5a00d] text-black text-[9px] font-black uppercase tracking-tighter">
        MAX
      </span>
    );
  }

  if (type === 'lossless') {
    return (
      <span className="px-1.5 py-0.5 rounded-sm border border-[#00f0ff] text-[#00f0ff] text-[9px] font-black uppercase tracking-tighter">
        HI-FI
      </span>
    );
  }

  return (
    <span className="px-1.5 py-0.5 rounded-sm bg-zinc-800 text-zinc-400 text-[9px] font-bold uppercase tracking-tighter">
      {label}
    </span>
  );
};

export default Badge;
