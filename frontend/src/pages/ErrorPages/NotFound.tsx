import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-gradient-to-r from-primary-500 to-secondary bg-clip-text">
            404
          </h1>
          <h2 className="text-3xl font-bold text-white mt-4">Page non trouvée</h2>
          <p className="text-gray-400 mt-2 max-w-md mx-auto">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>
        
        <div className="space-x-4">
          <Link
            to="/"
            className="btn-primary inline-flex items-center"
          >
            🏠 Retour à l'accueil
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-outline inline-flex items-center"
          >
            ← Page précédente
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;