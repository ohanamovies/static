// tags.js

const NEGATIONS = new Set(["no", "not", "never", "zero", "without", "non", "nothing", "none", "minor", "mild", "little"]);
const NEGATION_WINDOW = 4;

const SEX_TAGS = {
  nudity:            ["nudity", "nude", "naked", "fully nude", "fully naked", "completely naked", "explicit nudity"],
  female_nudity:     ["female nudity", "breast nudity", "breasts visible", "breasts", "breast", "nipples", "nipple", "topless", "bare breasts"],
  male_nudity:       ["male nudity", "bare chested", "bare chest", "shirtless", "chest"],
  rear_nudity:       ["rear nudity", "full rear", "bare buttocks", "bare butt", "buttocks", "butt", "butts", "backside", "bare back"],
  frontal_nudity:    ["frontal nudity", "full frontal", "frontal", "genitals", "genitalia", "penis", "vagina", "pubic hair", "pubic", "crotch"],
  partial_nudity:    ["partial", "partially", "cleavage", "bare shoulders", "navel", "thighs", "legs", "upper", "skin"],
  revealing_clothing:["revealing", "skimpy", "scantily clad", "scantily", "tight", "low cut", "bikini", "bikinis", "lingerie", "underwear", "bra", "panties", "thong"],
  undressing:        ["undresses", "undress", "undressing", "strips", "strip", "removes", "takes off", "exposes", "exposing"],
  sex:               ["having sex", "sex scenes", "had sex", "intercourse", "sexual activity", "explicit"],
  implied_sex:       ["implied sex", "implied", "implying"],
  oral_sex:          ["oral sex", "oral","cunnilingus","fellatio"],
  rape:              ["rape", "raped", "forced"],
  harassment:        ["abuse","harassment"],
  masturbation:      ["masturbation", "masturbating", "masturbates"],
  kissing:           ["kissing", "kiss", "kisses", "kissing scenes", "kiss passionately", "passionate kissing", "passionately"],
  making_out:        ["making out", "make out"],
  moaning:           ["moaning", "moans"],
  thrusting:         ["thrusting", "thrusts"],
  sensuality:        ["suggestive", "suggestively", "sensual", "seduce", "innuendo", "sexually", "erotic"],
  sexual_dialogue:   ["crude", "verbal", "jokes", "about sex"],
  prostitution:      ["prostitute", "prostitutes", "prostitution", "brothel"],
  porn:              ["porn"],
  erection:          ["erection", "erect"],
  homosexual:        ["lesbian","gay","anal"],
  strip_club:        ["strip club"],
  shower_scene:      ["shower"],
  bath_scene:        ["bath", "bathtub", "bathing"],
  bedroom_scene:     ["bedroom", "bed together"],
};

const VIOLENCE_TAGS = {
  blood:             ["blood", "bloody", "bleeding", "bleeds", "bloodied", "blood spurts", "blood splatter", "blood splatters", "blood sprays", "see blood"],
  gore:              ["gore", "gory", "blood gore", "graphic", "graphically", "gruesome", "disturbing", "splatter", "splatters", "spurts"],
  guns:              ["gun", "guns", "shot", "shoots", "shooting", "shootout", "shootouts", "gunshot", "gunfire", "shotgun", "bullet", "being shot", "gets shot", "fired", "fires"],
  knives:            ["knife", "knives", "stabbed", "stabs", "stabbing", "stabbings", "stab", "blade", "slashed", "slit"],
  blunt_weapons:     ["bat", "hammer", "stick", "rock", "bottle", "axe"],
  sword:             ["sword", "swords", "arrow", "arrows"],
  explosions:        ["explosion", "explosions", "explodes", "bomb"],
  fighting:          ["fight", "fights", "fighting", "punches", "punched", "punching", "punch", "hits", "hit", "beaten", "beaten up", "beating", "beat", "beats", "slaps", "slapped", "kicked", "kicks", "kicking", "throws", "thrown", "struck", "strikes", "slams", "smashes", "smashed", "fist"],
  chase:             ["chase", "chases", "escape"],
  death:             ["death", "dead", "dies", "die", "died", "deaths", "dead body", "dead bodies", "corpse", "corpses", "killed", "killing", "kills", "kill", "murdered", "murder", "murders"],
  suicide:           ["suicide", "commits suicide", "hanging", "jumps"],
  injury:            ["wound", "wounds", "wounded", "injury", "injuries", "injured", "injury detail", "hurt", "bruises", "bruised"],
  body_horror:       ["severed", "decapitated", "impaled", "limbs", "chopped", "cut off", "ripped", "flesh", "pieces", "brain"],
  torture:           ["torture", "tortured", "tied", "dragged", "forced", "strangled", "abuse"],
  animal_violence:   ["dog", "horse", "cat", "animal", "animals", "creature", "eaten", "bitten", "bites"],
  sexual_violence:   ["rape", "raped"],
  intense:           ["intense", "brutal", "brutally", "violent", "violently", "extreme", "extremely", "strong violence", "strong bloody", "bloody violence"],
  offscreen:         ["offscreen", "off screen", "implied", "aftermath"],
  slapstick:         ["slapstick", "comedic", "comical", "comic"],
  war:               ["war", "battle", "soldiers", "soldier"],
  crash:             ["crash", "crashes", "accident"],
};

const PROFANITY_TAGS = {
  f_word:            ["fuck", "f word", "f words", "f bomb", "f bombs", "fucking", "fucks", "motherfucker"],
  s_word:            ["shit", "shits", "bullshit"],
  c_word:            ["cunt", "c word"],
  slurs_racial:      ["racial slur", "racial slurs", "slurs", "n word", "nigger", "racist", "derogatory", "derogatory terms"],
  slurs_homophobic:  ["homophobic", "homophobic slurs", "faggot", "fag"],
  b_word:            ["bitch", "b word", "bitches"],
  ass_word:          ["ass", "asshole", "asses", "jackass"],
  bastard:           ["bastard", "bastards"],
  damn:              ["damn", "goddamn", "dammit", "damns", "damned"],
  dick:              ["dick", "dickhead", "cock", "cocksucker", "prick"],
  pussy:             ["pussy"],
  hell:              ["hell", "hells", "bloody hell"],
  crap:              ["crap", "craps"],
  piss:              ["piss", "pissed"],
  mild_expletives:   ["heck", "freaking", "screw", "dumb", "idiot", "stupid", "moron", "jerk", "fool", "shut up", "bugger", "bollocks", "wanker", "sod", "twat", "arse"],
  sexual_language:   ["slut", "whore", "tits", "anatomical", "crude", "vulgar", "obscene", "innuendo"],
  blasphemy:         ["blasphemy", "blasphemous", "religious profanity", "religious exclamations", "vain", "jesus christ", "misuse", "misuses"],
  middle_finger:     ["middle finger", "finger gesture", "hand gesture", "obscene hand"],
  pervasive:         ["pervasive", "frequent", "frequently", "constant", "throughout", "heavy", "strong language", "strong profanity"],
  bleeped:           ["bleeped", "muted", "censored"],
};

const DRUGS_TAGS = {
  cigarettes:        ["cigarette", "cigarettes", "cigarette smoking", "smoke cigarettes", "smoking cigarettes", "smoker"],
  cigars:            ["cigar", "cigars", "cigar smoking", "smoke cigars", "smoking cigars"],
  pipe:              ["pipe", "pipes", "pipe smoking"],
  marijuana:         ["marijuana", "cannabis", "weed", "pot", "joint", "joints", "bong", "smoking marijuana", "smoke marijuana", "smoking weed"],
  alcohol:           ["alcohol", "drinking", "drunk", "drinks", "drink", "alcoholic", "alcohol use", "drunkenness", "intoxicated", "intoxication", "inebriated"],
  beer:              ["beer", "beers", "drinking beer", "drink beer"],
  wine:              ["wine", "drinking wine", "champagne"],
  spirits:           ["whiskey", "whisky", "vodka", "liquor", "spirits", "brandy", "cocktails", "flask"],
  heavy_drinking:    ["heavy drinking", "excess", "gets drunk", "too much", "alcoholism", "addiction", "addict", "addicted"],
  underage_drinking: ["underage", "underage drinking", "teenagers", "teens", "students", "kids", "children"],
  cocaine:           ["cocaine", "snorting", "snorts", "snort", "snorting cocaine", "powder", "coke"],
  heroin:            ["heroin", "injected", "injects", "injection", "needle", "syringe", "morphine"],
  pills:             ["pills", "pill", "ecstasy", "lsd", "acid", "prescription", "prescription medication"],
  meth:              ["meth", "crack", "opium"],
  drug_use:          ["drug use", "drug abuse", "drug references", "drug misuse", "drug addict", "drug dealer", "dealing", "dealer", "illegal", "substance", "smuggling"],
  drugged:           ["drugged", "poisoned", "hallucinations"],
  overdose:          ["overdose", "passes out"],
  pervasive:         ["frequent", "frequently", "throughout", "constantly", "pervasive", "heavy"],
};

const CATEGORY_MAP = {
  SEXUAL_CONTENT: SEX_TAGS,
  VIOLENCE:       VIOLENCE_TAGS,
  PROFANITY:      PROFANITY_TAGS,
  ALCOHOL_DRUGS:  DRUGS_TAGS,
};

function extractTags(reviews, tagDict) {
  const tags = new Set();
  for (const review of reviews) {
    const text = review.toLowerCase();
    const words = text.split(/\s+/);
    for (const [tag, keywords] of Object.entries(tagDict)) {
      if (tags.has(tag)) continue;
      for (const kw of keywords) {
        const idx = text.indexOf(kw);
        if (idx === -1) continue;
        const kwWordPos = text.slice(0, idx).split(/\s+/).length;
        const window = words.slice(Math.max(0, kwWordPos - NEGATION_WINDOW), kwWordPos).join(" ");
        if (![...NEGATIONS].some(neg => window.includes(neg))) {
          tags.add(tag);
          break;
        }
      }
    }
  }
  return [...tags].sort();
}

/**
 * Given a movie object from cache.json, returns tags per category.
 * @param {Object} movie
 * @returns {{ SEXUAL_CONTENT: string[], VIOLENCE: string[], PROFANITY: string[], ALCOHOL_DRUGS: string[] }}
 */
export function extractMovieTags(movie) {
  const result = {};
  for (const section of movie.rawParentsGuide || []) {
    const tagDict = CATEGORY_MAP[section.category];
    if (!tagDict) continue;
    const reviews = (section.reviews || []).map(r => r.text || "");
    result[section.category] = extractTags(reviews, tagDict);
  }
  return result;
}