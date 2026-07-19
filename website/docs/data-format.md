# Movie data format

`public/movies.json` is a generated, compact catalogue. Do not hand-edit it for normal app changes; regenerate it from the sibling scraper when the catalogue changes.

## Top-level shape

```json
{
  "movies": [],
  "providers": {},
  "genres": {},
  "maturity": {}
}
```

The website currently relies primarily on the compact fields inside each movie and the provider/genre constants in `src/stores/movies.js`.

## Movie fields

```json
{
  "id": "tt0111161",
  "t": "The Shawshank Redemption",
  "ts": "Cadena perpetua",
  "y": 1994,
  "r": 9.3,
  "g": 128,
  "pop": 8.54,
  "p": "https://image.tmdb.org/t/p/w342/...jpg",
  "prov": 3,
  "mat": 4660,
  "s": 1
}
```

| Field | Meaning |
| --- | --- |
| `id` | IMDb title id. |
| `t` | Original/display title. |
| `ts` | Optional translated title, used by search. |
| `y` | Release year. |
| `r` | IMDb rating. |
| `g` | Genre bitmask. Values match `GENRES` in `src/stores/movies.js`. |
| `pop` | TMDB-derived popularity score. |
| `p` | Poster URL; missing posters are hidden outside search. |
| `prov` | Streaming provider bitmask. Values match `PROVIDERS` in `src/stores/movies.js`. |
| `mat` | Packed maturity mask; see below. |
| `s` | Optional scraper/source flag. Not used by core filtering. |

## Maturity mask

`mat` packs four 4-bit nibbles into one integer:

| Category | Shift | Helper key |
| --- | ---: | --- |
| Sex & Nudity | 0 | `sex` |
| Violence | 4 | `violence` |
| Language | 8 | `language` |
| Drugs | 12 | `drugs` |

Use helpers in `src/maturity.js`:

- `getScore(mat, shift)` returns a 0–5-ish score for one category.
- `decodeMatMask(mat)` returns all four category scores.
- Nibble value `15` means unknown/invalid.
