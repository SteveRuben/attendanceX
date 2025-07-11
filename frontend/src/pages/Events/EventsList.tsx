import { Link } from 'react-router-dom';

const EventsList = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Événements</h1>
        <Link
          to="/events/create"
          className="btn-primary flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Créer un événement</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <select className="input-field w-auto">
            <option>Tous les types</option>
            <option>Réunion</option>
            <option>Formation</option>
            <option>Conférence</option>
          </select>
          <select className="input-field w-auto">
            <option>Tous les statuts</option>
            <option>À venir</option>
            <option>En cours</option>
            <option>Terminé</option>
          </select>
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="input-field w-auto"
          />
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((event) => (
          <div key={event} className="card hover:bg-white/15 transition">
            <div className="flex items-start justify-between mb-4">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                Réunion
              </span>
              <span className="text-sm text-gray-400">15 Nov 2024</span>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              Réunion équipe développement
            </h3>
            
            <p className="text-gray-400 text-sm mb-4">
              Point hebdomadaire sur l'avancement des projets en cours.
            </p>
            
            <div className="space-y-2 text-sm text-gray-400 mb-4">
              <div className="flex items-center">
                <span className="mr-2">🕐</span>
                <span>14:00 - 15:30</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">📍</span>
                <span>Salle de réunion A</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">👥</span>
                <span>12/15 participants</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Link 
                to={`/events/${event}`}
                className="flex-1 bg-primary-500 hover:bg-primary-600 text-white text-center py-2 rounded-lg transition"
              >
                Voir détails
              </Link>
              <Link 
                to={`/attendance/mark/${event}`}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-center py-2 rounded-lg transition"
              >
                Présence
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsList;