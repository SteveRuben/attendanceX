import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loading from '@/components/common/Loading';
import { authService } from '@/services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success('Email de récupération envoyé !');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute top-32 left-1/2 w-96 h-96 bg-accent/20 rounded-full filter blur-3xl animate-float"></div>
        
        <div className="max-w-md w-full mx-6 relative z-10">
          <div className="glass p-8 rounded-3xl animate-slide-up text-center">
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Email envoyé !</h2>
            <p className="text-gray-400 mb-6">
              Nous avons envoyé un lien de récupération à <strong>{email}</strong>
            </p>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-6">
              <p className="text-sm text-blue-400">
                💡 <strong>Astuce :</strong> Vérifiez vos spams si vous ne recevez pas l'email dans les 5 minutes.
              </p>
            </div>
            <Link
              to="/login"
              className="btn-primary w-full flex items-center justify-center"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="absolute top-32 left-1/2 w-96 h-96 bg-accent/20 rounded-full filter blur-3xl animate-float"></div>
      
      <div className="max-w-md w-full mx-6 relative z-10">
        <div className="glass p-8 rounded-3xl animate-slide-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">🔐</span>
            </div>
            <h2 className="text-3xl font-bold text-white">Mot de passe oublié</h2>
            <p className="text-gray-400 mt-2">
              Entrez votre email pour recevoir un lien de récupération
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field focus:border-accent focus:ring-accent/20"
                placeholder="votre@email.com"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/80 text-white py-3 rounded-lg font-semibold transition transform hover:scale-105 flex items-center justify-center"
            >
              {loading ? <Loading size="sm" /> : 'Envoyer le lien de récupération'}
            </button>
          </form>
          
          {/* Footer */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-semibold transition"
            >
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;