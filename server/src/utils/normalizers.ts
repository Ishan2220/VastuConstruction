export const normalizePaymentMethod = (method?: string | null): string => {
  if (!method) return 'BANK_TRANSFER';
  return method.trim().toUpperCase();
};

export const normalizeExpenseType = (type?: string | null): string => {
  if (!type) return 'OTHER';
  return type.trim().toUpperCase();
};

export const normalizeMaterialUnit = (unit?: string | null): string => {
  if (!unit) return 'NOS';
  return unit.trim().toUpperCase();
};

export const normalizeDocumentType = (type?: string | null): string => {
  if (!type) return 'OTHER';
  return type.trim().toUpperCase();
};

export const normalizeLeadSource = (source?: string | null): string => {
  if (!source) return 'OTHER';
  return source.trim().toUpperCase();
};

export const cleanRelationId = (id?: string | null): string | null | undefined => {
  if (id === undefined) return undefined;
  if (id === null || typeof id !== 'string' || id.trim() === '') return null;
  return id.trim();
};
