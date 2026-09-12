import re
from pathlib import Path
from typing import Any, cast

import fitz


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent.parent

PDF_PATH = BASE_DIR / "data"/ "books" / "just-for-today.pdf"

# ============================================================
# CONSTANTS
# ============================================================

MONTHS = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}


# The PDF contains one genuinely title-less entry.
#
# August 1 appears as:
#
#   August 1
#   "Our addiction enslaved us. We were prisoners..."
#   Basic Text, p.7
#
# There is no title between the date and quote.
TITLELESS_DATES = {
    "08/01",
}


# ============================================================
# REGEX
# ============================================================

# Handles both:
#
#   June 1
#   June1
#
DATE_PATTERN = re.compile(
    r"^(January|February|March|April|May|June|July|August|"
    r"September|October|November|December)\s*(\d{1,2})$",
    re.IGNORECASE,
)


# ============================================================
# PDF TEXT CLEANING
# ============================================================


def clean_line(line: str) -> str:
    """
    Clean common PDF extraction artifacts.
    """

    # Remove soft hyphen.
    line = line.replace("\u00ad", "")

    # PDF artifact found in some words.
    #
    # Example:
    #
    #   self￾centeredness
    #
    # becomes:
    #
    #   self-centeredness
    line = line.replace("￾", "-")

    # Remove watermark.
    line = line.replace("OceanofPDF.com", "")

    # Normalize whitespace.
    line = re.sub(r"\s+", " ", line)

    return line.strip()


# ============================================================
# DATE
# ============================================================


def is_date(line: str) -> bool:
    """
    Return True when a line represents a calendar date.
    """

    return DATE_PATTERN.match(line) is not None


def parse_date(line: str) -> tuple[int, int]:
    """
    Parse a date line into month and day.

    Example:

        January 6 -> (1, 6)
        June1     -> (6, 1)
    """

    match = DATE_PATTERN.match(line)

    if not match:
        raise ValueError(
            f"Invalid date line: {line}"
        )

    month_name = match.group(1).capitalize()
    day = int(match.group(2))

    return MONTHS[month_name], day


# ============================================================
# PDF EXTRACTION
# ============================================================


def extract_pages() -> list[list[str]]:
    """
    Extract text from every page of the PDF.

    Each page becomes a list of cleaned lines.
    """

    pages: list[list[str]] = []

    with fitz.open(PDF_PATH) as document:
        for page in document:
            raw_text = cast(
                str,
                page.get_text("text"),
            )

            lines = [
                clean_line(line)
                for line in raw_text.splitlines()
            ]

            lines = [
                line
                for line in lines
                if line
            ]

            pages.append(lines)

    return pages


# ============================================================
# DATE SEARCH
# ============================================================


def find_date(
    lines: list[str],
) -> int | None:
    """
    Find the date line in a page.
    """

    for index, line in enumerate(lines):
        if is_date(line):
            return index

    return None


# ============================================================
# REFERENCE DETECTION
# ============================================================


REFERENCE_PATTERNS = [
    re.compile(
        r"^basic text\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"^ip\s*no\.",
        re.IGNORECASE,
    ),
    re.compile(
        r"^step\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"^tradition\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"^traditions\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"^gratitude prayer\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"^serenity prayer\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"^twelfth tradition\b",
        re.IGNORECASE,
    ),
]


def is_reference(line: str) -> bool:
    """
    Determine whether a line is a reference.
    """

    line = line.strip()

    for pattern in REFERENCE_PATTERNS:
        if pattern.search(line):
            return True

    return False


def find_reference(
    lines: list[str],
) -> int | None:
    """
    Find the reference after the quote.

    References occur near the beginning of the entry.
    """

    # The reference should appear fairly early.
    search_limit = min(
        len(lines),
        15,
    )

    for index in range(search_limit):
        if is_reference(lines[index]):
            return index

    return None


# ============================================================
# QUOTE END
# ============================================================


def find_quote_end(
    lines: list[str],
) -> int | None:
    """
    Find the end of a quote when there is no reference.

    Some JFT entries don't have a reference.

    We look for a line ending in a closing quotation mark.
    """

    for index, line in enumerate(lines):
        stripped = line.strip()

        if stripped.endswith(
            (
                '"',
                "”",
            )
        ):
            return index

    return None


# ============================================================
# QUOTE EXTRACTION
# ============================================================


def extract_quote(
    lines: list[str],
) -> tuple[str | None, str | None, int]:
    """
    Extract quote and reference.

    Returns:

        quote_text
        reference
        consumed_line_count
    """

    if not lines:
        return None, None, 0

    # --------------------------------------------------------
    # First preference:
    #
    # Find an explicit reference.
    # --------------------------------------------------------

    reference_index = find_reference(lines)

    if reference_index is not None:
        quote_lines = lines[:reference_index]

        quote_text = " ".join(
            line.strip()
            for line in quote_lines
            if line.strip()
        ).strip()

        reference = lines[
            reference_index
        ].strip()

        return (
            quote_text or None,
            reference or None,
            reference_index + 1,
        )

    # --------------------------------------------------------
    # Second preference:
    #
    # There is no reference.
    #
    # Try to detect the closing quote.
    # --------------------------------------------------------

    quote_end = find_quote_end(lines)

    if quote_end is not None:
        quote_lines = lines[
            : quote_end + 1
        ]

        quote_text = " ".join(
            line.strip()
            for line in quote_lines
            if line.strip()
        ).strip()

        return (
            quote_text or None,
            None,
            quote_end + 1,
        )

    # --------------------------------------------------------
    # Last resort.
    # --------------------------------------------------------

    return (
        lines[0].strip() or None,
        None,
        1,
    )


# ============================================================
# CLOSING
# ============================================================


def find_closing(
    lines: list[str],
) -> int | None:
    """
    Find the 'Just for today:' line.
    """

    for index, line in enumerate(lines):
        if line.lower().startswith(
            "just for today:"
        ):
            return index

    return None


def normalize_closing(
    lines: list[str],
) -> str | None:
    """
    Convert closing lines into one string.

    Removes the leading:

        Just for today:
    """

    text = " ".join(
        line.strip()
        for line in lines
        if line.strip()
    ).strip()

    text = re.sub(
        r"^just for today:\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    return text or None


# ============================================================
# TITLE
# ============================================================


QUOTE_PAIRS = {
    '"': '"',
    "'": "'",
    "\u201c": "\u201d",
}


def normalize_title(
    title: str,
) -> str:
    """
    Normalize a title.

    The PDF contains titles such as:

        "How Does It Work?"
        "Recovery"
        "Defects"

    These are fully wrapped in quotation marks, so the
    wrapping pair is stripped.

    Some titles instead contain an embedded quoted word,
    without wrapping the whole title:

        "Pure" motives
        "Good" and "bad" feelings

    These are NOT fully wrapped (they don't end in a
    quotation mark), so they must be left untouched.
    Stripping only the leading quote in that case would
    produce an unbalanced result like:

        Pure" motives
    """

    title = title.strip()

    if title:
        closing = QUOTE_PAIRS.get(title[0])

        if closing is not None and title.endswith(closing):
            title = title[1:-1].strip()

    return title


# ============================================================
# ENTRY PARSER
# ============================================================


def parse_entry(
    page_lines: list[str],
) -> dict[str, Any] | None:
    """
    Parse one JFT entry.

    IMPORTANT:

    In this particular PDF, the first line after the date
    is the title for every entry except 08/01.

    Do NOT infer title presence from quotation marks.

    For example:

        January 6
        "How Does It Work?"
        "I used to think..."
        Basic Text p. 272

    The first quoted line is the TITLE.

    August 1 is the one verified title-less entry:

        August 1
        "Our addiction enslaved us..."
        Basic Text, p.7
    """

    # --------------------------------------------------------
    # Find date.
    #
    # NOTE:
    #
    # Recurring page headers ("Just For Today",
    # "Daily Meditations for Recovering Addicts") always
    # appear BEFORE the date line, in the page preamble.
    #
    # That preamble is discarded below regardless (only
    # lines after the date are used), so header removal is
    # unnecessary here.
    #
    # Do NOT strip headers from the whole page: at least one
    # entry (09/29) has a genuine title, "Just for today",
    # which is textually identical to the recurring header
    # and appears AFTER the date. Blindly removing headers
    # from the whole page deletes that title.
    # --------------------------------------------------------

    lines = page_lines

    date_index = find_date(lines)

    if date_index is None:
        return None

    month, day = parse_date(
        lines[date_index]
    )

    date_string = f"{month:02d}/{day:02d}"

    # --------------------------------------------------------
    # Everything after date.
    # --------------------------------------------------------

    remaining = lines[
        date_index + 1 :
    ]

    if not remaining:
        return None

    # --------------------------------------------------------
    # Find closing.
    # --------------------------------------------------------

    closing_index = find_closing(
        remaining
    )

    if closing_index is None:
        return None

    before_closing = remaining[
        :closing_index
    ]

    closing_lines = remaining[
        closing_index:
    ]

    if not before_closing:
        return None

    # --------------------------------------------------------
    # Determine title.
    # --------------------------------------------------------

    if date_string in TITLELESS_DATES:
        title = None
        quote_and_content = before_closing

    else:
        # The first line after the date is the title.
        title = normalize_title(
            before_closing[0]
        )

        quote_and_content = before_closing[
            1:
        ]

    # --------------------------------------------------------
    # Extract quote.
    # --------------------------------------------------------

    quote_text, reference, consumed = (
        extract_quote(
            quote_and_content
        )
    )

    # --------------------------------------------------------
    # Everything after quote/reference is content.
    # --------------------------------------------------------

    content_lines = quote_and_content[
        consumed:
    ]

    content = " ".join(
        line.strip()
        for line in content_lines
        if line.strip()
    ).strip()

    # --------------------------------------------------------
    # Closing.
    # --------------------------------------------------------

    closing = normalize_closing(
        closing_lines
    )

    # --------------------------------------------------------
    # Return normalized entry.
    # --------------------------------------------------------

    return {
        "date": date_string,
        "month": month,
        "day": day,
        "source": {
            "type": "jft",
            "name": "Just for Today",
        },
        "title": title,
        "quote": {
            "text": quote_text,
            "reference": reference,
        },
        "content": content,
        "closing": closing,
    }


# ============================================================
# EXTRACTION
# ============================================================


def extract_entries() -> list[dict[str, Any]]:
    """
    Extract all JFT entries.
    """

    pages = extract_pages()

    entries: list[dict[str, Any]] = []

    for page_number, page_lines in enumerate(
        pages,
        start=1,
    ):
        entry = parse_entry(
            page_lines
        )

        if entry is None:
            continue

        entries.append(entry)

        title = (
            entry["title"]
            if entry["title"]
            else "(no title)"
        )

        print(
            f"Page {page_number}: "
            f"{entry['date']} - {title}"
        )

    return entries


# ============================================================
# EXPECTED DATES
# ============================================================


def build_expected_dates() -> set[str]:
    """
    Build the expected 366 calendar dates.

    Includes February 29 because the source contains 366
    daily entries.
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
        for day in range(
            1,
            max_day + 1,
        )
    }


# ============================================================
# VALIDATION
# ============================================================


def validate_entries(
    entries: list[dict[str, Any]],
) -> bool:
    """
    Validate the extracted JFT entries.
    """

    print()
    print("=" * 60)
    print("EXTRACTION VALIDATION")
    print("=" * 60)

    valid = True

    # --------------------------------------------------------
    # Total count.
    # --------------------------------------------------------

    print(
        f"Total entries: {len(entries)}"
    )

    if len(entries) == 366:
        print(
            "✓ Found all 366 daily entries"
        )
    else:
        print(
            f"❌ Expected 366 entries, "
            f"found {len(entries)}"
        )
        valid = False

    # --------------------------------------------------------
    # Dates.
    # --------------------------------------------------------

    dates = [
        entry["date"]
        for entry in entries
    ]

    unique_dates = set(dates)

    print(
        f"Unique dates: "
        f"{len(unique_dates)}"
    )

    # --------------------------------------------------------
    # Duplicate dates.
    # --------------------------------------------------------

    duplicates = sorted(
        {
            date
            for date in dates
            if dates.count(date) > 1
        },
        key=lambda value: (
            int(value.split("/")[0]),
            int(value.split("/")[1]),
        ),
    )

    if duplicates:
        print(
            "❌ Duplicate dates detected:"
        )

        for date in duplicates:
            print(f"  - {date}")

        valid = False

    else:
        print("✓ No duplicate dates")

    # --------------------------------------------------------
    # Missing content.
    # --------------------------------------------------------

    missing_content = [
        entry["date"]
        for entry in entries
        if not entry["content"]
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
        print(
            "✓ All entries have content"
        )

    # --------------------------------------------------------
    # Missing closing.
    # --------------------------------------------------------

    missing_closing = [
        entry["date"]
        for entry in entries
        if not entry["closing"]
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
        print(
            "✓ All entries have closing"
        )

    # --------------------------------------------------------
    # Missing titles.
    # --------------------------------------------------------

    missing_titles = [
        entry["date"]
        for entry in entries
        if entry["title"] is None
    ]

    if missing_titles:
        print()
        print(
            f"Entries without titles: "
            f"{len(missing_titles)}"
        )

        for date in missing_titles:
            print(f"  - {date}")

        # According to the actual PDF, only 08/01
        # should be title-less.
        expected_titleless = TITLELESS_DATES

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
                "❌ Unexpected title-less "
                "entries:"
            )

            for date in sorted(
                unexpected_titleless
            ):
                print(f"  - {date}")

            valid = False

        if missing_expected_titleless:
            print(
                "❌ Expected title-less "
                "entries were not title-less:"
            )

            for date in sorted(
                missing_expected_titleless
            ):
                print(f"  - {date}")

            valid = False

    else:
        print(
            "✓ Every entry has a title"
        )

        # This should not happen with the current PDF,
        # because 08/01 is intentionally title-less.
        print(
            "WARNING: Expected 08/01 to "
            "be title-less"
        )

    # --------------------------------------------------------
    # Chronological order.
    # --------------------------------------------------------

    sorted_dates = sorted(
        dates,
        key=lambda value: (
            int(value.split("/")[0]),
            int(value.split("/")[1]),
        ),
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

    # --------------------------------------------------------
    # Calendar completeness.
    # --------------------------------------------------------

    expected_dates = build_expected_dates()

    actual_dates = set(dates)

    missing_dates = sorted(
        expected_dates - actual_dates,
        key=lambda value: (
            int(value.split("/")[0]),
            int(value.split("/")[1]),
        ),
    )

    unexpected_dates = sorted(
        actual_dates - expected_dates,
        key=lambda value: (
            int(value.split("/")[0]),
            int(value.split("/")[1]),
        ),
    )

    if missing_dates:
        print()
        print(
            "❌ Missing expected dates:"
        )

        for date in missing_dates:
            print(f"  - {date}")

        valid = False

    else:
        print(
            "✓ No missing calendar dates"
        )

    if unexpected_dates:
        print()
        print(
            "❌ Unexpected dates:"
        )

        for date in unexpected_dates:
            print(f"  - {date}")

        valid = False

    # --------------------------------------------------------
    # Final validation.
    # --------------------------------------------------------

    print("=" * 60)

    return valid


# ============================================================
# MAIN
# ============================================================


def extract_jft() -> list[dict]:
    """
    Run the complete extraction pipeline.
    """

    print("=" * 60)
    print("JUST FOR TODAY PDF EXTRACTOR")
    print("=" * 60)

    # --------------------------------------------------------
    # Check PDF.
    # --------------------------------------------------------

    if not PDF_PATH.exists():
        raise FileNotFoundError(
            f"PDF not found:\n{PDF_PATH}"
        )


    entries = extract_entries()

    valid = validate_entries(
        entries
    )

    if valid:
        return entries
    else:
        raise Exception(
            "JFT EXTRACTION HAS VALIDATION ERRORS"
        )

if __name__ == "__main__":
    extract_jft()

