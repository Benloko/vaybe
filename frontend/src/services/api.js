const DEFAULT_API_URL = 'https://vaybe-backend.onrender.com/api';
const RAW_API_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || '';

function normalizeApiUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return DEFAULT_API_URL;

  // Autorise les formes : "/api", "/api/", "http://host:port", "http://host:port/api".
  if (value === '/api' || value === '/api/') return '/api';

  const noTrailingSlash = value.replace(/\/+$/, '');
  if (noTrailingSlash.endsWith('/api')) return noTrailingSlash;
  return `${noTrailingSlash}/api`;
}

const API_URL = normalizeApiUrl(RAW_API_URL);

function getApiBaseUrl() {
  return String(API_URL || '').replace(/\/api\/?$/, '');
}

function guessBackendBaseUrl() {
  try {
    // Si REACT_APP_API_URL est absolu, on s'en sert.
    const raw = String(RAW_API_URL || '').trim();
    if (raw) {
      try {
        const u = new URL(raw);
        return `${u.protocol}//${u.host}`;
      } catch {
        // ignore
      }
    }

    // En dev CRA: frontend souvent sur :3000 et backend Laravel sur :8000.
    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname, port, origin } = window.location;
      if (String(port || '') === '3000' && hostname) {
        return `${protocol}//${hostname}:8000`;
      }
      return String(origin || '').trim();
    }
  } catch {
    // ignore
  }

  return '';
}

function normalizePublicAssetUrl(rawUrl) {
  const raw = String(rawUrl || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) return raw;

  let base = getApiBaseUrl();
  if (!base) base = guessBackendBaseUrl();

  // Cas le plus simple: l'API renvoie un chemin relatif.
  if (raw.startsWith('/storage/')) return `${base}${raw}`;

  // Cas absolu: si l'app.url backend n'a pas le bon port, on remplace l'origin.
  try {
    const u = new URL(raw);
    if (u.pathname.startsWith('/storage/')) return `${base}${u.pathname}`;
  } catch {
    // ignore
  }

  return raw;
}

function extractLaravelError(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.message && typeof payload.message === 'string' && payload.message.trim() !== '') {
    // Si c'est la réponse de validation, on préfère le détail des champs
    if (payload.errors && typeof payload.errors === 'object') {
      const firstKey = Object.keys(payload.errors)[0];
      const firstMessages = payload.errors[firstKey];
      if (Array.isArray(firstMessages) && firstMessages[0]) return firstMessages[0];
    }
    return payload.message;
  }

  if (payload.errors && typeof payload.errors === 'object') {
    const firstKey = Object.keys(payload.errors)[0];
    const firstMessages = payload.errors[firstKey];
    if (Array.isArray(firstMessages) && firstMessages[0]) return firstMessages[0];
  }

  return null;
}

function getAdminToken() {
  try {
    return localStorage.getItem('adminToken');
  } catch {
    return null;
  }
}

function getAdminAuthHeaders() {
  const token = getAdminToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
  };
}

function clearAdminSessionStorage() {
  try {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    window.dispatchEvent(new Event('adminSessionChanged'));
  } catch {
    // ignore
  }
}

function handleAdminUnauthorized() {
  clearAdminSessionStorage();
  try {
    if (typeof window === 'undefined') return;
    const path = String(window.location?.pathname || '');
    // Ne force pas une redirection vers la connexion admin si l'utilisateur n'est plus
    // dans l'espace admin (ex: après logout vers l'onboarding).
    if (!path.startsWith('/admin')) return;
    if (path.startsWith('/admin/connexion')) return;
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search || ''}`);
    window.location.replace(`/admin/connexion?next=${next}`);
  } catch {
    // ignore
  }
}

export const applicationService = {
  normalizePublicAssetUrl,
  // Admin auth (admin unique)
  async loginAdmin({ email, password } = {}) {
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur de connexion');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  setAdminSession({ token, email } = {}) {
    try {
      if (token) localStorage.setItem('adminToken', String(token));
      if (email) localStorage.setItem('adminEmail', String(email));
      window.dispatchEvent(new Event('adminSessionChanged'));
    } catch {
      // ignore
    }
  },

  clearAdminSession() {
    clearAdminSessionStorage();
  },

  async broadcastAdminNotification(body) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ body }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de l\'envoi');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async sendAdminNotification({ body, scope, email, application_id, offer_id, status } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ body, scope, email, application_id, offer_id, status }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de l\'envoi');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Admin profil
  async getAdminProfile() {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/profile`, {
        cache: 'no-store',
        headers: {
          ...adminHeaders,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async updateAdminProfile({ email, current_password, new_password, new_password_confirmation } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ email, current_password, new_password, new_password_confirmation }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la mise à jour');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Compte candidat (léger, sans auth serveur)
  async registerCandidate({ full_name, email, phone, password, password_confirmation } = {}) {
    try {
      const response = await fetch(`${API_URL}/candidates/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name, email, phone, password, password_confirmation }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la création');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async loginCandidate({ identifier, password } = {}) {
    try {
      const response = await fetch(`${API_URL}/candidates/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur de connexion');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  setCandidateSession({ id, full_name, email, phone, city } = {}) {
    try {
      if (id) localStorage.setItem('candidateAccountId', String(id));
      if (full_name) localStorage.setItem('candidateAccountFullName', String(full_name));
      if (email) localStorage.setItem('candidateAccountEmail', String(email));
      if (phone) localStorage.setItem('candidateAccountPhone', String(phone));
      if (city !== undefined) localStorage.setItem('candidateAccountCity', String(city || ''));
      window.dispatchEvent(new Event('candidateSessionChanged'));
    } catch {
      // ignore
    }
  },

  clearCandidateSession() {
    try {
      localStorage.removeItem('candidateAccountId');
      localStorage.removeItem('candidateAccountFullName');
      localStorage.removeItem('candidateAccountEmail');
      localStorage.removeItem('candidateAccountPhone');
      localStorage.removeItem('candidateAccountCity');
      window.dispatchEvent(new Event('candidateSessionChanged'));
    } catch {
      // ignore
    }
  },

  clearCandidateLogoutContext() {
    try {
      const lastId = localStorage.getItem('lastApplicationId');
      const profileId = localStorage.getItem('candidateProfileApplicationId');

      // Session compte candidat
      localStorage.removeItem('candidateAccountId');
      localStorage.removeItem('candidateAccountFullName');
      localStorage.removeItem('candidateAccountEmail');
      localStorage.removeItem('candidateAccountPhone');
      localStorage.removeItem('candidateAccountCity');

      // Contexte candidature (pour éviter de retomber automatiquement sur /profil/:id)
      localStorage.removeItem('lastApplicationId');
      localStorage.removeItem('lastApplicationStatus');

      // Profil candidature par défaut (brouillon)
      localStorage.removeItem('candidateProfileApplicationId');

      if (lastId) {
        localStorage.removeItem(`candidateAvatar:${String(lastId)}`);
      }

      if (profileId) {
        localStorage.removeItem(`candidateAvatar:${String(profileId)}`);
      }

      window.dispatchEvent(new Event('candidateSessionChanged'));
      window.dispatchEvent(new Event('lastApplicationIdChanged'));
    } catch {
      // ignore
    }
  },

  // Compte candidat — mise à jour profil (nom/email/téléphone/ville)
  async updateCandidateAccount(id, { full_name, email, phone, city } = {}) {
    try {
      const response = await fetch(`${API_URL}/candidates/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name, email, phone, city }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la mise à jour');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Profil candidat (profil "candidature" par défaut) — retourne/crée une candidature brouillon sans offre
  async getOrCreateCandidateProfile(candidateAccountId) {
    try {
      const cid = String(candidateAccountId || '').trim();
      if (!cid) throw new Error('Compte candidat manquant.');

      const response = await fetch(`${API_URL}/candidates/${encodeURIComponent(cid)}/profile`, {
        cache: 'no-store',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Offres
  async getOffers() {
    try {
      const response = await fetch(`${API_URL}/offers`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Rôles (public)
  async getRoles() {
    try {
      const response = await fetch(`${API_URL}/roles`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Types d'offre (admin)
  async getOfferTypes() {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/offer-types`, {
        cache: 'no-store',
        headers: {
          ...adminHeaders,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async getOfferDeletionCheck(id) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/offers/${encodeURIComponent(String(id))}/deletion-check`, {
        cache: 'no-store',
        headers: {
          ...adminHeaders,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async createOfferType({ key, label } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/offer-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ key, label }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la création');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async updateOfferType(id, { label } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/offer-types/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ label }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la mise à jour');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async deleteOfferType(id) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/offer-types/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: {
          ...adminHeaders,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la suppression');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Rôles (admin)
  async getAdminRoles() {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/roles`, {
        cache: 'no-store',
        headers: {
          ...adminHeaders,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async createRole({ key, label } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ key, label }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la création');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async updateRole(id, { label } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/roles/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ label }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la mise à jour');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async deleteRole(id) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/admin/roles/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: {
          ...adminHeaders,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la suppression');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async getOffer(id) {
    try {
      const response = await fetch(`${API_URL}/offers/${encodeURIComponent(String(id))}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async createOffer({ title, type, description, is_open } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ title, type, description, is_open }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la création');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async updateOffer(id, { title, type, description, is_open } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/offers/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ title, type, description, is_open }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la mise à jour');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async deleteOffer(id, { force } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const qs = force ? '?force=1' : '';

      const response = await fetch(`${API_URL}/offers/${encodeURIComponent(String(id))}${qs}`, {
        method: 'DELETE',
        headers: {
          ...adminHeaders,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la suppression');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Obtenir la liste de toutes les candidatures
  async getApplications() {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/applications`, {
        cache: 'no-store',
        headers: {
          ...adminHeaders,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Candidat — liste de ses candidatures (par email)
  async getCandidateApplicationsByEmail(email) {
    try {
      const e = String(email || '').trim();
      if (!e) throw new Error('Email manquant.');

      const response = await fetch(`${API_URL}/candidates/applications?email=${encodeURIComponent(e)}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Obtenir une candidature par id
  async getApplication(id) {
    try {
      const response = await fetch(`${API_URL}/applications/${id}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Upload avatar (photo de profil) pour une candidature
  async uploadApplicationAvatar(id, file) {
    try {
      if (!id) throw new Error('ID manquant.');
      if (!file) throw new Error('Fichier manquant.');

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${API_URL}/applications/${encodeURIComponent(String(id))}/avatar`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de l\'upload');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  async deleteApplicationAvatar(id) {
    try {
      if (!id) throw new Error('ID manquant.');

      const response = await fetch(`${API_URL}/applications/${encodeURIComponent(String(id))}/avatar`, {
        method: 'DELETE',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la suppression');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Mettre à jour le statut d'une candidature (admin)
  async updateApplicationStatus(id, { status, message } = {}) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/applications/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ status, message }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }

      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la mise à jour');
      }

      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Messages — liste
  async getApplicationMessages(id, { candidateEmail } = {}) {
    try {
      const qs = candidateEmail ? `?candidate_email=${encodeURIComponent(String(candidateEmail))}` : '';
      const response = await fetch(`${API_URL}/applications/${id}/messages${qs}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Candidat — suppression persistante d'une notification (serveur)
  async dismissCandidateNotification(messageId, email) {
    try {
      const mid = String(messageId || '').trim();
      const e = String(email || '').trim();
      if (!mid) throw new Error('Message manquant.');
      if (!e) throw new Error('Email manquant.');

      const response = await fetch(`${API_URL}/candidates/notifications/${encodeURIComponent(mid)}/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: e }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la suppression');
      }

      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Messages — admin
  async sendAdminMessage(id, body) {
    try {
      const adminHeaders = getAdminAuthHeaders();
      if (!adminHeaders) throw new Error('Non authentifié (admin).');

      const response = await fetch(`${API_URL}/applications/${id}/messages/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({ body }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        handleAdminUnauthorized();
        throw new Error('Session admin expirée.');
      }

      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de l\'envoi');
      }

      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Messages — candidat (autorisé uniquement si candidature approuvée)
  async sendCandidateMessage(id, body) {
    try {
      const response = await fetch(`${API_URL}/applications/${id}/messages/candidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de l\'envoi');
      }

      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Profil — état de validation
  async getApplicationAccount(id) {
    try {
      const response = await fetch(`${API_URL}/applications/${id}/account`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors du chargement');
      }
      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Profil — init validation (email/téléphone + mot de passe)
  async initApplicationAccount(id, { channel, value, password }) {
    try {
      const response = await fetch(`${API_URL}/applications/${id}/account/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel, value, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de l\'envoi du code');
      }

      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Profil — confirmer code
  async confirmApplicationAccount(id, { code }) {
    try {
      const response = await fetch(`${API_URL}/applications/${id}/account/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la confirmation');
      }

      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },

  // Soumettre une nouvelle candidature
  async submitApplication(data) {
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const response = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: isFormData
          ? undefined
          : {
              'Content-Type': 'application/json',
            },
        body: isFormData ? data : JSON.stringify(data),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractLaravelError(payload) || 'Erreur lors de la soumission');
      }

      return payload;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    }
  },
};
