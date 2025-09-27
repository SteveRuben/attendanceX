import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
  Type,
  Image,
  Link,
  Palette,
  Layout,
  Grid,
  List,
  Quote,
  Calendar,
  Star,
  Search,
  Plus
} from 'lucide-react';

interface TemplateBlock {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  description: string;
  html: string;
  preview?: string;
}

interface TemplateBlockLibraryProps {
  onAddBlock: (block: TemplateBlock) => void;
}

export const TemplateBlockLibrary: React.FC<TemplateBlockLibraryProps> = ({
  onAddBlock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const blocks: TemplateBlock[] = [
    // Blocs de texte
    {
      id: 'text-heading',
      name: 'Titre',
      category: 'text',
      icon: Type,
      description: 'Titre principal ou secondaire',
      html: `
        <h2 style="color: #1F2937; font-size: 24px; font-weight: bold; margin: 20px 0 15px 0; line-height: 1.3;">
          Votre titre ici
        </h2>
      `
    },
    {
      id: 'text-paragraph',
      name: 'Paragraphe',
      category: 'text',
      icon: Type,
      description: 'Bloc de texte standard',
      html: `
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 15px 0;">
          Votre texte ici. Vous pouvez ajouter plusieurs phrases pour créer un paragraphe complet 
          avec toutes les informations nécessaires.
        </p>
      `
    },
    {
      id: 'text-quote',
      name: 'Citation',
      category: 'text',
      icon: Quote,
      description: 'Citation ou témoignage',
      html: `
        <blockquote style="border-left: 4px solid #3B82F6; padding-left: 20px; margin: 25px 0; 
                           font-style: italic; color: #6B7280; font-size: 18px; line-height: 1.5;">
          "Votre citation inspirante ici. Elle peut être utilisée pour mettre en avant 
          un témoignage ou une phrase importante."
          <footer style="margin-top: 10px; font-size: 14px; color: #9CA3AF;">
            — Nom de l'auteur
          </footer>
        </blockquote>
      `
    },

    // Blocs de contenu
    {
      id: 'content-card',
      name: 'Carte de contenu',
      category: 'content',
      icon: Layout,
      description: 'Carte avec titre et description',
      html: `
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; 
                    padding: 25px; margin: 20px 0;">
          <h3 style="color: #1F2937; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">
            Titre de la carte
          </h3>
          <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Description du contenu de cette carte. Ajoutez ici les informations importantes 
            que vous souhaitez mettre en avant.
          </p>
          <a href="#" style="display: inline-block; background-color: #3B82F6; color: #ffffff; 
                            padding: 10px 20px; text-decoration: none; border-radius: 6px; 
                            font-weight: 500; font-size: 14px;">
            En savoir plus
          </a>
        </div>
      `
    },
    {
      id: 'content-highlight',
      name: 'Encadré important',
      category: 'content',
      icon: Star,
      description: 'Encadré pour information importante',
      html: `
        <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; 
                    padding: 20px; margin: 20px 0;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="background-color: #F59E0B; color: white; border-radius: 50%; 
                        width: 24px; height: 24px; display: flex; align-items: center; 
                        justify-content: center; font-weight: bold; font-size: 14px; 
                        flex-shrink: 0;">!</div>
            <div>
              <h4 style="color: #92400E; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                Information importante
              </h4>
              <p style="color: #92400E; font-size: 14px; line-height: 1.5; margin: 0;">
                Votre message important ici. Utilisez cet encadré pour attirer l'attention 
                sur des informations cruciales.
              </p>
            </div>
          </div>
        </div>
      `
    },

    // Blocs de boutons
    {
      id: 'button-primary',
      name: 'Bouton principal',
      category: 'buttons',
      icon: Link,
      description: 'Bouton d\'action principal',
      html: `
        <div style="text-align: center; margin: 25px 0;">
          <a href="#" style="display: inline-block; background-color: #3B82F6; color: #ffffff; 
                            padding: 15px 30px; text-decoration: none; border-radius: 8px; 
                            font-weight: 600; font-size: 16px; transition: background-color 0.2s;">
            Bouton d'action
          </a>
        </div>
      `
    },
    {
      id: 'button-secondary',
      name: 'Bouton secondaire',
      category: 'buttons',
      icon: Link,
      description: 'Bouton d\'action secondaire',
      html: `
        <div style="text-align: center; margin: 25px 0;">
          <a href="#" style="display: inline-block; background-color: transparent; 
                            color: #3B82F6; border: 2px solid #3B82F6; padding: 13px 28px; 
                            text-decoration: none; border-radius: 8px; font-weight: 600; 
                            font-size: 16px;">
            Bouton secondaire
          </a>
        </div>
      `
    },

    // Blocs de liste
    {
      id: 'list-bullet',
      name: 'Liste à puces',
      category: 'lists',
      icon: List,
      description: 'Liste avec puces',
      html: `
        <ul style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 20px 0; 
                   padding-left: 25px;">
          <li style="margin-bottom: 8px;">Premier élément de la liste</li>
          <li style="margin-bottom: 8px;">Deuxième élément important</li>
          <li style="margin-bottom: 8px;">Troisième point à retenir</li>
          <li style="margin-bottom: 8px;">Quatrième information utile</li>
        </ul>
      `
    },
    {
      id: 'list-numbered',
      name: 'Liste numérotée',
      category: 'lists',
      icon: List,
      description: 'Liste avec numéros',
      html: `
        <ol style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 20px 0; 
                   padding-left: 25px;">
          <li style="margin-bottom: 8px;">Première étape à suivre</li>
          <li style="margin-bottom: 8px;">Deuxième action à réaliser</li>
          <li style="margin-bottom: 8px;">Troisième point du processus</li>
          <li style="margin-bottom: 8px;">Dernière étape importante</li>
        </ol>
      `
    },

    // Blocs de séparation
    {
      id: 'separator-line',
      name: 'Ligne de séparation',
      category: 'separators',
      icon: Palette,
      description: 'Ligne horizontale simple',
      html: `
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
      `
    },
    {
      id: 'separator-space',
      name: 'Espacement',
      category: 'separators',
      icon: Palette,
      description: 'Espace vertical',
      html: `
        <div style="height: 40px;"></div>
      `
    },

    // Blocs d'image
    {
      id: 'image-full',
      name: 'Image pleine largeur',
      category: 'images',
      icon: Image,
      description: 'Image sur toute la largeur',
      html: `
        <div style="margin: 25px 0;">
          <img src="https://via.placeholder.com/600x300/3B82F6/FFFFFF?text=Votre+Image" 
               alt="Description de l'image" 
               style="width: 100%; height: auto; border-radius: 8px; display: block;">
        </div>
      `
    },
    {
      id: 'image-centered',
      name: 'Image centrée',
      category: 'images',
      icon: Image,
      description: 'Image centrée avec légende',
      html: `
        <div style="text-align: center; margin: 25px 0;">
          <img src="https://via.placeholder.com/400x200/3B82F6/FFFFFF?text=Image+Centrée" 
               alt="Description de l'image" 
               style="max-width: 400px; width: 100%; height: auto; border-radius: 8px;">
          <p style="color: #6B7280; font-size: 14px; margin: 10px 0 0 0; font-style: italic;">
            Légende de l'image
          </p>
        </div>
      `
    }
  ];

  const categories = [
    { id: 'all', label: 'Tous les blocs', icon: Grid },
    { id: 'text', label: 'Texte', icon: Type },
    { id: 'content', label: 'Contenu', icon: Layout },
    { id: 'buttons', label: 'Boutons', icon: Link },
    { id: 'lists', label: 'Listes', icon: List },
    { id: 'images', label: 'Images', icon: Image },
    { id: 'separators', label: 'Séparateurs', icon: Palette }
  ];

  const filteredBlocks = blocks.filter(block => {
    const matchesSearch = block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         block.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || block.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Rechercher un bloc..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Catégories */}
      <div className="space-y-1">
        {categories.map(category => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {category.label}
            </button>
          );
        })}
      </div>

      {/* Blocs */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">
          Blocs disponibles ({filteredBlocks.length})
        </h4>
        
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-8">
            <Grid className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Aucun bloc trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBlocks.map(block => {
              const Icon = block.icon;
              
              return (
                <div
                  key={block.id}
                  className="border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => onAddBlock(block)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium text-gray-900 mb-1">
                        {block.name}
                      </h5>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {block.description}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="flex-shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};