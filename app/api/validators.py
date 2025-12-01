import re


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^[+]?\d[\d\s\-()]{6,}$")


def is_email(value: str) -> bool:
    return bool(EMAIL_RE.match(value or ""))


def is_phone(value: str) -> bool:
    return bool(PHONE_RE.match(value or ""))

