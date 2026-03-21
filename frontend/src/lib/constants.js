export const TRADE_STATUS_CONFIG = {
  'pending': { label: 'Pending', bg: '#fef9c3', fg: '#854d0e', order: 0 },
  'ongoing': { label: 'Ongoing', bg: '#e0f2fe', fg: '#075985', order: 1 },
  'invoice': { label: 'Invoice', bg: '#dbeafe', fg: '#1e40af', order: 2 },
  'contract': { label: 'Contract', bg: '#e0e7ff', fg: '#3730a3', order: 3 },
  'confirmation': { label: 'Confirmation', bg: '#ede9fe', fg: '#4c1d95', order: 4 },
  'draft-contract': { label: 'Draft Contract', bg: '#e2e8f0', fg: '#0f172a', order: 5 },
  'drafts-confirmation': { label: 'Drafts Confirmation', bg: '#f1f5f9', fg: '#334155', order: 6 },
  'nomination-sent': { label: 'Nomination Sent', bg: '#cffafe', fg: '#155e75', order: 7 },
  'di-sent': { label: 'DI Sent', bg: '#ccfbf1', fg: '#115e59', order: 8 },
  'appropriation': { label: 'Appropriation', bg: '#d1fae5', fg: '#065f46', order: 9 },
  'dox': { label: 'Dox', bg: '#fef3c7', fg: '#92400e', order: 10 },
  'pmt': { label: 'Pmt', bg: '#ffedd5', fg: '#9a3412', order: 11 },
  'disch': { label: 'Disch', bg: '#fee2e2', fg: '#991b1b', order: 12 },
  'shortage': { label: 'Shortage', bg: '#fecaca', fg: '#991b1b', order: 13 },
  'demurrage': { label: 'Demurrage', bg: '#fda4af', fg: '#881337', order: 14 },
  'dispatch': { label: 'Dispatch', bg: '#a7f3d0', fg: '#065f46', order: 15 },
  'brokerage': { label: 'Brokerage', bg: '#c7d2fe', fg: '#3730a3', order: 16 },
  'completed': { label: 'Completed', bg: '#dcfce7', fg: '#14532d', order: 17 },
  'cancelled': { label: 'Cancelled', bg: '#fee2e2', fg: '#991b1b', order: 18 },
  'washout': { label: 'Washout', bg: '#fce7f3', fg: '#9d174d', order: 19 },
};

export const DOCUMENT_TYPES = [
  'Bill of Lading',
  'Certificate of Origin',
  'Fumigation Certificate',
  'Phytosanitary Certificate',
  'Quality Certificate',
  'Weight Certificate',
  'Other Document',
];

export const TRADE_STATUSES = Object.keys(TRADE_STATUS_CONFIG);
