export const ALLOWED_PRESENTATION_MUTATIONS = [
  '/api/auth/logout'
];

export const isMutationAllowedInPresentation = (method: string, path: string): boolean => {
  const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  if (isSafeMethod) return true;

  // Exact match or query parameter handling
  const basePath = path.split('?')[0];

  return ALLOWED_PRESENTATION_MUTATIONS.includes(basePath);
};
