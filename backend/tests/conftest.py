import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


import pytest

from app.core import rate_limit


@pytest.fixture(autouse=True)
def _clear_rate_limit():
    """Each test starts with a fresh allowance, so one test cannot 429 the next."""
    rate_limit.reset()
    yield
    rate_limit.reset()
