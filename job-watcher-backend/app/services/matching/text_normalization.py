import re

def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    text = text.lower()
    # Replace anything that isn't a letter, number, +, #, ., or whitespace with space.
    text = re.sub(r'[^a-z0-9+#.\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def normalize_keyword(keyword: str | None) -> str:
    return normalize_text(keyword)

def contains_keyword(text: str, keyword: str) -> bool:
    """
    Checks if a normalized keyword appears as a whole phrase inside the normalized text.
    """
    if not text or not keyword:
        return False
        
    padded_text = f" {text} "
    padded_kw = f" {keyword} "
    
    return padded_kw in padded_text

def contains_any_keyword(text: str, keywords: list[str]) -> bool:
    if not text or not keywords:
        return False
    return any(contains_keyword(text, kw) for kw in keywords)
