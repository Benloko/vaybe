# Variables d'environnement — Configuration production

## Backend (Render Dashboard → Environment)

Ces variables sont SENSIBLES et ne doivent jamais être committées.
Les renseigner manuellement dans : Render Dashboard → ton service → Environment

```
APP_NAME=Vaybe
APP_ENV=production
APP_KEY=                        # Générer avec: php artisan key:generate --show
APP_DEBUG=false
APP_URL=https://vaybe-backend.onrender.com

# Base de données PostgreSQL (Render ou Supabase)
DB_CONNECTION=pgsql
DB_HOST=                        # Internal host depuis Render PostgreSQL dashboard
DB_PORT=5432
DB_DATABASE=vaybe_db
DB_USERNAME=vaybe_user
DB_PASSWORD=                    # Depuis Render PostgreSQL dashboard
DB_SSLMODE=require

# CORS — doit correspondre exactement à l'URL Vercel
FRONTEND_URL=https://vaybe.vercel.app

# Session / Cache / Queue
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync

# Logs (obligatoire sur Render pour voir les erreurs)
LOG_CHANNEL=stderr
LOG_LEVEL=error

# Stockage avatars
# Option A — disk local (avatars perdus au redéploiement, ok pour test)
FILESYSTEM_DISK=public

# Option B — S3 ou Cloudflare R2 (recommandé pour la production)
# FILESYSTEM_DISK=s3
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_DEFAULT_REGION=us-east-1
# AWS_BUCKET=vaybe-avatars
# AWS_URL=https://vaybe-avatars.s3.amazonaws.com
# AWS_ENDPOINT=                 # Laisser vide pour AWS S3, renseigner pour R2

# Admin
ADMIN_EMAIL=admin@vaybe.com
ADMIN_PASSWORD=                 # Mot de passe fort, min 16 caractères
ADMIN_SESSION_HOURS=12
```

## Frontend (Vercel Dashboard → Settings → Environment Variables)

```
REACT_APP_API_URL=https://vaybe-backend.onrender.com/api
```

## Ordre de déploiement

1. Créer la base PostgreSQL sur Render → copier les credentials
2. Renseigner toutes les variables backend sur Render
3. Connecter le repo GitHub backend sur Render → déclencher un premier deploy
4. Vérifier que le backend répond : GET https://vaybe-backend.onrender.com/up
5. Vérifier l'API : GET https://vaybe-backend.onrender.com/api/health
6. Renseigner REACT_APP_API_URL sur Vercel
7. Connecter le repo GitHub frontend sur Vercel → deploy
8. Tester la connexion frontend ↔ backend

## Notes importantes

- Sur Render free tier, le service "spin down" après 15 min d'inactivité.
  La première requête après inactivité prend ~30s (cold start). Normal.
- Le filesystem Render est éphémère : les fichiers uploadés (avatars) sont
  perdus à chaque redéploiement si FILESYSTEM_DISK=public.
  Utiliser S3/R2 pour la production réelle.
- php artisan storage:link n'est PAS dans le buildCommand car inutile avec S3,
  et le lien symlink est perdu au redéploiement sur Render.
