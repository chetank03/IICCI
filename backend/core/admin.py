from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import TradeRecord


# Unregister default User admin, re-register with customizations
admin.site.unregister(User)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "is_staff", "is_superuser", "is_active", "date_joined")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email")


@admin.register(TradeRecord)
class TradeRecordAdmin(admin.ModelAdmin):
    list_display = (
        "year",
        "hs2",
        "hs4",
        "description_short",
        "sector",
        "italy_to_india_value",
        "india_to_italy_value",
    )
    list_filter = ("year", "sector", "hs2")
    search_fields = ("hs4", "hs2", "description", "sector")
    list_per_page = 50
    ordering = ("-year", "hs2", "hs4")

    def description_short(self, obj):
        return obj.description[:60] + "..." if len(obj.description) > 60 else obj.description
    description_short.short_description = "Description"


# Admin site branding
admin.site.site_header = "IICCI Trade Analytics Admin"
admin.site.site_title = "IICCI Admin"
admin.site.index_title = "Manage Trade Data & Users"
