import json
from pathlib import Path
from typing import Any

from extract_jft import extract_jft
from extract_the_daily_stoic import extract_the_daily_stoic
from validate_content import validate_content

JFT_OUTPUT_PATH = Path("../../data/contents/jft.json")
DAILY_STOIC_OUTPUT_PATH = Path("../../data/contents/daily-stoic.json")

def save_json(
    entries: list[dict[str, Any]],
    path: Path,
) -> None:
    """
    Save entries as formatted UTF-8 JSON.
    """

    # Create directory automatically.
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            entries,
            file,
            ensure_ascii=False,
            indent=2,
        )

    print()
    print(
        f"✓ Saved {len(entries)} entries to:"
    )

if __name__ == "__main__":
    jft = extract_jft()
    daily_stoic = extract_the_daily_stoic()

    if not validate_content(jft, daily_stoic):
        print()
        print("❌ Content validation failed.")
        exit(1)

    save_json(jft, JFT_OUTPUT_PATH)
    save_json(daily_stoic, DAILY_STOIC_OUTPUT_PATH)

    print()
    print("✓ Content validation passed.")

