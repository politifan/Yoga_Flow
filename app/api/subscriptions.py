from datetime import datetime
from typing import Any, Dict, List, Optional

from app.api.storage import load_json


def _plan_lookup() -> Dict[str, Dict[str, Any]]:
    plans = load_json("data/plans.json")
    return {p.get("id"): p for p in plans}


def _parse_iso(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        normalized = dt_str.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def _format_date(dt_str: Optional[str]) -> Optional[str]:
    parsed = _parse_iso(dt_str)
    return parsed.strftime("%d.%m.%Y") if parsed else None


def serialize_subscription(sub: Dict[str, Any], plans: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    plan = plans.get(sub.get("plan_id")) or {}
    price = plan.get("price_rub") or plan.get("price_usd")
    return {
        "id": sub.get("id"),
        "plan_id": sub.get("plan_id"),
        "plan_name": plan.get("name") or sub.get("plan_id"),
        "price_rub": price,
        "price_label": f"{price} ₽/мес" if price else None,
        "status": sub.get("status", "pending"),
        "ends_at": sub.get("ends_at"),
        "ends_at_display": _format_date(sub.get("ends_at")),
        "detail_url": f"/subscriptions/{sub.get('id')}",
        "renew_url": f"/pricing?plan={sub.get('plan_id')}",
        "cancel_url": f"/subscriptions/{sub.get('id')}/cancel",
        "is_active": sub.get("status") == "active",
    }


def user_subscriptions(uid: str) -> List[Dict[str, Any]]:
    subs = load_json("data/subscriptions.json")
    plans = _plan_lookup()
    user_items = [s for s in subs if s.get("user_id") == uid]
    return [serialize_subscription(s, plans) for s in user_items]

