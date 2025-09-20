/**
 * Centre d'aide intégré à l'application
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription
} from '../components/ui';
import {
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Play,
  FileText,
  Lightbulb
} from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  rating: number;
  views: number;
  lastUpdated: Date;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export const HelpCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [supportDialog, setSupportDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);

  // États pour le support
  const [supportTicket, setSupportTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as const,
    category: 'general'
  });

  // États pour le feedback
  const [feedback, setFeedback] = useState({
    type: 'suggestion' as 'bug' | 'suggestion' | 'compliment',
    message: '',
    rating: 5
  });

  // Données simulées
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'Comment pointer mon arrivée ?',
      content: 'Pour pointer votre arrivée, cliquez sur le bouton "Pointer l\'arrivée" sur votre dashboard...',
      category: 'Pointage',
      tags: ['pointage', 'arrivée', 'géolocalisation'],
      rating: 4.8,
      views: 1250,
      lastUpdated: new Date('2024-01-10')
    },
    {
      id: '2',
      title: 'Problèmes de géolocalisation',
      content: 'Si vous rencontrez des problèmes de géolocalisation, vérifiez d\'abord que...',
      category: 'Technique',
      tags: ['géolocalisation', 'problème', 'mobile'],
      rating: 4.5,
      views: 890,
      lastUpdated: new Date('2024-01-08')
    },
    {
      id: '3',
      title: 'Demander des congés',
      content: 'Pour soumettre une demande de congé, accédez à l\'onglet "Congés"...',
      category: 'Congés',
      tags: ['congés', 'demande', 'validation'],
      rating: 4.9,
      views: 2100,
      lastUpdated: new Date('2024-01-12')
    }
  ];

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'Puis-je pointer depuis plusieurs appareils ?',
      answer: 'Oui, vous pouvez utiliser plusieurs appareils, mais un seul pointage par période est autorisé.',
      category: 'Pointage',
      helpful: 45,
      notHelpful: 3
    },
    {
      id: '2',
      question: 'Comment corriger un oubli de pointage ?',
      answer: 'Contactez votre manager pour une correction manuelle. Seuls les managers peuvent modifier les pointages.',
      category: 'Pointage',
      helpful: 67,
      notHelpful: 5
    },
    {
      id: '3',
      question: 'Mes données sont-elles sécurisées ?',
      answer: 'Oui, toutes vos données sont chiffrées et stockées selon les normes GDPR.',
      category: 'Sécurité',
      helpful: 89,
      notHelpful: 2
    }
  ];

  const quickActions = [
    {
      title: 'Guide de démarrage',
      description: 'Premiers pas avec AttendanceX',
      icon: <Book className="h-5 w-5" />,
      action: () => setSelectedArticle(helpArticles[0])
    },
    {
      title: 'Vidéos tutoriels',
      description: 'Apprenez en regardant',
      icon: <Play className="h-5 w-5" />,
      action: () => window.open('https://videos.attendancex.com', '_blank')
    },
    {
      title: 'Contacter le support',
      description: 'Obtenez de l\'aide personnalisée',
      icon: <MessageCircle className="h-5 w-5" />,
      action: () => setSupportDialog(true)
    },
    {
      title: 'Signaler un bug',
      description: 'Aidez-nous à améliorer l\'app',
      icon: <AlertTriangle className="h-5 w-5" />,
      action: () => {
        setFeedback(prev => ({ ...prev, type: 'bug' }));
        setFeedbackDialog(true);
      }
    }
  ];

  // Recherche d'articles
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = helpArticles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const submitSupportTicket = async () => {
    if (!supportTicket.subject.trim() || !supportTicket.description.trim()) {
      return;
    }

    try {
      // Simuler l'envoi du ticket
      console.log('Support ticket submitted:', supportTicket);
      
      // Reset form
      setSupportTicket({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'general'
      });
      
      setSupportDialog(false);
      
      // Afficher confirmation
      alert('Votre demande de support a été envoyée. Vous recevrez une réponse sous 24h.');
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
    }
  };

  const submitFeedback = async () => {
    if (!feedback.message.trim()) {
      return;
    }

    try {
      // Simuler l'envoi du feedback
      console.log('Feedback submitted:', feedback);
      
      // Reset form
      setFeedback({
        type: 'suggestion',
        message: '',
        rating: 5
      });
      
      setFeedbackDialog(false);
      
      // Afficher confirmation
      alert('Merci pour votre feedback ! Il nous aide à améliorer l\'application.');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const markHelpful = (faqId: string, helpful: boolean) => {
    // Simuler le vote
    console.log(`FAQ ${faqId} marked as ${helpful ? 'helpful' : 'not helpful'}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <HelpCircle className="h-12 w-12 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold">Centre d'aide</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Trouvez rapidement les réponses à vos questions ou contactez notre équipe de support
        </p>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={action.action}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-3">
                {action.icon}
              </div>
              <h3 className="font-medium mb-1">{action.title}</h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contenu principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Recherche</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        {/* Onglet Recherche */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rechercher dans l'aide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tapez votre question ou mot-clé..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="font-medium">Résultats de recherche ({searchResults.length})</h3>
                  {searchResults.map((article) => (
                    <div
                      key={article.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{article.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {article.content.substring(0, 150)}...
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                              {article.rating}
                            </span>
                            <span>{article.views} vues</span>
                            <Badge variant="outline">{article.category}</Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {searchQuery && searchResults.length === 0 && (
                <div className="mt-4 text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2" />
                  <p>Aucun résultat trouvé pour "{searchQuery}"</p>
                  <p className="text-sm">Essayez avec d'autres mots-clés ou contactez le support</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet FAQ */}
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Questions fréquemment posées</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center justify-between w-full mr-4">
                        <span>{faq.question}</span>
                        <Badge variant="outline">{faq.category}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <p>{faq.answer}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground">Cette réponse vous a-t-elle aidé ?</span>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markHelpful(faq.id, true)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                {faq.helpful}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markHelpful(faq.id, false)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                {faq.notHelpful}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Guides */}
        <TabsContent value="guides" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {helpArticles.map((article) => (
              <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => setSelectedArticle(article)}>
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline">{article.category}</Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                      {article.rating}
                    </div>
                  </div>
                  <h3 className="font-medium mb-2">{article.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {article.content.substring(0, 100)}...
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{article.views} vues</span>
                    <span>Mis à jour le {article.lastUpdated.toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Contact */}
        <TabsContent value="contact" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Support technique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">support@attendancex.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Téléphone</p>
                    <p className="text-sm text-muted-foreground">01 23 45 67 89</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Horaires</p>
                    <p className="text-sm text-muted-foreground">Lun-Ven 9h-18h</p>
                  </div>
                </div>
                <Button onClick={() => setSupportDialog(true)} className="w-full">
                  Créer un ticket de support
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Aidez-nous à améliorer AttendanceX en partageant vos suggestions et en signalant les problèmes.
                </p>
                <Button onClick={() => setFeedbackDialog(true)} variant="outline" className="w-full">
                  Envoyer un feedback
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ressources utiles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="https://docs.attendancex.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-5 w-5 mr-3 text-blue-600" />
                  <div>
                    <p className="font-medium">Documentation</p>
                    <p className="text-sm text-muted-foreground">Guide complet</p>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                </a>
                
                <a
                  href="https://videos.attendancex.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Play className="h-5 w-5 mr-3 text-red-600" />
                  <div>
                    <p className="font-medium">Vidéos tutoriels</p>
                    <p className="text-sm text-muted-foreground">Apprenez visuellement</p>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                </a>
                
                <a
                  href="https://status.attendancex.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                  <div>
                    <p className="font-medium">Statut du service</p>
                    <p className="text-sm text-muted-foreground">Disponibilité en temps réel</p>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de support */}
      <Dialog open={supportDialog} onOpenChange={setSupportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un ticket de support</DialogTitle>
            <DialogDescription>
              Décrivez votre problème en détail pour que nous puissions vous aider rapidement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Sujet</label>
              <Input
                value={supportTicket.subject}
                onChange={(e) => setSupportTicket(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Résumé de votre problème"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Catégorie</label>
                <Select
                  value={supportTicket.category}
                  onValueChange={(value) => setSupportTicket(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Général</SelectItem>
                    <SelectItem value="pointage">Pointage</SelectItem>
                    <SelectItem value="conges">Congés</SelectItem>
                    <SelectItem value="technique">Technique</SelectItem>
                    <SelectItem value="compte">Compte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priorité</label>
                <Select
                  value={supportTicket.priority}
                  onValueChange={(value) => setSupportTicket(prev => ({ ...prev, priority: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={supportTicket.description}
                onChange={(e) => setSupportTicket(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez votre problème en détail..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupportDialog(false)}>
              Annuler
            </Button>
            <Button onClick={submitSupportTicket} disabled={!supportTicket.subject.trim() || !supportTicket.description.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de feedback */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer un feedback</DialogTitle>
            <DialogDescription>
              Votre avis nous aide à améliorer AttendanceX.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type de feedback</label>
              <Select
                value={feedback.type}
                onValueChange={(value) => setFeedback(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="bug">Signaler un bug</SelectItem>
                  <SelectItem value="compliment">Compliment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={feedback.message}
                onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Partagez votre feedback..."
                rows={4}
              />
            </div>
            {feedback.type === 'compliment' && (
              <div>
                <label className="text-sm font-medium">Note (1-5 étoiles)</label>
                <div className="flex items-center space-x-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 cursor-pointer ${
                        star <= feedback.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                      onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialog(false)}>
              Annuler
            </Button>
            <Button onClick={submitFeedback} disabled={!feedback.message.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'article */}
      {selectedArticle && (
        <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedArticle.title}</span>
                <Badge variant="outline">{selectedArticle.category}</Badge>
              </DialogTitle>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {selectedArticle.rating}
                </span>
                <span>{selectedArticle.views} vues</span>
                <span>Mis à jour le {selectedArticle.lastUpdated.toLocaleDateString()}</span>
              </div>
            </DialogHeader>
            <div className="prose max-w-none">
              <p>{selectedArticle.content}</p>
              {/* Ici, vous pourriez rendre du contenu Markdown ou HTML */}
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Cet article vous a-t-il aidé ?</span>
                <Button variant="ghost" size="sm" className="text-green-600">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Oui
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600">
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Non
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedArticle.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};/**
 * Centre d'aide intégré à l'application
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription
} from '../components/ui';
import {
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Video,
  FileText,
  Phone,
  Mail,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Users,
  Settings,
  Smartphone,
  Monitor
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lastUpdated: Date;
  helpful: number;
  notHelpful: number;
  views: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  popularity: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export const HelpCenter: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [supportDialog, setSupportDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);

  // États pour le ticket de support
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as const,
    category: 'general'
  });

  // États pour le feedback
  const [feedback, setFeedback] = useState({
    rating: 0,
    comment: '',
    category: 'general'
  });

  // Données simulées
  const [helpArticles] = useState<HelpArticle[]>([
    {
      id: '1',
      title: 'Comment pointer votre présence',
      content: 'Guide étape par étape pour pointer votre arrivée et départ...',
      category: 'Pointage',
      tags: ['pointage', 'arrivée', 'départ', 'géolocalisation'],
      difficulty: 'beginner',
      lastUpdated: new Date('2024-01-10'),
      helpful: 45,
      notHelpful: 3,
      views: 234
    },
    {
      id: '2',
      title: 'Gérer vos demandes de congé',
      content: 'Apprenez à créer, modifier et suivre vos demandes de congé...',
      category: 'Congés',
      tags: ['congés', 'vacances', 'demande', 'approbation'],
      difficulty: 'beginner',
      lastUpdated: new Date('2024-01-08'),
      helpful: 38,
      notHelpful: 2,
      views: 189
    },
    {
      id: '3',
      title: 'Résoudre les problèmes de géolocalisation',
      content: 'Solutions aux problèmes courants de géolocalisation...',
      category: 'Dépannage',
      tags: ['géolocalisation', 'GPS', 'erreur', 'position'],
      difficulty: 'intermediate',
      lastUpdated: new Date('2024-01-05'),
      helpful: 28,
      notHelpful: 5,
      views: 156
    }
  ]);

  const [faqs] = useState<FAQ[]>([
    {
      id: '1',
      question: 'Que faire si j\'oublie de pointer ?',
      answer: 'Contactez votre manager pour une correction manuelle. Les oublis répétés peuvent être signalés.',
      category: 'Pointage',
      popularity: 95
    },
    {
      id: '2',
      question: 'Puis-je pointer depuis plusieurs appareils ?',
      answer: 'Oui, mais un seul pointage par période est autorisé. Le dernier pointage annule le précédent.',
      category: 'Pointage',
      popularity: 87
    },
    {
      id: '3',
      question: 'Comment modifier une demande de congé ?',
      answer: 'Vous pouvez modifier une demande tant qu\'elle n\'est pas approuvée. Accédez à vos demandes et cliquez sur "Modifier".',
      category: 'Congés',
      popularity: 76
    }
  ]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    
    // Simuler une recherche
    setTimeout(() => {
      const results = helpArticles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      
      setSearchResults(results);
      setLoading(false);
    }, 500);
  };

  const submitSupportTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      return;
    }

    try {
      // Simuler la création du ticket
      const ticket: SupportTicket = {
        id: `ticket-${Date.now()}`,
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Ticket créé:', ticket);
      
      // Réinitialiser le formulaire
      setNewTicket({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'general'
      });
      
      setSupportDialog(false);
      
      // Afficher une confirmation
      alert('Votre demande de support a été créée avec succès !');
      
    } catch (error) {
      console.error('Erreur lors de la création du ticket:', error);
    }
  };

  const submitFeedback = async () => {
    if (feedback.rating === 0) {
      return;
    }

    try {
      console.log('Feedback soumis:', feedback);
      
      // Réinitialiser le formulaire
      setFeedback({
        rating: 0,
        comment: '',
        category: 'general'
      });
      
      setFeedbackDialog(false);
      alert('Merci pour votre feedback !');
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du feedback:', error);
    }
  };

  const rateArticle = (articleId: string, helpful: boolean) => {
    // Simuler l'évaluation d'un article
    console.log(`Article ${articleId} évalué comme ${helpful ? 'utile' : 'pas utile'}`);
  };

  const getDifficultyBadge = (difficulty: HelpArticle['difficulty']) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      beginner: 'Débutant',
      intermediate: 'Intermédiaire',
      advanced: 'Avancé'
    };

    return (
      <Badge className={colors[difficulty]}>
        {labels[difficulty]}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* En-tête */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center mb-4">
          <HelpCircle className="h-8 w-8 mr-3 text-blue-600" />
          Centre d'aide
        </h1>
        <p className="text-muted-foreground">
          Trouvez rapidement les réponses à vos questions
        </p>
      </div>

      {/* Barre de recherche principale */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Rechercher dans l'aide..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-lg py-6"
        />
      </div>

      {/* Résultats de recherche rapide */}
      {searchQuery && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Résultats de recherche ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Recherche en cours...</div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((article) => (
                  <div
                    key={article.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{article.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {article.content.substring(0, 100)}...
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          {getDifficultyBadge(article.difficulty)}
                          <Badge variant="outline">{article.category}</Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {article.views} vues
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Aucun résultat trouvé pour "{searchQuery}"
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search" className="flex items-center">
            <Search className="h-4 w-4 mr-2" />
            Recherche
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="guides" className="flex items-center">
            <Book className="h-4 w-4 mr-2" />
            Guides
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            Support
          </TabsTrigger>
        </TabsList>

        {/* Onglet Recherche */}
        <TabsContent value="search" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Catégories populaires */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Smartphone className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                <h3 className="font-medium mb-2">Pointage</h3>
                <p className="text-sm text-muted-foreground">
                  Arrivée, départ, pauses
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-3 text-green-600" />
                <h3 className="font-medium mb-2">Congés</h3>
                <p className="text-sm text-muted-foreground">
                  Demandes, soldes, planning
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Settings className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                <h3 className="font-medium mb-2">Paramètres</h3>
                <p className="text-sm text-muted-foreground">
                  Profil, notifications, sécurité
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Articles récents */}
          <Card>
            <CardHeader>
              <CardTitle>Articles récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {helpArticles.slice(0, 3).map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{article.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Mis à jour le {article.lastUpdated.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getDifficultyBadge(article.difficulty)}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet FAQ */}
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Questions fréquemment posées</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center justify-between w-full mr-4">
                        <span>{faq.question}</span>
                        <Badge variant="outline" className="ml-2">
                          {faq.popularity}% utile
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2">
                        <p className="text-muted-foreground mb-4">{faq.answer}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            Cette réponse vous a-t-elle aidé ?
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rateArticle(faq.id, true)}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rateArticle(faq.id, false)}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Guides */}
        <TabsContent value="guides" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {helpArticles.map((article) => (
              <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    {getDifficultyBadge(article.difficulty)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {article.content.substring(0, 120)}...
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {article.views}
                      </span>
                      <span className="flex items-center">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {article.helpful}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedArticle(article)}
                    >
                      Lire
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-3">
                    {article.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Support */}
        <TabsContent value="support" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Créer un ticket */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Contacter le support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Besoin d'aide personnalisée ? Créez un ticket de support.
                </p>
                
                <Dialog open={supportDialog} onOpenChange={setSupportDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      Créer un ticket
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouveau ticket de support</DialogTitle>
                      <DialogDescription>
                        Décrivez votre problème en détail pour une assistance rapide.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Sujet</Label>
                        <Input
                          value={newTicket.subject}
                          onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Résumé du problème"
                        />
                      </div>
                      <div>
                        <Label>Priorité</Label>
                        <Select
                          value={newTicket.priority}
                          onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Faible</SelectItem>
                            <SelectItem value="medium">Moyenne</SelectItem>
                            <SelectItem value="high">Élevée</SelectItem>
                            <SelectItem value="critical">Critique</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newTicket.description}
                          onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Décrivez votre problème en détail..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSupportDialog(false)}>
                        Annuler
                      </Button>
                      <Button onClick={submitSupportTicket}>
                        Créer le ticket
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center mb-1">
                    <Clock className="h-4 w-4 mr-2" />
                    Temps de réponse moyen : 2-4 heures
                  </p>
                  <p className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Support disponible 24h/7j
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contacts directs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Contacts directs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Support téléphonique</p>
                      <p className="text-sm text-muted-foreground">01 23 45 67 89</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Mail className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Email support</p>
                      <p className="text-sm text-muted-foreground">support@votre-entreprise.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <MessageCircle className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Chat en direct</p>
                      <p className="text-sm text-muted-foreground">Disponible dans l'app</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    Pour une assistance plus rapide, consultez d'abord notre FAQ et nos guides.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2" />
                Votre avis nous intéresse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  Aidez-nous à améliorer notre centre d'aide
                </p>
                <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      Donner mon avis
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Votre feedback</DialogTitle>
                      <DialogDescription>
                        Votre avis nous aide à améliorer notre centre d'aide.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Note globale</Label>
                        <div className="flex items-center space-x-1 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Button
                              key={star}
                              variant="ghost"
                              size="sm"
                              onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                              className={feedback.rating >= star ? 'text-yellow-500' : 'text-gray-300'}
                            >
                              <Star className="h-5 w-5 fill-current" />
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Commentaire (optionnel)</Label>
                        <Textarea
                          value={feedback.comment}
                          onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                          placeholder="Que pouvons-nous améliorer ?"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setFeedbackDialog(false)}>
                        Annuler
                      </Button>
                      <Button onClick={submitFeedback} disabled={feedback.rating === 0}>
                        Envoyer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog d'article détaillé */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedArticle.title}</span>
                  {getDifficultyBadge(selectedArticle.difficulty)}
                </DialogTitle>
                <DialogDescription>
                  <div className="flex items-center space-x-4 text-sm">
                    <span>Catégorie: {selectedArticle.category}</span>
                    <span>•</span>
                    <span>Mis à jour: {selectedArticle.lastUpdated.toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{selectedArticle.views} vues</span>
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="prose max-w-none">
                  <p>{selectedArticle.content}</p>
                  {/* Ici, vous pourriez rendre du contenu Markdown ou HTML */}
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {selectedArticle.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Cet article vous a-t-il été utile ?
                  </p>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rateArticle(selectedArticle.id, true)}
                      className="flex items-center space-x-2"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>Oui ({selectedArticle.helpful})</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rateArticle(selectedArticle.id, false)}
                      className="flex items-center space-x-2"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      <span>Non ({selectedArticle.notHelpful})</span>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};