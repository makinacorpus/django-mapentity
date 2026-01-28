from . import *  # NOQA

DEBUG = False

ALLOWED_HOST = os.getenv("SERVER_NAME", "").split(",")
