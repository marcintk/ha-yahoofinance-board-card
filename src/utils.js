export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const MARKET_STATES = new Set(['PREPRE', 'PRE', 'REGULAR', 'POST', 'POSTPOST']);
