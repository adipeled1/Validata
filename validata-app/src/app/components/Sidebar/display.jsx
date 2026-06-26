
import { LogOut, Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

// Pure presentational component
const SidebarDisplay = ({ currentView, onNavigate, navItems, userRole, currentUserEmail, onLogout, isExpanded, onToggleExpanded }) => {
  const { theme, toggleTheme } = useTheme();
  const initial = currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'U';
  const roleName = userRole === 'mentor' ? 'Project Mentor' : 'Team Member';
  // Same collapse/expand toggle on every screen size: collapsed = slim icon-only rail,
  // expanded = full labeled sidebar. Always in-flow (pushes content) — never an
  // overlay, so there's no backdrop/shadowing of the rest of the app.
  const showLabels = isExpanded;

  return (
    <>
    <aside
      className={`hidden md:flex md:flex-col ${isExpanded ? 'w-64' : 'w-16'} bg-slate-900 text-slate-100 shadow-xl relative shrink-0 transition-[width] duration-200`}
    >
        <div className={`p-3 border-b border-slate-700 flex items-center gap-2 ${showLabels ? 'flex-row justify-between' : 'flex-col'}`}>
          <div className={`flex items-center gap-3 overflow-hidden ${showLabels ? '' : 'flex-col'}`}>
            <img src="/favicon.png" alt="Validata Logo" className="w-8 h-8 object-contain drop-shadow-md shrink-0" />
            <h1 className={`text-2xl font-bold tracking-wide whitespace-nowrap ${showLabels ? 'inline' : 'hidden'}`}>Validata</h1>
          </div>
          <button
            onClick={onToggleExpanded}
            title={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            {isExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left cursor-pointer ${showLabels ? '' : 'justify-center'} ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-800 text-slate-100'
                  }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={`whitespace-nowrap ${showLabels ? 'inline' : 'hidden'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Session and Logout Section */}
        <div className={`p-2 bg-slate-950 text-sm flex items-center gap-2 border-t border-slate-800 ${showLabels ? 'justify-between' : 'flex-col'}`}>
          <div className={`flex items-center gap-3 overflow-hidden ${showLabels ? '' : 'justify-center'}`}>
            <div className="w-10 h-10 shrink-0 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors flex items-center justify-center text-slate-300 font-bold">
              {initial}
            </div>
            <div className={`overflow-hidden ${showLabels ? 'block' : 'hidden'}`}>
              <p className="font-bold text-slate-200 truncate" title={currentUserEmail || 'User'}>
                {currentUserEmail || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{roleName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 text-slate-400 hover:text-amber-300 hover:bg-slate-900 rounded-lg transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={onLogout}
              title="Log Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
    </aside>

    {/* Mobile bottom tab bar — replaces the rail below md; horizontally
        scrollable so it scales with role-dependent item counts */}
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900 text-slate-100 border-t border-slate-700 flex items-stretch overflow-x-auto pb-[env(safe-area-inset-bottom)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.label}
            className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1 py-2.5 cursor-pointer ${isActive ? 'text-blue-400' : 'text-slate-400'}`}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="flex-1 min-w-[64px] flex flex-col items-center justify-center py-2.5 text-slate-400 cursor-pointer"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <button
        onClick={onLogout}
        title="Log Out"
        className="flex-1 min-w-[64px] flex flex-col items-center justify-center py-2.5 text-rose-400 cursor-pointer"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </nav>
    </>
  );
};

export default SidebarDisplay;

