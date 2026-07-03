"""Repository layer public exports.

This compatibility facade keeps existing imports stable while repository
classes are moved into focused modules over time.
"""

from .legacy import *  # noqa: F401,F403
