const KNOWN_INDICES = new Set([
  'dji', 'gspc', 'ixic', 'dax', 'ftse', 'n225', 'tnx', 'vix', 'rut', 'spx',
  'stoxx50e', 'asx', 'hsi', 'ks11', 'twii', 'bsesn', 'nsei',
]);

const KNOWN_CRYPTO_BASES = new Set([
  'btc', 'eth', 'sol', 'xrp', 'ada', 'doge', 'bnb', 'avax', 'dot', 'link', 'ltc', 'bch',
]);

export function detectIcon(symbol: string): string {
  if (symbol.endsWith('_f')) return '◆';
  if (symbol.endsWith('_x')) return '¤';
  if (KNOWN_INDICES.has(symbol)) return '①';
  if (KNOWN_CRYPTO_BASES.has(symbol.split('_')[0])) return '₿';
  return '';
}

export function resolveIcon(
  symbol: string,
  stockIcon: string | undefined,
  iconsMode: 'auto' | 'none'
): string {
  if (stockIcon !== undefined) return stockIcon;
  if (iconsMode === 'auto') return detectIcon(symbol);
  return '';
}
