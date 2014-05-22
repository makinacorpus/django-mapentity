import logging

__all__ = ['app_settings', 'registry', 'logger']

logger = logging.getLogger(__name__)

from .settings import app_settings
from .registry import Registry

registry = Registry()
