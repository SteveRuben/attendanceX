import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="glass border-b border-gray-700/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">AttendanceX</h1>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          
          <div className="flex items-center space-x-2">
            <img 
              src={user?.photoURL || '/default-avatar.png'} 
              alt="Avatar"
              className="w-8 h-8 rounded-full"
            />
            <span className="text-white">{user?.firstName}</span>
          </div>
          
          <button
            onClick={logout}
            className="text-red-400 hover:text-red-300 transition"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;