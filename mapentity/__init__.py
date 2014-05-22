import logging

from .settings import app_settings
from .registry import Registry


__all__ = ['app_settings', 'registry', 'logger']

logger = logging.getLogger(__name__)

registry = Registry()
