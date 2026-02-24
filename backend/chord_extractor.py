import re

# Remove <tags>
TAG_PATTERN = re.compile(r"<[^>]+>")

# Slash chords: A/C# → A C#
SLASH_PATTERN = re.compile(r"([A-G](?:#|b)?)/([A-G](?:#|b)?)")

# Chord names
CHORD_PATTERN = re.compile(
    r"\b("
    r"[A-G](?:#|b)?"
    r"(?:maj7|maj|min7|min|m7|m|dim7|dim|aug|sus2|sus4|add9|add11|add13|add|6|7|9|11|13)?"
    r")\b"
)

def extract_chords(text):
    """Extract chord symbols from messy text and dictionary-format OCR."""
    if text is None:
        return []

    # If the chords column is a DICT → extract all values
    if isinstance(text, dict):
        text = " ".join(text.values())

    if not isinstance(text, str):
        return []

    # 1. remove <intro_1>, <verse>, etc
    cleaned = TAG_PATTERN.sub(" ", text)

    # 2. expand slash chords: A/C# → A C#
    cleaned = SLASH_PATTERN.sub(r"\1 \2", cleaned)

    # 3. extract chord names
    matches = CHORD_PATTERN.findall(cleaned)

    # 4. dedupe but keep order
    seen = set()
    result = []
    for m in matches:
        if m not in seen:
            seen.add(m)
            result.append(m)

    return result
