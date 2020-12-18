const stringSimilarity = require('string-similarity');

export function findClosestKey(
    key: string,
    o: Record<string, unknown> | Map<string, unknown> | string[]
): string {
    if (!key || !o) return '';
    let keys: string[];
    if (o instanceof Map) {
        keys = Array.from(o.keys());
    } else if (Array.isArray(o)) {
        keys = o;
    } else {
        keys = Object.keys(o);
    }
    if (keys.length === 0) return '';
    const result = stringSimilarity.findBestMatch(key, keys);
    return result.bestMatch.rating > 0.1 ? result.bestMatch.target : '';
}

export function getSuggestion(
    key: string,
    o: Record<string, unknown> | Map<string, unknown> | string[]
): string {
    const alt = findClosestKey(key, o);
    return alt ? `. Did you mean "${alt}"?` : '';
}
