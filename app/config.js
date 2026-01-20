// Configurazione app dmto.me
window.APP_CONFIG = {
  // Dominio base dell'applicazione
  BASE_URL: 'https://dmtome.vercel.app',
  
  // Nome brand (per display)
  BRAND_NAME: 'dmto.me',
  
  // Email supporto
  SUPPORT_EMAIL: 'support@dmto.me',
  
  // Privacy email
  PRIVACY_EMAIL: 'privacy@dmto.me'
};

// Helper per generare link profilo
window.getProfileLink = function(username) {
  if (!username) return '';
  return `${window.APP_CONFIG.BASE_URL}/${username}`;
};

// Helper per generare link completo
window.getFullProfileLink = function(username) {
  return window.getProfileLink(username);
};
