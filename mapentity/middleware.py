import logging

from django.contrib.auth import login

from .tokens import TokenManager
from .utils import get_internal_user

logger = logging.getLogger(__name__)


class AutoLoginMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_anonymous:
            auth_token = request.GET.get("auth_token")
            if auth_token:
                internal_user = get_internal_user()
                if TokenManager.verify_token(auth_token):
                    login(request, internal_user)
                    request.user = internal_user
                    msg = f"authenticated {auth_token}"
                    logger.info(msg)
                    # token is deleted after one authentication
                    TokenManager.delete_token(auth_token)
                else:
                    msg = f"not authenticated {auth_token}"
                    logger.warning(msg)
        return self.get_response(request)
