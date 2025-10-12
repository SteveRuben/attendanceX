import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Star, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { Event } from '../../shared';
import { useToast } from '../../hooks/use-toast';

interface EventFeedbackFormProps {
  event: Event;
  onSubmit?: (feedback: FeedbackData) => void;
  onCancel?: () => void;
}

interface FeedbackData {
  eventId: string;
  ratings: {
    overall: number;
    content: number;
    organization: number;
    venue: number;
  };
  comments: string;
  wouldRecommend: boolean | null;
}

export const EventFeedbackForm: React.FC<EventFeedbackFormProps> = ({
  event,
  onSubmit,
  onCancel
}) => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackData>({
    eventId: event.id,
    ratings: {
      overall: 0,
      content: 0,
      organization: 0,
      venue: 0
    },
    comments: '',
    wouldRecommend: null
  });

  const handleRatingChange = (category: keyof FeedbackData['ratings'], rating: number) => {
    setFeedback(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: rating
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (feedback.ratings.overall === 0) {
      toast({
        title: "Évaluation requise",
        description: "Veuillez donner une note globale à l'événement",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Merci pour votre retour !",
      description: "Votre feedback a été enregistré avec succès"
    });

    onSubmit?.(feedback);
  };

  const renderStarRating = (
    category: keyof FeedbackData['ratings'],
    label: string,
    description?: string
  ) => {
    const rating = feedback.ratings[category];

    return (
      <div className="space-y-2">
        <div>
          <Label className="text-base font-medium">{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(category, star)}
              className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {rating}/5
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donnez votre avis sur l'événement</CardTitle>
        <p className="text-sm text-muted-foreground">
          Votre feedback nous aide à améliorer nos événements futurs
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderStarRating(
            'overall',
            'Évaluation globale *',
            'Comment évalueriez-vous cet événement dans son ensemble ?'
          )}

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Évaluations détaillées
            </h3>
            <div className="space-y-6">
              {renderStarRating(
                'content',
                'Contenu',
                'Qualité et pertinence du contenu présenté'
              )}

              {renderStarRating(
                'organization',
                'Organisation',
                'Ponctualité, déroulement et gestion de l\'événement'
              )}

              {renderStarRating(
                'venue',
                'Lieu',
                'Qualité et adéquation du lieu de l\'événement'
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-base font-medium">
              Recommanderiez-vous cet événement ?
            </Label>
            <div className="flex items-center gap-4 mt-3">
              <Button
                type="button"
                variant={feedback.wouldRecommend === true ? 'default' : 'outline'}
                onClick={() => setFeedback(prev => ({ ...prev, wouldRecommend: true }))}
                className="flex-1"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Oui
              </Button>
              <Button
                type="button"
                variant={feedback.wouldRecommend === false ? 'default' : 'outline'}
                onClick={() => setFeedback(prev => ({ ...prev, wouldRecommend: false }))}
                className="flex-1"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Non
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <Label htmlFor="comments" className="text-base font-medium">
              Commentaires additionnels
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Partagez vos suggestions ou remarques pour nous aider à améliorer
            </p>
            <Textarea
              id="comments"
              value={feedback.comments}
              onChange={(e) => setFeedback(prev => ({ ...prev, comments: e.target.value }))}
              placeholder="Qu'avez-vous particulièrement apprécié ? Que pourrait-on améliorer ?"
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              Envoyer mon feedback
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Votre feedback est anonyme et sera utilisé uniquement pour améliorer nos événements
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

