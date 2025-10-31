const YEAR_MONTH_PATTERN = /(?:^|[^0-9])((?:19|20)\d{2})[^0-9]{0,3}(0?[1-9]|1[0-2])(?:[^0-9]|$)/;
const MONTH_YEAR_PATTERN = /(?:^|[^0-9])(0?[1-9]|1[0-2])[^0-9]{0,3}((?:19|20)\d{2})(?:[^0-9]|$)/;
const COMPACT_YEAR_MONTH_PATTERN = /((?:19|20)\d{2})(0[1-9]|1[0-2])(?!\d)/;
const COMPACT_MONTH_YEAR_PATTERN = /(0[1-9]|1[0-2])((?:19|20)\d{2})(?!\d)/;
const MONTH_ANYWHERE_PATTERN = /(?:^|[^0-9])(0?[1-9]|1[0-2])(?!\d)/;
const YEAR_BOUNDARY_PATTERN = /(?:^|[^0-9])((?:19|20)\d{2})(?!\d)/;

const stripDiacritics = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const padMonth = (month: string): string => month.padStart(2, '0');

/**
 * Extrai um identificador AAAA-MM a partir de um caminho, considerando apenas nomes de pastas.
 * Ignora o nome do arquivo para evitar falsos positivos quando o arquivo já possui data no nome.
 */
export const extractYearMonthFromPath = (rawPath?: string | null): string => {
  if (!rawPath) {
    return '';
  }

  const normalized = rawPath.replace(/\\/g, '/');
  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments.length) {
    return '';
  }

  const directories = segments.filter((segment, index) => {
    if (index !== segments.length - 1) {
      return true;
    }
    return !/\.[^./\\]+$/.test(segment);
  });

  if (!directories.length) {
    return '';
  }

  for (let idx = directories.length - 1; idx >= 0; idx -= 1) {
    const rawSegment = directories[idx];
    const segment = stripDiacritics(rawSegment);

    const direct = segment.match(YEAR_MONTH_PATTERN);
    if (direct) {
      return `${direct[1]}-${padMonth(direct[2])}`;
    }

    const compact = segment.match(COMPACT_YEAR_MONTH_PATTERN);
    if (compact) {
      return `${compact[1]}-${compact[2]}`;
    }

    const reverse = segment.match(MONTH_YEAR_PATTERN);
    if (reverse) {
      return `${reverse[2]}-${padMonth(reverse[1])}`;
    }

    const compactReverse = segment.match(COMPACT_MONTH_YEAR_PATTERN);
    if (compactReverse) {
      return `${compactReverse[2]}-${compactReverse[1]}`;
    }

    const monthOnly = segment.match(MONTH_ANYWHERE_PATTERN);
    if (monthOnly) {
      const monthDigits = padMonth(monthOnly[1]);
      for (let back = idx - 1; back >= 0; back -= 1) {
        const previous = stripDiacritics(directories[back]);
        const yearMatch = previous.match(YEAR_BOUNDARY_PATTERN);
        if (yearMatch) {
          return `${yearMatch[1]}-${monthDigits}`;
        }
      }
    }
  }

  return '';
};

export default extractYearMonthFromPath;
