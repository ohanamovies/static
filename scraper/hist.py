import json, re
from collections import Counter

with open("cache.json") as f:
    data = json.load(f)

counter = Counter()

for movie in data.values():
    guides = movie.get("rawParentsGuide", []) or []
    for section in guides:
        if section.get("category") != "ALCOHOL_DRUGS":
            continue
        for review in section.get("reviews", []):
            text = review.get("text", "").lower()
            text = re.sub(r"[^a-z\s]", " ", text)
            words = text.split()
            counter.update(words)
            counter.update(f"{a} {b}" for a, b in zip(words, words[1:]))

STOPWORDS = {
    "the","a","an","is","it","in","of","and","or","to","this","that","with",
    "are","was","her","his","she","he","they","some","has","have","been","but",
    "not","no","for","be","as","at","on","by","from","there","their","one","two",
    "who","when","we","you","i","if","its","all","more","very","so","can","do",
    "seen","shown","shows","show","scene","during","while","brief","briefly",
    "man","woman","men","women","girl","boy","character","characters","film","movie"
}

PROFANITY_TAGS = {
    # --- STRONG PROFANITY ---
    "f_word":           ["fuck", "f word", "f words", "f bomb", "f bombs", "f k", "f ck",
                         "f k", "fucking", "fucks", "motherf", "motherfucker", "motherf ker"],
    "s_word":           ["shit", "sh t", "sh", "shits", "bullshit", "bullsh", "bullsh t"],
    "c_word":           ["cunt", "c nt", "c t", "c word"],
    "slurs_racial":     ["racial slur", "racial slurs", "slurs", "n word", "nigger", "racist",
                         "racial", "derogatory", "derogatory terms"],
    "slurs_homophobic": ["homophobic", "homophobic slurs", "faggot", "fag", "gay"],

    # --- MODERATE PROFANITY ---
    "b_word":           ["bitch", "b tch", "b word", "bitches", "bitch uses"],
    "ass":              ["ass", "asshole", "asses", "jackass", "smartass"],
    "bastard":          ["bastard", "bastards", "b stard"],
    "damn":             ["damn", "goddamn", "goddamn uses", "dammit", "damns", "damned",
                         "d mn", "godd mn", "g damn", "god damn"],
    "dick":             ["dick", "dickhead", "d ck", "d k", "cock", "cocksucker", "prick"],
    "pussy":            ["pussy", "p ssy", "p ss"],

    # --- MILD PROFANITY ---
    "hell":             ["hell", "hells", "bloody hell", "hell use"],
    "crap":             ["crap", "craps"],
    "piss":             ["piss", "pissed"],
    "mild_expletives":  ["damn", "shit", "crap", "heck", "freaking", "screw", "suck",
                         "dumb", "idiot", "stupid", "moron", "jerk", "fool", "retard",
                         "shut up", "bugger", "bollocks", "wanker", "sod", "twat", "arse"],

    # --- SEXUAL LANGUAGE ---
    "sexual_language":  ["sexual references", "sexual context", "innuendo", "slut", "whore",
                         "tits", "penis", "genitals", "anatomical", "anatomical terms",
                         "crude", "vulgar", "obscene"],

    # --- RELIGIOUS PROFANITY ---
    "blasphemy":        ["blasphemy", "blasphemous", "blasphemed", "religious profanity",
                         "religious profanities", "religious exclamations", "vain",
                         "god s name", "jesus christ", "jesus", "christ", "oh my god",
                         "oh god", "my god", "god s sake", "s sake", "lord s name",
                         "deity", "misuse", "misuses", "misused"],

    # --- GESTURES ---
    "middle_finger":    ["middle finger", "finger gesture", "hand gesture", "hand gestures",
                         "obscene hand", "finger"],

    # --- INTENSITY FLAGS ---
    "pervasive":        ["pervasive", "frequent", "frequently", "constant", "throughout",
                         "many times", "multiple times", "repeated", "repeatedly",
                         "heavy", "strong language", "strong profanity"],
    "infrequent":       ["infrequent", "infrequently", "sparingly", "few times", "once",
                         "twice", "said once", "said twice", "occasional", "occasionally",
                         "minor", "mild language", "mild profanity"],
    "bleeped":          ["bleeped", "muted", "censored"],
}

NEGATIONS = {"no", "not", "never", "without", "non", "nothing", "none", "minor", "mild", "little"}
NEGATION_WINDOW = 4

print("count  term")
for term, count in counter.most_common(1200):
    if count < 4:
        break
    if all(w not in STOPWORDS for w in term.split()):
        print(f"{count:6d}  {term}")