import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/events', label: 'Événements', icon: '📅' },
    { path: '/attendance', label: 'Présences', icon: '✅' },
    { path: '/users', label: 'Utilisateurs', icon: '👥' },
    { path: '/reports', label: 'Rapports', icon: '📈' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/admin', label: 'Administration', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 glass border-r border-gray-700/50">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center animate-glow">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-xl font-bold text-white">AttendanceX</span>
        </div>
        
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg transition ${
                location.pathname === item.path
                  ? 'bg-primary-500/20 text-primary-400 border-l-4 border-primary-500'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;