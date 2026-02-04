export type TemplateVariables = Record<string, any>;

export interface RenderTemplateOptions {
  /**
   * If true, leave placeholders intact when no variable is found.
   * Defaults to true to preserve current behavior across services.
   */
  keepUnmatched?: boolean;
}

function normalizeKey(key: string): string {
  return String(key)
    .trim()
    .toLowerCase()
    // collapse common separators so first_name, firstName, first-name all match
    .replace(/[^a-z0-9]/g, '');
}

function toStringValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  // last resort (avoid throwing for objects)
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildNormalizedVariables(variables: TemplateVariables): Map<string, string> {
  const normalized = new Map<string, string>();

  for (const [key, val] of Object.entries(variables || {})) {
    const n = normalizeKey(key);
    if (!n) continue;
    if (!normalized.has(n)) normalized.set(n, toStringValue(val));
  }

  const setAliasIfMissing = (aliasNormKey: string, fromNormKey: string) => {
    if (!normalized.has(aliasNormKey) && normalized.has(fromNormKey)) {
      normalized.set(aliasNormKey, normalized.get(fromNormKey) || '');
    }
  };

  // Common synonym aliases used across the codebase/templates
  // surname <-> last_name/lastName
  setAliasIfMissing('surname', 'lastname');
  setAliasIfMissing('lastname', 'surname');

  // member_name <-> full_name/fullname
  setAliasIfMissing('membername', 'fullname');
  setAliasIfMissing('fullname', 'membername');

  // membership_number synonyms
  setAliasIfMissing('membershipnumber', 'membernumber');
  setAliasIfMissing('membershipnumber', 'membershipno');
  setAliasIfMissing('membernumber', 'membershipnumber');
  setAliasIfMissing('membershipno', 'membershipnumber');

  // phone/cell synonyms
  setAliasIfMissing('cellnumber', 'phonenumber');
  setAliasIfMissing('phonenumber', 'cellnumber');
  setAliasIfMissing('msisdn', 'cellnumber');
  setAliasIfMissing('cellnumber', 'msisdn');

  return normalized;
}

function resolveValue(
  normalizedVars: Map<string, string>,
  rawKey: string,
  keepUnmatched: boolean,
  originalMatch: string
): string {
  const key = normalizeKey(rawKey);
  if (!key) return keepUnmatched ? originalMatch : '';
  if (normalizedVars.has(key)) return normalizedVars.get(key) || '';
  return keepUnmatched ? originalMatch : '';
}

/**
 * Renders both {{var}} and {var} placeholders.
 *
 * - Supports key normalization: first_name, firstName, FIRSTNAME => same.
 * - Avoids partially matching {{var}} as {var}.
 */
export function renderTemplateString(
  template: string,
  variables: TemplateVariables = {},
  options: RenderTemplateOptions = {}
): string {
  const keepUnmatched = options.keepUnmatched !== false;
  const normalizedVars = buildNormalizedVariables(variables);

  let output = String(template ?? '');

  // 1) Replace double-curly placeholders
  output = output.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return resolveValue(normalizedVars, key, keepUnmatched, match);
  });

  // 2) Replace single-curly placeholders, but do NOT touch leftover {{var}}
  //    (skip matches that are immediately preceded by '{' or followed by '}')
  output = output.replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, key, offset, full) => {
    const str = String(full);
    const start = Number(offset);
    const end = start + match.length;
    const prev = start > 0 ? str[start - 1] : '';
    const next = end < str.length ? str[end] : '';

    if (prev === '{' || next === '}') return match;
    return resolveValue(normalizedVars, key, keepUnmatched, match);
  });

  return output;
}
