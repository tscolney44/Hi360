
import React from 'react';

interface DonateButtonProps {
  compact?: boolean;
}

const DonateButton: React.FC<DonateButtonProps> = ({ compact }) => {
  const paypalUrl = "https://www.paypal.me/tscolney";

  if (compact) {
    return (
      <a 
        href={paypalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden md:flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/30 transition-all active:scale-95"
      >
        <i className="fab fa-paypal"></i>
        Donate
      </a>
    );
  }

  return (
    <a 
      href={paypalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-slate-900 px-6 py-3 rounded-2xl font-bold shadow-xl shadow-amber-500/20 transition-all active:scale-95"
    >
      <i className="fab fa-paypal text-xl"></i>
      Support Development
    </a>
  );
};

export default DonateButton;
