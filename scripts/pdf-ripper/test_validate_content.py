"""
Tests for the content validator's guard against readings that start mid-word.

    uv run python -B -m unittest test_validate_content -v
"""

import unittest

from validate_content import find_lowercase_starts


class FindLowercaseStartsTests(unittest.TestCase):
    def test_flags_a_reading_whose_opening_letter_was_lost(self):
        entries = [
            {"date": "10/22", "content": "elf-improvement is a noble pursuit."},
            {"date": "10/23", "content": "Self-improvement is a noble pursuit."},
        ]

        self.assertEqual(find_lowercase_starts(entries), ["10/22"])

    def test_accepts_readings_that_open_with_a_quote_a_digit_or_a_capital(self):
        entries = [
            {"date": "02/07", "content": "“Only the paranoid survive,” Andy Grove said."},
            {"date": "03/01", "content": "12 steps is a lot to take in."},
            {"date": "03/02", "content": "’Tis the season."},
        ]

        self.assertEqual(find_lowercase_starts(entries), [])

    def test_leaves_missing_content_to_the_other_checks(self):
        entries = [{"date": "01/03", "content": ""}, {"date": "01/04"}]

        self.assertEqual(find_lowercase_starts(entries), [])


if __name__ == "__main__":
    unittest.main()
