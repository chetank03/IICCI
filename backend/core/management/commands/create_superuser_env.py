import os
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create a superuser from environment variables (SUPER_USERNAME, SUPER_EMAIL, SUPER_PASSWORD)"

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get("SUPER_USERNAME")
        email = os.environ.get("SUPER_EMAIL", "")
        password = os.environ.get("SUPER_PASSWORD")

        if not username or not password:
            self.stdout.write("SUPER_USERNAME and SUPER_PASSWORD env vars are required. Skipping.")
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(f"Superuser '{username}' already exists. Skipping.")
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(f"Superuser '{username}' created successfully.")
