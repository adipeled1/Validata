import { Info } from 'lucide-react';

// Info icon that reveals a tooltip on hover — for unfamiliar metric names
const InfoTooltip = ({ text }) => (
  <div className="relative group inline-flex items-start shrink-0 cursor-help ml-1 mt-0.5">
    <Info className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
    <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none leading-relaxed whitespace-normal">
      {text}
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
    </div>
  </div>
);

export default InfoTooltip;
