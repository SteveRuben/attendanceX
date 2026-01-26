/**
 * Utilitaires pour gérer les paramètres de route Express
 * 
 * Les paramètres de route Express peuvent être string | string[]
 * Ces helpers garantissent un type string cohérent
 */

/**
 * Convertit un paramètre de route Express en string
 * @param param - Paramètre de route (string | string[])
 * @returns Le paramètre en tant que string
 */
export function getStringParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

/**
 * Convertit plusieurs paramètres de route en strings
 * @param params - Objet contenant les paramètres
 * @returns Objet avec tous les paramètres convertis en strings
 */
export function getStringParams<T extends Record<string, string | string[]>>(
  params: T
): { [K in keyof T]: string } {
  const result: any = {};
  for (const key in params) {
    result[key] = getStringParam(params[key]);
  }
  return result;
}
