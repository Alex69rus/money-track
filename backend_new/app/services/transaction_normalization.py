from collections.abc import Iterable


def normalize_currency(value: str) -> str:
    normalized = value.strip().upper()
    if not normalized:
        raise ValueError("Currency must not be blank")
    return normalized


def normalize_tag(value: str) -> str:
    return value.strip().lower()


def normalize_tags(values: Iterable[str] | None) -> list[str]:
    if values is None:
        return []

    normalized_tags: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = normalize_tag(value)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        normalized_tags.append(normalized)

    return normalized_tags
