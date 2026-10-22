"""
Extract The Daily Stoic from the book PDF.

How an entry page comes out of PyMuPDF (the reason for most of the code below):

    S                                   <- the drop cap, on its own line, BEFORE the date
    October 22nd
    IT’S EASY TO GET BETTER. BUT BETTER AT WHAT?
    “So someone’s good at taking down an opponent, but     <- epigraph (a quote)
    that doesn’t make them more tolerant of others.”
    —MARCUS AURELIUS, MEDITATIONS, 7.52                    <- its attribution, in capitals
    elf-improvement is a noble pursuit. Most people ...    <- the body, minus its first letter

- The first letter of the body is the drop cap, so it has to be put back.
- The cap is usually one letter ("S"), but it can include an opening quotation
  mark ("“O") when the body opens with a quotation.
- The book draws a cap smaller (30pt, two lines) exactly when it is a whole
  one-letter word ("A worker...", "“I was just born this way"), and every
  other cap at 43pt (three lines). So a small cap needs a space after it, while
  a large one is the start of a longer word ("Anyone", "An archer", "As the...").
  Checked against the whole book: 12 small caps (11 "A" and one "“I"), 351 large.
- An attribution can wrap onto further lines ("9.1"), and an entry can have two
  epigraphs, each with its own attribution.
- Attributions are all capitals. One of them has lost its leading dash in the
  PDF text layer, so a line with no lowercase letters and a comma counts too.
"""

import re
from dataclasses import dataclass
from pathlib import Path

import fitz  # PyMuPDF


BASE_DIR = Path(__file__).resolve().parent.parent.parent

PDF_PATH = BASE_DIR / "data"/ "books" / "the-daily-stoic.pdf"

# Drop caps at or below this size (points) are the two-line cap the book uses
# for a whole one-letter word (30pt); every other cap is 43pt.
WHOLE_WORD_CAP_MAX_SIZE = 35.0

# How far to look for an epigraph's attribution. The longest quote in the book
# has 16 lines before its attribution, so this leaves plenty of room while
# still stopping a stray capitalised body line from being read as one.
MAX_EPIGRAPH_LINES = 30

# A drop cap line: one letter, optionally after an opening quotation mark.
DROP_CAP_PATTERN = re.compile(r"^[“‘\"']?[A-Za-z]$")

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


@dataclass
class PageText:
    """The cleaned text of one PDF page and the size of its drop cap, if any."""

    lines: list[str]
    drop_cap_size: float | None


def clean_line(line: str) -> str:
    """Clean common PDF extraction artifacts."""
    line = line.replace("­", "")  # soft hyphen
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


def find_drop_cap_size(page_dict: dict) -> float | None:
    """
    Size of the drop cap, taken from the first piece of text on the page.

    Returns None when the page does not open with a drop cap.
    """

    for block in page_dict.get("blocks", []):
        for line in block.get("lines", []):
            for span in line["spans"]:
                text = span["text"].strip()

                if not text:
                    continue

                if DROP_CAP_PATTERN.match(text):
                    return round(span["size"], 1)

                return None

    return None


def extract_pages() -> list[PageText]:
    """Extract cleaned text, and the drop-cap size, from every PDF page."""
    pages: list[PageText] = []

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

            pages.append(
                PageText(
                    lines=lines,
                    drop_cap_size=find_drop_cap_size(page.get_text("dict")),
                )
            )

    return pages


def split_drop_cap(lines: list[str]) -> tuple[str | None, list[str]]:
    """
    Separate the drop-cap line from the rest of the page.

    The cap sits on its own line directly before the date. It is returned
    (not discarded) so it can be put back on the body text.
    """

    if (
        len(lines) >= 2
        and DROP_CAP_PATTERN.match(lines[0])
        and is_date(lines[1])
    ):
        return lines[0], lines[1:]

    return None, lines


def mostly_uppercase(line: str) -> bool:
    """
    Whether a line is made up (almost) entirely of capital letters.

    "Almost": references such as "—EPICTETUS, DISCOURSES, 3.1.39b–40a" carry
    a few lowercase suffix letters.
    """

    letters = [character for character in line if character.isalpha()]

    if len(letters) < 2:
        return False

    return sum(character.isupper() for character in letters) / len(letters) >= 0.8


def starts_attribution(line: str) -> bool:
    """
    Whether a line begins the attribution under an epigraph.

    Attributions are printed in capitals ("—MARCUS AURELIUS, MEDITATIONS, 7.52").
    A quote can also contain a line that begins with a dash ("—if you’d stop
    depriving yourself"), which is why the capitals matter. The dash is missing
    from one attribution in the PDF text, so a comma works in its place.
    """

    return mostly_uppercase(line) and (
        line.startswith(("—", "-")) or "," in line
    )


def continues_attribution(line: str) -> bool:
    """
    Whether a line is the wrapped tail of an attribution.

    Examples: "9.1", "7.1.88", "3.1.39b–40a" and
    "CONCEPTIONS,” 1062 (LOEB, P. 682)". Body text always contains ordinary
    lowercase words, so a line with no word in it, or only capitals, is not body.
    """

    if not line:
        return False

    if re.search(r"[A-Za-z]{3,}", line) is None:
        return True

    return mostly_uppercase(line)


def split_epigraphs(lines: list[str]) -> tuple[list[str], list[str]]:
    """
    Split the lines after the title into the epigraph(s) and the body.

    Returns (epigraphs, body_lines). Each epigraph is the quote text followed
    by its attribution joined into one string; an entry with two epigraphs
    gives two strings.
    """

    epigraphs: list[str] = []
    index = 0

    while index < len(lines):
        attribution = next(
            (
                position
                for position in range(index, min(len(lines), index + MAX_EPIGRAPH_LINES))
                if starts_attribution(lines[position])
            ),
            None,
        )

        if attribution is None:
            break

        end = attribution

        while end + 1 < len(lines) and continues_attribution(lines[end + 1]):
            end += 1

        passage = lines[index : end + 1]

        # Restore the dash the PDF dropped from the front of an attribution.
        if not passage[attribution - index].startswith(("—", "-")):
            passage[attribution - index] = "—" + passage[attribution - index]

        epigraphs.append(" ".join(passage))
        index = end + 1

        # A second epigraph opens with a quotation mark. Body text never does,
        # because its first letter lives in the drop cap line.
        if index >= len(lines) or not lines[index].startswith("“"):
            break

    return epigraphs, lines[index:]


def restore_drop_cap(
    body_lines: list[str],
    drop_cap: str | None,
    drop_cap_size: float | None,
) -> list[str]:
    """
    Put the drop cap back on the first line of the body.

    A cap in the book's smaller size is a whole word ("A", "I") and is followed
    by a space. Any other cap is the start of a longer word.
    """

    if not drop_cap or not body_lines:
        return body_lines

    is_whole_word = (
        drop_cap_size is not None
        and drop_cap_size <= WHOLE_WORD_CAP_MAX_SIZE
    )

    separator = " " if is_whole_word else ""

    return [drop_cap + separator + body_lines[0], *body_lines[1:]]


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


def parse_entry(
    page_lines: list[str],
    drop_cap_size: float | None = None,
) -> dict | None:
    """
    Parse a single Daily Stoic entry.

    Expected structure:

        [Drop cap]
        Date
        Title
        Epigraph(s), each followed by its attribution
        Body

    drop_cap_size is the point size of the drop cap, when the page has one.
    """

    drop_cap, page_lines = split_drop_cap(page_lines)

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

    epigraphs, body_lines = split_epigraphs(lines)

    if not epigraphs:
        # No attribution found: treat the first line as the quote.
        print(f"⚠ {date_text}: no attribution line found, using the first line as the quote")
        epigraphs = [lines[0].strip()]
        body_lines = lines[1:]

    quote_text = "\n\n".join(epigraphs).strip()

    body_lines = restore_drop_cap(body_lines, drop_cap, drop_cap_size)

    content = " ".join(
        line.strip()
        for line in body_lines
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
            "reference": None,
        },
        "content": content,
        "closing": None,
    }


def extract_the_daily_stoic() -> list[dict]:
    pages = extract_pages()

    entries = []

    for page_number, page in enumerate(pages, start=1):
        entry = parse_entry(page.lines, page.drop_cap_size)

        if entry:
            entries.append(entry)
            print(
                f"Page {page_number}: "
                f"{entry['date']} - {entry['title']}"
            )

    return entries


if __name__ == "__main__":
    extract_the_daily_stoic()
