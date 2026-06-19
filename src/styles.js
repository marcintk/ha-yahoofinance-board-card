export const CARD_STYLES = `
  :host { display: block; }

  ha-card {
    padding: 4px 2px;
    box-sizing: border-box;
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
    color: darkgray;
    font-size: 13px;
    overflow: hidden;
  }

  .stock-header, .stock-row {
    display: grid;
    grid-template-columns: 1fr 50px 50px 45px 50px 50px 56px;
    grid-template-rows: 1fr;
    align-items: center;
    line-height: 1;
  }

  .stock-header {
    font-size: 9px;
    color: var(--secondary-text-color, gray);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 2px 0;
  }

  .stock-row {
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }

  .col-name {
    padding-left: 2px;
    text-align: start;
    letter-spacing: 0.05em;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-prepost, .col-1d, .col-50d, .col-200d, .col-data, .col-price {
    padding: 0 2px;
    text-align: end;
    font-weight: bold;
    white-space: nowrap;
  }

  .stock-header .col-prepost,
  .stock-header .col-1d,
  .stock-header .col-50d,
  .stock-header .col-200d,
  .stock-header .col-data,
  .stock-header .col-price {
    font-weight: normal;
    font-size: 9px;
  }

  .col-price {
    padding: 0 1px;
  }

  .empty {
    padding: 12px 4px;
    font-size: 13px;
    color: var(--secondary-text-color, gray);
  }
`;
