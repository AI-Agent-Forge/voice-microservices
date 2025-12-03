from typing import List


def words_from_text(text: str) -> List[str]:
    return [w for w in text.strip().split() if w]

