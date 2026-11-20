import DOMPurify from 'dompurify';

let hooksRegistered = false;

function registerHooks(): void {
  if (hooksRegistered) {
    return;
  }
  // Tous les liens du contenu s'ouvrent dans un nouvel onglet, sans accès à window.opener.
  DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  hooksRegistered = true;
}

/** Assainit le HTML de AdvBody avant affichage ou enregistrement. */
export function sanitizeHtml(html: string | undefined): string {
  if (!html) {
    return '';
  }
  registerHooks();
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style', 'class', 'id', 'onerror', 'onload', 'onclick'],
    ADD_ATTR: ['target']
  });
}
