"""Generate the runtime referrals store from the committed seed dataset.

Reads ``data/referrals_seed.json`` (reviewable synthetic data with relative
``days_ago`` offsets) and writes ``data/referrals.json`` with timestamps anchored
to now, so the coordination board always shows a believable spread of ages.

Safe to re-run: it clears existing referrals first.

    python scripts/seed_referrals.py
"""

import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_settings  # noqa: E402
from core.referral_store import ReferralStore  # noqa: E402
from models.referral_intake import Referral  # noqa: E402


def _referred_at(days_ago: int, index: int) -> str:
    """Anchor a seed offset to now, varying the hour so ages are not identical."""
    moment = datetime.now(UTC) - timedelta(days=days_ago, hours=(index * 3) % 24)
    return moment.isoformat()


def main() -> None:
    settings = get_settings()
    seed_path = settings.data_dir / "referrals_seed.json"
    store_path = settings.data_dir / "referrals.json"
    store_path.unlink(missing_ok=True)  # start clean
    store = ReferralStore(store_path)

    records = json.loads(seed_path.read_text(encoding="utf-8"))
    for index, record in enumerate(records):
        referral = Referral(
            referral_id=record["referral_id"],
            patient_id=record.get("patient_id"),
            patient_name=record["patient_name"],
            source=record["source"],
            reason_for_referral=record["reason_for_referral"],
            electronic_note=record.get("electronic_note"),
            handover_note=record.get("handover_note"),
            referred_at=_referred_at(record["days_ago"], index),
            # A seed row may pre-link a completed case (e.g. the family-portal
            # demo patient), so updates/notes logged live are seen as "new".
            status=record.get("status", "new"),
            case_id=record.get("case_id"),
            clinical_reviewed_at=record.get("clinical_reviewed_at"),
        )
        store.create(referral)

    print(f"Seeded {len(store.list_all())} referrals into {store_path}.")


if __name__ == "__main__":
    main()
