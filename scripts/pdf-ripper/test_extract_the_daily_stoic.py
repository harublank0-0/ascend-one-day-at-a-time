"""
Tests for the Daily Stoic page parser.

The page lines below are modelled on what PyMuPDF returns for the real book
(see the notes in extract_the_daily_stoic.py), so they need no PDF to run:

    uv run python -B -m unittest test_extract_the_daily_stoic -v
"""

import unittest

from extract_the_daily_stoic import parse_entry

# The book sets a whole one-letter word ("A", "I") in a smaller, two-line drop
# cap (30pt) and every longer word in a three-line cap (43pt).
WHOLE_WORD_CAP = 30.0
LETTER_CAP = 43.1


class DropCapTests(unittest.TestCase):
    def test_a_missing_first_letter_is_put_back(self):
        entry = parse_entry(
            [
                "S",
                "October 22nd",
                "IT’S EASY TO GET BETTER. BUT BETTER AT WHAT?",
                "“So someone’s good at taking down an opponent, but",
                "that doesn’t make them more community-minded, or",
                "more tolerant of the faults of others.”",
                "—MARCUS AURELIUS, MEDITATIONS, 7.52",
                "elf-improvement is a noble pursuit. Most people don’t",
                "even bother.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertEqual(
            entry["content"], "Self-improvement is a noble pursuit. Most people don’t even bother."
        )
        self.assertEqual(entry["title"], "IT’S EASY TO GET BETTER. BUT BETTER AT WHAT?")
        self.assertEqual((entry["month"], entry["day"]), (10, 22))

    def test_the_letter_is_put_back_even_when_the_size_is_not_known(self):
        entry = parse_entry(
            [
                "T",
                "January 1st",
                "CONTROL AND CHOICE",
                "“The chief task in life is simply this: to identify and",
                "separate matters.”",
                "—EPICTETUS, DISCOURSES, 2.5.4–5",
                "he single most important practice in Stoic philosophy is",
                "differentiating between what we can change and what we can’t.",
            ]
        )

        self.assertEqual(
            entry["content"],
            "The single most important practice in Stoic philosophy is "
            "differentiating between what we can change and what we can’t.",
        )

    def test_the_article_a_keeps_its_space(self):
        entry = parse_entry(
            [
                "A",
                "January 16th",
                "NEVER DO ANYTHING OUT OF HABIT",
                "“So in the majority of other things, we address",
                "circumstances by following wretched habit.”",
                "—EPICTETUS, DISCOURSES, 3.12",
                "worker is asked: “Why did you do it this way?” The",
                "answer is usually the same.",
            ],
            drop_cap_size=WHOLE_WORD_CAP,
        )

        self.assertEqual(
            entry["content"],
            "A worker is asked: “Why did you do it this way?” The answer is usually the same.",
        )

    def test_the_pronoun_i_inside_a_quotation_keeps_its_space(self):
        entry = parse_entry(
            [
                "“I",
                "June 29th",
                "NO EXCUSES",
                "“It is possible to curb your arrogance, to overcome",
                "pleasure and pain.”",
                "—MARCUS AURELIUS, MEDITATIONS, 8.8",
                "was just born this way.” “I never learned anything",
                "different.”",
            ],
            drop_cap_size=WHOLE_WORD_CAP,
        )

        self.assertEqual(
            entry["content"], "“I was just born this way.” “I never learned anything different.”"
        )

    def test_a_word_starting_with_i_is_not_split(self):
        entry = parse_entry(
            [
                "I",
                "March 8th",
                "PROTECT YOUR MIND",
                "“If a person gave away your body to some passerby, you’d be furious.”",
                "—EPICTETUS, ENCHIRIDION, 28",
                "nstinctively, we protect our physical selves.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertEqual(entry["content"], "Instinctively, we protect our physical selves.")

    def test_a_word_that_merely_starts_with_a_is_not_split(self):
        anyone = parse_entry(
            [
                "A",
                "January 26th",
                "THE POWER OF A MANTRA",
                "“Erase the false impressions from your mind.”",
                "—MARCUS AURELIUS, MEDITATIONS, 8.40",
                "nyone who has taken a yoga class has heard this.",
            ],
            drop_cap_size=LETTER_CAP,
        )
        an_archer = parse_entry(
            [
                "A",
                "May 2nd",
                "BE THE PERSON YOU WANT TO BE",
                "“First tell yourself what kind of person you want to be.”",
                "—EPICTETUS, DISCOURSES, 3.23",
                "n archer is highly unlikely to hit a target she did not aim at.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertTrue(anyone["content"].startswith("Anyone who has taken"))
        self.assertTrue(an_archer["content"].startswith("An archer is highly"))

    def test_a_cap_that_includes_an_opening_quotation_mark(self):
        entry = parse_entry(
            [
                "“O",
                "February 7th",
                "FEAR IS A SELF-FULFILLING PROPHECY",
                "“Many are harmed by fear itself, and many may have",
                "come to their fate while dreading fate.”",
                "—SENECA, OEDIPUS, 992",
                "nly the paranoid survive,” Andy Grove, a former CEO",
                "of Intel, famously said.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertEqual(
            entry["content"],
            "“Only the paranoid survive,” Andy Grove, a former CEO of Intel, famously said.",
        )

    def test_an_entry_with_no_drop_cap_is_left_alone(self):
        entry = parse_entry(
            [
                "January 7th",
                "SEVEN CLEAR FUNCTIONS OF THE MIND",
                "“The proper work of the mind is the exercise of",
                "choice, refusal, yearning, repulsion, preparation,",
                "purpose, and assent.”",
                "—EPICTETUS, DISCOURSES, 4.11.6–7",
                "Let’s break down each one of those tasks:",
                "Choice—to do and think right",
            ]
        )

        self.assertEqual(
            entry["content"],
            "Let’s break down each one of those tasks: Choice—to do and think right",
        )


class EpigraphTests(unittest.TestCase):
    def test_a_wrapped_attribution_stays_with_the_quote(self):
        entry = parse_entry(
            [
                "W",
                "February 14th",
                "THINK BEFORE YOU ACT",
                "“For to be wise is only one thing—to fix our attention",
                "on our intelligence, which guides all things",
                "everywhere.”",
                "—HERACLITUS, QUOTED IN DIOGENES LAERTIUS, LIVES OF THE EMINENT PHILOSOPHERS,",
                "9.1",
                "hy did I do that? you’ve probably asked yourself. We",
                "all have.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertTrue(
            entry["quote"]["text"].endswith("LIVES OF THE EMINENT PHILOSOPHERS, 9.1"),
            entry["quote"]["text"],
        )
        self.assertEqual(
            entry["content"], "Why did I do that? you’ve probably asked yourself. We all have."
        )

    def test_an_attribution_wrapped_onto_a_line_with_a_quotation_mark(self):
        entry = parse_entry(
            [
                "P",
                "November 21st",
                "ONCE IS ENOUGH, ONCE IS FOREVER",
                "“A good isn’t increased by the addition of time.”",
                "—CHRYSIPPUS QUOTED BY PLUTARCH IN MORALIA: “AGAINST THE STOICS ON COMMON",
                "CONCEPTIONS,” 1062 (LOEB, P. 682)",
                "erhaps wisdom and happiness are like winning a medal",
                "in the Olympics.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertTrue(entry["quote"]["text"].endswith("1062 (LOEB, P. 682)"))
        self.assertEqual(
            entry["content"], "Perhaps wisdom and happiness are like winning a medal in the Olympics."
        )

    def test_two_epigraphs_both_belong_to_the_quote(self):
        entry = parse_entry(
            [
                "W",
                "May 22nd",
                "TODAY IS THE DAY",
                "“You get what you deserve. Instead of being a good",
                "person today, you choose instead to become one",
                "tomorrow.”",
                "—MARCUS AURELIUS, MEDITATIONS, 8.22",
                "“I don’t complain about the lack of time\xa0.\xa0.\xa0. what",
                "little I have will go far enough.”",
                "—SENECA, MEDEA, 423–425",
                "e’ve all told ourselves we will start tomorrow.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertEqual(
            entry["quote"]["text"],
            "“You get what you deserve. Instead of being a good person today, you choose "
            "instead to become one tomorrow.” —MARCUS AURELIUS, MEDITATIONS, 8.22"
            "\n\n"
            "“I don’t complain about the lack of time\xa0.\xa0.\xa0. what little I have will "
            "go far enough.” —SENECA, MEDEA, 423–425",
        )
        self.assertEqual(entry["content"], "We’ve all told ourselves we will start tomorrow.")

    def test_an_attribution_missing_its_dash_is_still_recognised(self):
        entry = parse_entry(
            [
                "W",
                "July 29th",
                "A CURE FOR THE SELF",
                "“The person who has practiced philosophy as a cure",
                "for the self becomes great of soul, filled with",
                "confidence, invincible—and greater as you draw",
                "near.”",
                "SENECA, MORAL LETTERS, 111.2",
                "hat is “a cure for the self”? Perhaps Seneca means",
                "that we develop a unique set of characteristics.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertTrue(entry["quote"]["text"].endswith("near.” —SENECA, MORAL LETTERS, 111.2"))
        self.assertTrue(entry["content"].startswith("What is “a cure for the self”?"))

    def test_a_dash_inside_the_quote_is_not_mistaken_for_the_attribution(self):
        entry = parse_entry(
            [
                "A",
                "June 23rd",
                "THE LONG WAY AROUND",
                "“You could enjoy this very moment all the things you",
                "are praying to reach by taking the long way around",
                "—if you’d stop depriving yourself of them.”",
                "—MARCUS AURELIUS, MEDITATIONS, 12.1",
                "sk most people what they’re working toward and you’ll",
                "get an answer like: “I’m trying to become a [insert",
                "profession].”",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertEqual(
            entry["quote"]["text"],
            "“You could enjoy this very moment all the things you are praying to reach by "
            "taking the long way around —if you’d stop depriving yourself of them.” "
            "—MARCUS AURELIUS, MEDITATIONS, 12.1",
        )
        self.assertEqual(
            entry["content"],
            "Ask most people what they’re working toward and you’ll get an answer like: "
            "“I’m trying to become a [insert profession].”",
        )

    def test_a_dash_in_the_quote_and_a_lowercase_reference_together(self):
        entry = parse_entry(
            [
                "A",
                "June 23rd",
                "THE LONG WAY AROUND",
                "“You could enjoy this very moment all the things you",
                "—if you’d stop depriving yourself of them.”",
                "—MARCUS AURELIUS, MEDITATIONS, 12.1b",
                "sk most people what they’re working toward and you’ll",
                "get an answer like this.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertTrue(entry["quote"]["text"].endswith("—MARCUS AURELIUS, MEDITATIONS, 12.1b"))
        self.assertEqual(
            entry["content"],
            "Ask most people what they’re working toward and you’ll get an answer like this.",
        )

    def test_a_wrapped_reference_made_only_of_digits_and_letter_suffixes(self):
        entry = parse_entry(
            [
                "W",
                "February 14th",
                "THINK BEFORE YOU ACT",
                "“For to be wise is only one thing.”",
                "—HERACLITUS, QUOTED IN DIOGENES LAERTIUS, LIVES OF THE EMINENT PHILOSOPHERS,",
                "9.1b–2a",
                "hy did I do that? you’ve probably asked yourself.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertTrue(entry["quote"]["text"].endswith("PHILOSOPHERS, 9.1b–2a"))
        self.assertTrue(entry["content"].startswith("Why did I do that?"))

    def test_an_attribution_whose_reference_has_lowercase_letters(self):
        entry = parse_entry(
            [
                "I",
                "March 17th",
                "THE BEAUTY OF CHOICE",
                "“You are not your body and hair-style, but your",
                "capacity for choosing well.”",
                "—EPICTETUS, DISCOURSES, 3.1.39b–40a",
                "t’s that line in the movie Fight Club: “You are not your job,",
                "you’re not how much money you have in the bank.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertTrue(entry["quote"]["text"].endswith("—EPICTETUS, DISCOURSES, 3.1.39b–40a"))
        self.assertTrue(entry["content"].startswith("It’s that line in the movie Fight Club"))

    def test_a_long_epigraph_is_not_cut_short(self):
        quote_lines = [f"quote line {number} of an epigraph that runs on and on" for number in range(1, 26)]
        quote_lines[0] = "“" + quote_lines[0]
        quote_lines[-1] += ".”"

        entry = parse_entry(
            [
                "W",
                "January 25th",
                "A LONG ONE",
                *quote_lines,
                "—MARCUS AURELIUS, MEDITATIONS, 6.16.2b–4a",
                "arren Buffett lives in the same house he bought decades ago.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertTrue(entry["quote"]["text"].endswith(".” —MARCUS AURELIUS, MEDITATIONS, 6.16.2b–4a"))
        self.assertEqual(entry["content"], "Warren Buffett lives in the same house he bought decades ago.")

    def test_the_quote_keeps_its_attribution_inline_and_has_no_separate_reference(self):
        entry = parse_entry(
            [
                "S",
                "October 22nd",
                "TITLE",
                "“A quote that fits on one line.”",
                "—SENECA, LETTERS, 1.1",
                "ome body text.",
            ],
            drop_cap_size=LETTER_CAP,
        )

        self.assertEqual(
            entry["quote"], {"text": "“A quote that fits on one line.” —SENECA, LETTERS, 1.1", "reference": None}
        )

    def test_a_page_without_a_date_is_not_an_entry(self):
        self.assertIsNone(parse_entry(["Part One", "Some introductory text."]))


if __name__ == "__main__":
    unittest.main()
