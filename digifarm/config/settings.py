"""Réglages Django de Digi-Farm.

Aucun secret en dur (règle n°3) : tout vient de l'environnement, éventuellement
chargé depuis un fichier .env à la racine du dépôt.
"""

import os
from pathlib import Path

# digifarm/
BASE_DIR = Path(__file__).resolve().parent.parent
# racine du dépôt (contient docs/, media/, .env)
REPO_DIR = BASE_DIR.parent


def _charger_env(chemin: Path) -> None:
    """Charge un .env minimal (CLE=valeur) sans dépendance externe.

    Les variables déjà présentes dans l'environnement ne sont pas écrasées.
    """
    if not chemin.is_file():
        return
    for ligne in chemin.read_text(encoding="utf-8").splitlines():
        ligne = ligne.strip()
        if not ligne or ligne.startswith("#") or "=" not in ligne:
            continue
        cle, _, valeur = ligne.partition("=")
        os.environ.setdefault(cle.strip(), valeur.strip().strip("\"'"))


_charger_env(REPO_DIR / ".env")


def env_bool(cle: str, defaut: bool) -> bool:
    valeur = os.environ.get(cle)
    if valeur is None:
        return defaut
    return valeur.lower() in {"1", "true", "yes", "oui"}


DEBUG = env_bool("DJANGO_DEBUG", True)

# En développement seulement, une clé jetable évite d'imposer un .env pour lancer
# le serveur. En production (DEBUG=False), l'absence de la variable est fatale.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError(
            "DJANGO_SECRET_KEY est obligatoire hors développement "
            "(voir .env.example)."
        )
    SECRET_KEY = "dev-uniquement-ne-jamais-utiliser-en-production"

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

# Secret de signature des webhooks de l'agrégateur de paiement.
PAYMENT_WEBHOOK_SECRET = os.environ.get("PAYMENT_WEBHOOK_SECRET", "")
if not PAYMENT_WEBHOOK_SECRET:
    if not DEBUG:
        raise RuntimeError("PAYMENT_WEBHOOK_SECRET est obligatoire hors développement.")
    PAYMENT_WEBHOOK_SECRET = "dev-webhook-secret"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core",
    "comptes",
    "annonces",
    "commandes",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "comptes.context_processors.profil_courant",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
        "OPTIONS": {
            # WAL : lectures concurrentes pendant une écriture (utile en prod mono-serveur).
            "init_command": "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;",
            "transaction_mode": "IMMEDIATE",
        },
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Langue et fuseau ---

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Lome"
USE_I18N = True
USE_TZ = True

# --- Fichiers statiques et médias ---

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        if DEBUG
        else "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"
    },
}

# Les photos d'annonces vivent à la racine du dépôt (partagées avec l'ancienne app).
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.environ.get("DIGIFARM_MEDIA_ROOT", REPO_DIR / "media"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Authentification ---

AUTH_USER_MODEL = "auth.User"  # utilisateur Django standard + comptes.Profil (1-1)
LOGIN_URL = "comptes:connexion"
LOGIN_REDIRECT_URL = "comptes:tableau_de_bord"
LOGOUT_REDIRECT_URL = "annonces:accueil"

# --- Sécurité des cookies ---

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 jours, comme les sessions de l'app Next
SESSION_COOKIE_SECURE = env_bool("DJANGO_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("DJANGO_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SAMESITE = "Lax"
X_FRAME_OPTIONS = "DENY"

if not DEBUG:
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SSL_REDIRECT", True)
    SECURE_CONTENT_TYPE_NOSNIFF = True

# Taille maximale d'un upload photo avant compression (5 Mo).
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024

MESSAGE_STORAGE = "django.contrib.messages.storage.cookie.CookieStorage"
