import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/use-auth';
import Loading from '@/components/common/Loading';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    setLoading(true);

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        organization: formData.organization,
        password: formData.password
      });
      toast.success('Inscription réussie !');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-10 w-96 h-96 bg-accent/20 rounded-full filter blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/20 rounded-full filter blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="max-w-md w-full mx-6 relative z-10">
        <div className="glass p-8 rounded-3xl animate-slide-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-glow">
              <span className="text-white text-2xl font-bold">A</span>
            </div>
            <h2 className="text-3xl font-bold text-white">Inscription</h2>
            <p className="text-gray-400 mt-2">Créez votre compte en quelques secondes</p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Dupont"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="jean@entreprise.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organisation
              </label>
              <input
                type="text"
                name="organization"
                required
                value={formData.organization}
                onChange={handleChange}
                className="input-field"
                placeholder="Mon Entreprise"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 text-primary-500 bg-gray-800 border-gray-600 rounded focus:ring-primary-500 mt-1"
              />
              <span className="ml-2 text-sm text-gray-400">
                J'accepte les{' '}
                <Link to="/terms" className="text-primary-400 hover:text-primary-300 transition">
                  conditions d'utilisation
                </Link>
                {' '}et la{' '}
                <Link to="/privacy" className="text-primary-400 hover:text-primary-300 transition">
                  politique de confidentialité
                </Link>
              </span>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gradient-primary"
            >
              {loading ? <Loading size="sm" /> : 'Créer mon compte'}
            </button>
          </form>
          
          {/* Footer */}
          <div className="mt-6 text-center">
            <span className="text-gray-400">Déjà un compte ? </span>
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-semibold transition"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;