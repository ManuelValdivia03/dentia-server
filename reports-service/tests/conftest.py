from pathlib import Path
import sys

REPORTS_SERVICE_ROOT = Path(__file__).resolve().parents[1]

if str(REPORTS_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(REPORTS_SERVICE_ROOT))