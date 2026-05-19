import React from 'react';

// Pure presentational component
const SidebarDisplay = ({ currentView, onNavigate, navItems }) => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shadow-xl z-10 relative">
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white shadow-lg">
          V
        </div>
        <h1 className="text-2xl font-bold tracking-wide">Validata</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-800 text-slate-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 bg-slate-950 text-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
          R
        </div>
        <div>
          <p className="font-bold text-slate-200">Dr. Researcher</p>
          <p className="text-xs text-slate-400">Lead Investigator</p>
        </div>
      </div>
    </aside>
  );
};

export default SidebarDisplay;
