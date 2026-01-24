/**
 * Utility functions for handling Express request parameters
 */

/**
 * Type for query parameter values from Express
 * Can be string, array of strings, or undefined
 */
export type QueryParamValue = string | string[] | undefined;

/**
 * Extracts a single string value from a request parameter
 * Handles the case where Express might return string | string[]
 * 
 * @param param - The parameter value from req.params
 * @returns The extracted string value, or empty string if undefined
 */
export function getParamAsString(param: QueryParamValue): string {
  if (Array.isArray(param)) {
    return param[0] || '';
  }
  return param || '';
}

/**
 * Extracts a query parameter as a string
 * 
 * @param query - The query parameter value from req.query
 * @returns The extracted string value, or empty string if undefined
 */
export function getQueryAsString(query: QueryParamValue): string {
  if (Array.isArray(query)) {
    return query[0] || '';
  }
  return query || '';
}

/**
 * Extracts a query parameter as a number
 * 
 * @param query - The query parameter value from req.query
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns The parsed number or default value
 */
export function getQueryAsNumber(query: QueryParamValue, defaultValue: number = 0): number {
  const value = getQueryAsString(query);
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Extracts a query parameter as a boolean
 * Accepts 'true', '1' as true, 'false', '0' as false
 * 
 * @param query - The query parameter value from req.query
 * @param defaultValue - Default value if not a recognized boolean (default: false)
 * @returns The parsed boolean or default value
 */
export function getQueryAsBoolean(query: QueryParamValue, defaultValue: boolean = false): boolean {
  const value = getQueryAsString(query);
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return defaultValue;
}
