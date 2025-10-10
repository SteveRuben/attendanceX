/**
 * Composant de saisie de code promo avec validation en temps réel
 * Affiche les réductions appliquées et gère les messages d'erreur
 */

import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { 
  Gift, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Loader2,
  Percent,
  DollarSign
} from 'lucide-react';
import { promoCodeService } from '../../services/promoCodeService';
import { 
  PromoCodeValidationResponse, 
  PromoCode,
  PromoCodeDiscountType 
} from '../../shared/types/billing.types';

interface PromoCodeInputProps {
  /** Code promo initial */
  initialCode?: string;
  /** Montant sur lequel appliquer la réduction (pour prévisualisation) */
  amount?: number;
  /** ID du plan pour validation */
  planId?: string;
  /** Callback appelé quand un code valide est saisi */
  onValidCode?: (code: string, validation: PromoCodeValidationResponse) => void;
  /** Callback appelé quand le code est supprimé ou invalide */
  onInvalidCode?: () => void;
  /** Callback appelé lors du changement de code */
  onChange?: (code: string) => void;
  /** Désactiver le composant */
  disabled?: boolean;
  /** Taille du composant */
  size?: 'sm' | 'md' | 'lg';
  /** Placeholder personnalisé */
  placeholder?: string;
  /** Afficher le bouton d'application */
  showApplyButton?: boolean;
  /** Callback pour l'application du code */
  onApply?: (code: string) => Promise<void>;
  /** État de chargement pour l'application */
  isApplying?: boolean;
  /** Classe CSS personnalisée */
  className?: string;
}

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  initialCode = '',
  amount,
  planId,
  onValidCode,
  onInvalidCode,
  onChange,
  disabled = false,
  size = 'md',
  placeholder = 'Code promo (optionnel)',
  showApplyButton = false,
  onApply,
  isApplying = false,
  className = ''
}) => {
  const [code, setCode] = useState(initialCode);
  const [validation, setValidation] = useState<PromoCodeValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Validation du code promo en temps réel
  useEffect(() => {
    const validateCode = async () => {
      if (!code.trim()) {
        setValidation(null);
        onInvalidCode?.();
        return;
      }

      setIsValidating(true);
      try {
        const result = await promoCodeService.validatePromoCode({
          code: code.trim(),
          planId,
          subscriptionAmount: amount
        });
        
        setValidation(result);
        
        if (result.isValid) {
          onValidCode?.(code.trim(), result);
        } else {
          onInvalidCode?.();
        }
      } catch (error) {
        const errorResult: PromoCodeValidationResponse = {
          isValid: false,
          errorMessage: 'Erreur lors de la validation du code'
        };
        setValidation(errorResult);
        onInvalidCode?.();
      } finally {
        setIsValidating(false);
      }
    };

    const debounceTimer = setTimeout(validateCode, 500);
    return () => clearTimeout(debounceTimer);
  }, [code, planId, amount, onValidCode, onInvalidCode]);

  const handleCodeChange = (value: string) => {
    const upperCode = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    setCode(upperCode);
    onChange?.(upperCode);
  };

  const handleClearCode = () => {
    setCode('');
    setValidation(null);
    onChange?.('');
    onInvalidCode?.();
  };

  const handleApply = async () => {
    if (!code.trim() || !validation?.isValid || !onApply) return;
    
    try {
      await onApply(code.trim());
    } catch (error) {
      console.error('Error applying promo code:', error);
    }
  };

  const getDiscountDisplay = (promoCode: PromoCode) => {
    if (promoCode.discountType === PromoCodeDiscountType.PERCENTAGE) {
      return (
        <div className="flex items-center text-green-600">
          <Percent className="w-4 h-4 mr-1" />
          <span className="font-semibold">{promoCode.discountValue}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-green-600">
          <DollarSign className="w-4 h-4 mr-1" />
          <span className="font-semibold">{promoCode.discountValue}€</span>
        </div>
      );
    }
  };

  const getAmountSaved = () => {
    if (!validation?.isValid || !validation.promoCode || !amount) return null;
    return promoCodeService.calculateDiscount(validation.promoCode, amount);
  };

  const getFinalAmount = () => {
    if (!validation?.isValid || !validation.promoCode || !amount) return amount;
    return promoCodeService.calculateFinalAmount(validation.promoCode, amount);
  };

  const sizeClasses = {
    sm: 'text-sm py-2',
    md: 'text-base py-3',
    lg: 'text-lg py-4'
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Input principal */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Gift className="w-5 h-5" />
        </div>
        
        <Input
          type="text"
          placeholder={placeholder}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          disabled={disabled}
          className={`
            pl-10 pr-12 ${sizeClasses[size]} 
            border-2 transition-all duration-200
            ${validation?.isValid 
              ? 'border-green-500 bg-green-50 focus:border-green-600' 
              : validation && !validation.isValid 
                ? 'border-red-500 bg-red-50 focus:border-red-600'
                : 'border-gray-200 focus:border-purple-500'
            }
          `}
          maxLength={50}
        />
        
        {/* Indicateurs de statut */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {isValidating && (
            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
          )}
          
          {validation?.isValid && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          
          {validation && !validation.isValid && (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          
          {code && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCode}
              className="p-1 h-auto hover:bg-gray-100"
              disabled={disabled}
            >
              <X className="w-4 h-4 text-gray-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages de validation */}
      {validation && (
        <div className={`
          p-3 rounded-lg border text-sm transition-all duration-200
          ${validation.isValid 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-red-50 text-red-700 border-red-200'
          }
        `}>
          {validation.isValid ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="font-medium">Code valide !</span>
                </div>
                {validation.promoCode && getDiscountDisplay(validation.promoCode)}
              </div>
              
              {validation.promoCode && (
                <div className="text-xs text-green-600">
                  {validation.promoCode.name}
                  {validation.promoCode.description && (
                    <span className="block mt-1">{validation.promoCode.description}</span>
                  )}
                </div>
              )}
              
              {amount && validation.promoCode && (
                <div className="flex items-center justify-between pt-2 border-t border-green-200">
                  <span>Économie :</span>
                  <span className="font-semibold">-{getAmountSaved()}€</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>{validation.errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Bouton d'application */}
      {showApplyButton && validation?.isValid && (
        <Button
          onClick={handleApply}
          disabled={disabled || isApplying}
          className="w-full"
          variant="outline"
        >
          {isApplying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Application en cours...
            </>
          ) : (
            <>
              <Gift className="w-4 h-4 mr-2" />
              Appliquer le code
            </>
          )}
        </Button>
      )}

      {/* Résumé des prix */}
      {amount && validation?.isValid && validation.promoCode && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Prix original :</span>
              <span className="line-through text-gray-500">{amount}€</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Réduction :</span>
              <span>-{getAmountSaved()}€</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Total :</span>
              <span>{getFinalAmount()}€</span>
            </div>
          </div>
        </div>
      )}

      {/* Détails du code promo */}
      {validation?.isValid && validation.promoCode && (
        <div className="text-xs text-gray-500">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="hover:text-gray-700 underline"
          >
            {showDetails ? 'Masquer les détails' : 'Voir les détails'}
          </button>
          
          {showDetails && (
            <div className="mt-2 p-3 bg-gray-50 rounded border text-xs space-y-1">
              <div><strong>Code :</strong> {validation.promoCode.code}</div>
              <div><strong>Type :</strong> {
                validation.promoCode.discountType === PromoCodeDiscountType.PERCENTAGE 
                  ? 'Pourcentage' 
                  : 'Montant fixe'
              }</div>
              {validation.promoCode.validUntil && (
                <div><strong>Valide jusqu'au :</strong> {
                  new Date(validation.promoCode.validUntil).toLocaleDateString('fr-FR')
                }</div>
              )}
              {validation.promoCode.maxUses && (
                <div><strong>Utilisations :</strong> {
                  validation.promoCode.currentUses
                } / {validation.promoCode.maxUses}</div>
              )}
              {validation.promoCode.minimumAmount && (
                <div><strong>Montant minimum :</strong> {validation.promoCode.minimumAmount}€</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromoCodeInput;