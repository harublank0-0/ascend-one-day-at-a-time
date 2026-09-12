import re
from pathlib import Path

import fitz  # PyMuPDF


BASE_DIR = Path(__file__).resolve().parent.parent.parent

PDF_PATH = BASE_DIR / "data"/ "books" / "the-daily-stoic.pdf"

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


DATE_PATTERN = re.compile(
    r"^(January|February|March|April|May|June|July|August|September|"
    r"October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?$",
    re.IGNORECASE,
)


def clean_line(line: str) -> str:
    """Clean common PDF extraction artifacts."""
    line = line.replace("\u00ad", "")  # soft hyphen
    line = line.replace("￾", "")       # PDF extraction artifact
    line = line.replace("OceanofPDF.com", "")

    return line.strip()


def is_date(line: str) -> bool:
    return DATE_PATTERN.match(line) is not None


def parse_date(line: str) -> tuple[int, int]:
    match = DATE_PATTERN.match(line)

    if not match:
        raise ValueError(f"Invalid date: {line}")

    month_name = match.group(1).capitalize()
    day = int(match.group(2))

    return MONTHS[month_name], day


def extract_pages() -> list[list[str]]:
    """Extract cleaned text from every PDF page."""
    pages : list[list[str]]= []

    with fitz.open(PDF_PATH) as document:
        for page in document:
            raw_text = page.get_text("text")

            if not isinstance(raw_text, str):
                continue

            lines = [
                clean_line(line)
                for line in raw_text.splitlines()
            ]

            # Remove empty lines at the beginning/end.
            lines = [line for line in lines if line]

            pages.append(lines)

    return pages


def fix_drop_cap(lines: list[str]) -> list[str]:
    """
    Fix Daily Stoic drop-cap extraction.

    The PDF can extract the first letter of the first paragraph
    separately from the rest of the word.

    Example:

        T
        January 1st
        CONTROL AND CHOICE
        T“The chief task...
        ...
        he single most important practice...

    We want:

        January 1st
        CONTROL AND CHOICE
        “The chief task...
        ...
        The single most important practice...
    """

    if not lines:
        return lines

    # ---------------------------------------------------------
    # 1. Remove standalone drop-cap before the date.
    # ---------------------------------------------------------
    if (
        len(lines) >= 2
        and len(lines[0]) == 1
        and lines[0].isalpha()
        and is_date(lines[1])
    ):
        lines.pop(0)

    # ---------------------------------------------------------
    # 2. Fix the quote if it starts with the drop-cap.
    #
    # Example:
    #     T“The chief task...
    #
    # becomes:
    #     “The chief task...
    # ---------------------------------------------------------
    date_index = next(
        (i for i, line in enumerate(lines) if is_date(line)),
        None,
    )

    if date_index is None:
        return lines

    for i in range(date_index + 1, len(lines)):
        line = lines[i]

        if line.startswith("T“"):
            lines[i] = line[1:]
            break

    # ---------------------------------------------------------
    # 3. Fix the beginning of the actual content.
    #
    # Example:
    #     he single most important...
    #
    # becomes:
    #     The single most important...
    #
    # We do this after the quote.
    # ---------------------------------------------------------
    title_index = date_index + 1

    # Find the first likely content line after title/quote.
    # For now, look for the known drop-cap artifact.
    for i in range(title_index + 1, len(lines)):
        if lines[i].startswith("he single most important"):
            lines[i] = "T" + lines[i]
            break

    return lines

def find_daily_entry(page_lines: list[str]):
    """
    Determine whether a PDF page contains a Daily Stoic entry.

    Returns:
        {
            "date_index": int,
            "date": str
        }

    or None.
    """

    for index, line in enumerate(page_lines):
        if is_date(line):
            return {
                "date_index": index,
                "date": line,
            }

    return None


def parse_entry(page_lines: list[str]) -> dict | None:
    """
    Parse a single Daily Stoic entry.

    Expected structure:

        Date
        Title
        Quote
        Content
    """

    page_lines = fix_drop_cap(page_lines.copy())

    entry_info = find_daily_entry(page_lines)

    if not entry_info:
        return None

    date_index = entry_info["date_index"]
    date_text = entry_info["date"]

    month, day = parse_date(date_text)

    # Everything after the date.
    lines = page_lines[date_index + 1 :]

    if not lines:
        return None

    # First line after date is the title.
    title = lines.pop(0).strip()

    if not title:
        return None

    # The Daily Stoic entries generally have a quote followed
    # by the meditation content.
    #
    # We don't assume a fixed number of lines for the quote.
    # Instead, identify the quote by looking for a quoted block.
    quote_lines = []
    quote_end = None

    for index, line in enumerate(lines):
        quote_lines.append(line)

        # Quote normally ends when we encounter a line that
        # looks like the author's/reference attribution.
        #
        # This is intentionally conservative.
        if (
            line.startswith("—")
            or line.startswith("-")
            or re.match(r"^[A-Z][A-Za-z .'-]+$", line)
        ):
            quote_end = index
            break

        # If the quote uses quotation marks, stop after closing quote.
        if (
            index > 0
            and line.endswith('"')
        ):
            quote_end = index
            break

    if quote_end is not None:
        quote_text = " ".join(quote_lines[: quote_end + 1]).strip()
        remaining = lines[quote_end + 1 :]
    else:
        # Fallback: use the first line as the quote.
        quote_text = lines[0].strip()
        remaining = lines[1:]

    # Try to detect a reference/author line.
    reference = None

    if remaining:
        possible_reference = remaining[0].strip()

        if (
            possible_reference.startswith("—")
            or possible_reference.startswith("-")
        ):
            reference = possible_reference.lstrip("—- ").strip()
            remaining = remaining[1:]

    content = " ".join(
        line.strip()
        for line in remaining
        if line.strip()
    ).strip()

    return {
        "date": f"{month:02d}/{day:02d}",
        "month": month,
        "day": day,
        "source": {
            "type": "daily_stoic",
            "name": "The Daily Stoic",
        },
        "title": title,
        "quote": {
            "text": quote_text or None,
            "reference": reference,
        },
        "content": content,
        "closing": None,
    }


def extract_the_daily_stoic() -> list[dict]:
    pages = extract_pages()

    entries = []

    for page_number, page_lines in enumerate(pages, start=1):
        entry = parse_entry(page_lines)

        if entry:
            entries.append(entry)
            print(
                f"Page {page_number}: "
                f"{entry['date']} - {entry['title']}"
            )

    return entries


if __name__ == "__main__":
    extract_the_daily_stoic()
