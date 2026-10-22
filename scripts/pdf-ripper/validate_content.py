from typing import Any


# ============================================================
# SOURCE CONFIG
# ============================================================

SOURCE_CONFIG: dict[str, dict[str, Any]] = {
    "jft": {
        "expected_total": 366,
        "titleless_dates": {"08/01"},
        "has_closing": True,
    },
    "daily_stoic": {
        "expected_total": 366,
        "titleless_dates": set(),
        "has_closing": False,
    },
}


# ============================================================
# CALENDAR
# ============================================================


def build_expected_dates() -> set[str]:
    """
    Build the expected 366 calendar dates.

    Includes February 29 because these books contain
    366 daily entries.
    """

    days_per_month = {
        1: 31,
        2: 29,
        3: 31,
        4: 30,
        5: 31,
        6: 30,
        7: 31,
        8: 31,
        9: 30,
        10: 31,
        11: 30,
        12: 31,
    }

    return {
        f"{month:02d}/{day:02d}"
        for month, max_day in days_per_month.items()
        for day in range(1, max_day + 1)
    }


# ============================================================
# HELPERS
# ============================================================


def sort_key(value: str) -> tuple[int, int]:
    """
    Convert MM/DD into a sortable tuple.
    """

    month, day = value.split("/")

    return int(month), int(day)


def find_lowercase_starts(
    entries: list[dict[str, Any]],
) -> list[str]:
    """
    Dates of entries whose content starts with a lowercase letter.

    A reading never starts mid-word. When one does, extraction has lost the
    opening letter (the Daily Stoic's drop cap once went missing from most
    readings and nothing noticed).
    """

    return [
        entry["date"]
        for entry in entries
        if entry.get("content")
        and entry["content"][0].islower()
    ]


# ============================================================
# ENTRY VALIDATION
# ============================================================


def validate_entries(
    entries: list[dict[str, Any]],
    source_type: str,
) -> bool:
    """
    Validate entries for a single source.

    Returns True when all checks pass.
    """

    config = SOURCE_CONFIG.get(source_type)

    if config is None:
        print(
            f"❌ Unknown source type: {source_type}"
        )
        return False

    valid = True

    print(f"Source type:   {source_type}")
    print(f"Total entries: {len(entries)}")

    # --------------------------------------------------------
    # Total count
    # --------------------------------------------------------

    expected_total = config["expected_total"]

    if len(entries) == expected_total:
        print(
            f"✓ Found all {expected_total} daily entries"
        )
    else:
        print(
            f"❌ Expected {expected_total} entries, "
            f"found {len(entries)}"
        )
        valid = False

    # --------------------------------------------------------
    # Dates
    # --------------------------------------------------------

    dates = [
        entry.get("date")
        for entry in entries
    ]

    unique_dates = set(dates)

    print(
        f"Unique dates: {len(unique_dates)}"
    )

    # --------------------------------------------------------
    # Duplicate dates
    # --------------------------------------------------------

    duplicates = sorted(
        {
            date
            for date in dates
            if dates.count(date) > 1
        },
        key=sort_key,
    )

    if duplicates:
        print("❌ Duplicate dates detected:")

        for date in duplicates:
            print(f"  - {date}")

        valid = False

    else:
        print("✓ No duplicate dates")

    # --------------------------------------------------------
    # Missing content
    # --------------------------------------------------------

    missing_content = [
        entry.get("date")
        for entry in entries
        if not entry.get("content")
    ]

    if missing_content:
        print(
            f"❌ Entries without content: "
            f"{len(missing_content)}"
        )

        for date in missing_content:
            print(f"  - {date}")

        valid = False

    else:
        print("✓ All entries have content")

    # --------------------------------------------------------
    # Readings that start mid-word
    # --------------------------------------------------------

    lowercase_starts = find_lowercase_starts(entries)

    if lowercase_starts:
        print(
            f"❌ Entries starting mid-word "
            f"(opening letter lost): {len(lowercase_starts)}"
        )

        for date in lowercase_starts[:10]:
            print(f"  - {date}")

        if len(lowercase_starts) > 10:
            print(
                f"  ... and {len(lowercase_starts) - 10} more"
            )

        valid = False

    else:
        print("✓ No entry starts mid-word")

    # --------------------------------------------------------
    # Missing closing
    # --------------------------------------------------------

    if config["has_closing"]:
        missing_closing = [
            entry.get("date")
            for entry in entries
            if not entry.get("closing")
        ]

        if missing_closing:
            print(
                f"❌ Entries without closing: "
                f"{len(missing_closing)}"
            )

            for date in missing_closing:
                print(f"  - {date}")

            valid = False

        else:
            print("✓ All entries have closing")

    else:
        print(
            "ℹ Closing not applicable for this source"
        )

    # --------------------------------------------------------
    # Missing titles
    # --------------------------------------------------------

    missing_titles = [
        entry.get("date")
        for entry in entries
        if not entry.get("title")
    ]

    expected_titleless = config["titleless_dates"]

    if missing_titles:
        print()
        print(
            f"Entries without titles: "
            f"{len(missing_titles)}"
        )

        for date in missing_titles:
            print(f"  - {date}")

        unexpected_titleless = (
            set(missing_titles)
            - expected_titleless
        )

        missing_expected_titleless = (
            expected_titleless
            - set(missing_titles)
        )

        if unexpected_titleless:
            print(
                "❌ Unexpected title-less entries:"
            )

            for date in sorted(
                unexpected_titleless,
                key=sort_key,
            ):
                print(f"  - {date}")

            valid = False

        if missing_expected_titleless:
            print(
                "❌ Expected title-less entries "
                "were not title-less:"
            )

            for date in sorted(
                missing_expected_titleless,
                key=sort_key,
            ):
                print(f"  - {date}")

            valid = False

    else:
        print("✓ Every entry has a title")

        if expected_titleless:
            print(
                "❌ Expected title-less dates "
                "were not found:"
            )

            for date in sorted(
                expected_titleless,
                key=sort_key,
            ):
                print(f"  - {date}")

            valid = False

    # --------------------------------------------------------
    # Chronological order
    # --------------------------------------------------------

    try:
        sorted_dates = sorted(
            dates,
            key=sort_key,
        )

        if dates == sorted_dates:
            print(
                "✓ Entries are chronologically ordered"
            )
        else:
            print(
                "❌ Entries are not "
                "chronologically ordered"
            )

            valid = False

    except (
        ValueError,
        IndexError,
        AttributeError,
    ):
        print(
            "❌ Could not evaluate chronological "
            "order (malformed date values)"
        )

        valid = False

    # --------------------------------------------------------
    # Calendar completeness
    # --------------------------------------------------------

    if config["expected_total"] == 366:
        expected_dates = build_expected_dates()
        actual_dates = set(dates)

        missing_dates = sorted(
            expected_dates - actual_dates,
            key=sort_key,
        )

        unexpected_dates = sorted(
            actual_dates - expected_dates,
            key=sort_key,
        )

        if missing_dates:
            print()
            print("❌ Missing expected dates:")

            for date in missing_dates:
                print(f"  - {date}")

            valid = False

        else:
            print("✓ No missing calendar dates")

        if unexpected_dates:
            print()
            print("❌ Unexpected dates:")

            for date in unexpected_dates:
                print(f"  - {date}")

            valid = False

    return valid


# ============================================================
# MAIN VALIDATOR
# ============================================================


def validate_content(
    jft: list[dict[str, Any]],
    daily_stoic: list[dict[str, Any]],
) -> bool:
    """
    Validate JFT and Daily Stoic content.

    This function is pure with respect to files:

    - Does not read JSON files.
    - Does not read PDFs.
    - Does not write files.
    - Does not call sys.exit().

    Returns:
        True  -> all validation checks passed.
        False -> one or more checks failed.
    """

    print("=" * 60)
    print("ASCEND CONTENT VALIDATOR")
    print("=" * 60)

    sources = {
        "jft": jft,
        "daily_stoic": daily_stoic,
    }

    overall_valid = True

    for source_type, entries in sources.items():
        print()
        print("=" * 60)
        print(
            f"VALIDATING: {source_type.upper()}"
        )
        print("=" * 60)

        if not isinstance(entries, list):
            print(
                f"❌ {source_type} must be a list"
            )

            overall_valid = False
            continue

        valid = validate_entries(
            entries,
            source_type,
        )

        print("=" * 60)

        if valid:
            print(
                f"✓ {source_type.upper()}: PASSED"
            )
        else:
            print(
                f"❌ {source_type.upper()}: FAILED"
            )

            overall_valid = False

    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)

    if overall_valid:
        print(
            "✓ ALL CONTENT PASSED VALIDATION"
        )
    else:
        print(
            "❌ CONTENT VALIDATION FAILED"
        )

    print("=" * 60)

    return overall_valid


# ============================================================
# DIRECT EXECUTION
# ============================================================

if __name__ == "__main__":
    print(
        "This module is intended to be called "
        "through validate_content(jft, daily_stoic)."
    )
