"""Schema layer public exports.

Routers continue importing from app.schemas while schemas are organized into
feature modules behind this facade.
"""

from .legacy import *  # noqa: F401,F403
