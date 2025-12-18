/**
 * Générateur de slugs pour les URLs
 */

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remplacer les caractères spéciaux par des tirets
    .replace(/[àáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšž]/g, (match) => {
      const map: Record<string, string> = {
        'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a', 'ą': 'a',
        'č': 'c', 'ć': 'c', 'ç': 'c',
        'ę': 'e', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ė': 'e',
        'į': 'i', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'ł': 'l',
        'ń': 'n', 'ñ': 'n',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ø': 'o',
        'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ų': 'u', 'ū': 'u',
        'ÿ': 'y', 'ý': 'y',
        'ż': 'z', 'ź': 'z',
        'š': 's', 'ž': 'z'
      };
      return map[match] || match;
    })
    // Remplacer les espaces et caractères non alphanumériques par des tirets
    .replace(/[^a-z0-9]+/g, '-')
    // Supprimer les tirets en début et fin
    .replace(/^-+|-+$/g, '')
    // Limiter à 50 caractères
    .substring(0, 50)
    // Supprimer le tiret final si présent après la troncature
    .replace(/-+$/, '');
}

export function validateSlug(slug: string): boolean {
  // Un slug valide contient uniquement des lettres minuscules, chiffres et tirets
  // Ne commence ni ne finit par un tiret
  // Fait entre 3 et 50 caractères
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
}