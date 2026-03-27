from django.urls import path
from .views import (
    csrf, session_login, session_logout, me,
    request_otp, verify_otp, signup,
    stats_summary, stats_yearwise, stats_sector_wise,
    stats_top_products, filter_options,
    trade_table,
    admin_list_users, admin_create_user, admin_update_user,
    admin_delete_user, admin_stats, admin_import_excel,
    approve_user, reject_user,
)

urlpatterns = [
    # auth
    path("auth/csrf/", csrf),
    path("auth/login/", session_login),
    path("auth/logout/", session_logout),
    path("auth/me/", me),
    # signup
    path("auth/request-otp/", request_otp),
    path("auth/verify-otp/", verify_otp),
    path("auth/signup/", signup),
    # public stats
    path("stats/summary/", stats_summary),
    path("stats/yearwise/", stats_yearwise),
    path("stats/sector-wise/", stats_sector_wise),
    path("stats/top-products/", stats_top_products),
    path("stats/filters/", filter_options),
    # private table
    path("trade/table/", trade_table),
    # admin
    path("admin/stats/", admin_stats),
    path("admin/users/", admin_list_users),
    path("admin/users/create/", admin_create_user),
    path("admin/users/<int:user_id>/", admin_update_user),
    path("admin/users/<int:user_id>/delete/", admin_delete_user),
    path("admin/users/<int:user_id>/approve/", approve_user),
    path("admin/users/<int:user_id>/reject/", reject_user),
    path("admin/import-excel/", admin_import_excel),
]
