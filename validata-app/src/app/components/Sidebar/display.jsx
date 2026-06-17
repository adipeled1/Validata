
import { LogOut } from 'lucide-react';

// Pure presentational component
const SidebarDisplay = ({ currentView, onNavigate, navItems, userRole, currentUserEmail, onLogout }) => {
  const initial = currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'U';
  const roleName = userRole === 'mentor' ? 'Project Mentor' : 'Team Member';

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shadow-xl z-10 relative">
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <img src="/favicon.png" alt="Validata Logo" className="w-10 h-10 object-contain drop-shadow-md" />
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
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left cursor-pointer ${isActive
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

      {/* User Session and Logout Section */}
      <div className="p-4 bg-slate-950 text-sm flex items-center justify-between gap-2 border-t border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors flex items-center justify-center text-slate-300 font-bold">
            {initial}
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-slate-200 truncate" title={currentUserEmail || 'User'}>
              {currentUserEmail || 'User'}
            </p>
            <p className="text-xs text-slate-400 truncate">{roleName}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Log Out"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};

export default SidebarDisplay;

