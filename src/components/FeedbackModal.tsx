import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createFeedback } from '@/services/feedbackService';
import { useAuth } from '@/contexts/AuthContext';
import { getMyProfile } from '@/services/profileService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar nome completo do perfil quando o modal abrir
  useEffect(() => {
    if (isOpen && user) {
      getMyProfile()
        .then((profile) => {
          if (profile.name) {
            setName(profile.name);
          } else if (user.username) {
            setName(user.username);
          }
        })
        .catch(() => {
          // Fallback para username se falhar
          if (user.username) {
            setName(user.username);
          }
        });
    }
  }, [isOpen, user]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      // Reset form quando fechar
      setTimeout(() => {
        setName('');
        setRole('');
        setText('');
        setRating(0);
        setHoveredRating(0);
      }, 200);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating) {
      toast.error('Por favor, selecione uma avaliação');
      return;
    }

    if (text.length < 10) {
      toast.error('O feedback deve ter pelo menos 10 caracteres');
      return;
    }

    if (!name.trim()) {
      toast.error('Por favor, informe seu nome');
      return;
    }

    setIsSubmitting(true);

    try {
      await createFeedback({
        name: name.trim(),
        role: role.trim() || undefined,
        text: text.trim(),
        rating,
      });

      toast.success('Obrigado pelo seu feedback! Ele será revisado antes de ser publicado.');
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar feedback. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md border border-white/10 bg-[#111]/95 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            Avalie-nos
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Sua opinião é muito importante para nós! Compartilhe sua experiência com a Arisara.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Stars */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white/90">
              Como você avalia a Arisara? <span className="text-red-400">*</span>
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400/50 rounded"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= displayRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-700 text-gray-600'
                    } transition-colors duration-200`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-gray-500">
                {rating === 5 && '⭐ Excelente! Obrigado!'}
                {rating === 4 && '👍 Muito bom!'}
                {rating === 3 && '👍 Bom'}
                {rating === 2 && '😐 Poderia melhorar'}
                {rating === 1 && '😞 Precisamos melhorar'}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="feedback-name" className="text-sm font-medium text-white/90">
              Seu nome <span className="text-red-400">*</span>
            </Label>
            <Input
              id="feedback-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              required
              maxLength={255}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-amber-400/50"
            />
          </div>

          {/* Role (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="feedback-role" className="text-sm font-medium text-white/90">
              Cargo/Função <span className="text-gray-500 text-xs">(opcional)</span>
            </Label>
            <Input
              id="feedback-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: CEO, Operations Manager, etc."
              maxLength={255}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-amber-400/50"
            />
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Label htmlFor="feedback-text" className="text-sm font-medium text-white/90">
              Seu feedback <span className="text-red-400">*</span>
            </Label>
              <Textarea
              id="feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Compartilhe sua experiência com a Arisara..."
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-amber-400/50 resize-none"
            />
            <p className="text-xs text-gray-500">
              {text.length}/2000 caracteres (mínimo: 10)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !rating || text.length < 10 || !name.trim()}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Enviar Avaliação
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

