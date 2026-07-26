"""Test settings.

The app targets Postgres, but the test suite covers filtering, aggregation, caching and
permissions, none of which depend on the backend. Running against in-memory sqlite means
the suite needs no database server, so it works on a fresh clone and in CI.

Usage:
    python manage.py test --settings=backend.settings_test
"""

from .settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# A local-memory cache, so cache behaviour is exercised without needing Redis and
# without one test's cached response leaking into another's assertions.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "iicci-tests",
    }
}

# Never send mail from a test run.
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Hashing passwords properly is slow and irrelevant here.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

DEBUG = False
