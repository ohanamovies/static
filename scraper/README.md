# MovieDB Scraper

Downloads IMDb datasets, selects top 20k movies, and enriches with TMDB data incrementally.

## Setup

```bash
cd scraper
# No npm install needed — uses only Node.js built-ins
```

## Usage

### First run (downloads IMDb data, enriches top 100)
```bash
TMDB_API_KEY=your_key_here node scrape.js --limit 100
```

### Successive runs (enriches more movies each time)
```bash
TMDB_API_KEY=your_key_here node scrape.js --limit 500
```

### Enrich everything (takes ~2–3 hours due to rate limits)
```bash
TMDB_API_KEY=your_key_here node scrape.js
```

## How it works

1. **Downloads** `title.basics.tsv.gz` and `title.ratings.tsv.gz` from IMDb (only once)
2. **Filters** movies with ≥1000 votes, ranks by `votes × rating`
3. **Enriches** with TMDB: poster URL, popularity score, streaming providers
4. **Caches** results in `cache.json` — safe to interrupt and resume
5. **Outputs** `../website/public/movies.json` with compact bitmask encoding

## Output format

```json
{
  "movies": [
    {
      "id": "tt0111161",
      "t": "The Shawshank Redemption",
      "y": 1994,
      "r": 9.3,
      "g": 4,           ← genre bitmask (Drama = 1<<2 = 4)
      "pop": 85.4,      ← TMDB popularity score
      "p": "https://image.tmdb.org/t/p/w342/...",
      "prov": [8, 15]   ← provider IDs (Netflix=8, Hulu=15, etc.)
    }
  ],
  "providers": { "8": "Netflix", "15": "Hulu", ... },
  "genres": { "Action": 1, "Comedy": 2, ... },
  "maturity": { "Nudity": 1, "Violence": 2, ... }
}
```

## TMDB API Key

Get a free key at https://www.themoviedb.org/settings/api

Rate limit: 40 requests/10s — the scraper handles this automatically.

## File sizes (approximate)

| State | Size |
|-------|------|
| title.basics.tsv | ~800 MB |
| title.ratings.tsv | ~25 MB |
| cache.json (20k enriched) | ~4 MB |
| movies.json (output) | ~3–4 MB |
