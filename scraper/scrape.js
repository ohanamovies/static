#!/usr/bin/env node
/**
 * MovieDB Scraper
 * ---------------
 * 1. Downloads IMDb title.basics + title.ratings datasets
 * 2. Filters top 50k movies+tvSeasons by vote count + rating
 * 3. Enriches with TMDB data (poster URL, providers, popularity, TMDB id,
 *    English + Spanish synopsis, Spanish title, origin countries)
 *    - Runs incrementally: skips recently-enriched movies
 *    - Re-enriches stale entries (older than --recrawl-days, default 30d), oldest-first
 *    - Respects TMDB rate limits (40 req/10s)
 *    - Fetches MPA/TV-rating for both movies AND TV seasons
 *    - Filters out titles whose origin country is India (IN) or China (CN)
 * 4. Enriches with IMDb parentsGuide maturity data
 * 5. Enriches with Common Sense Media (recommendedAge, CSM rating, parentsNeedToKnow,
 *    content grid scores). Loops a–z × all pages; matches by title + year.
 * 6. Outputs: public/movies.json (bitmask-encoded, minified)
 *
 * Usage:
 *   TMDB_API_KEY=your_key node scrape.js
 *   TMDB_API_KEY=your_key node scrape.js --limit 100          # enrich only 100 new/stale movies
 *   TMDB_API_KEY=your_key node scrape.js --mat-limit 100      # enrich 100 maturity entries
 *   TMDB_API_KEY=your_key node scrape.js --csm-limit 500      # crawl only 500 CSM items
 *   TMDB_API_KEY=your_key node scrape.js --recrawl-days 14    # re-enrich entries older than 14 days (default: 7)
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import zlib from "zlib";
import readline from "readline";
import { pipeline } from "stream/promises";
import { MATURITY_CATEGORIES as MAT_CATS, computeMatMask } from "./../website/src/maturity.js";
import { extractMovieTags } from "./tags.js";

// ─── Config ────────────────────────────────────────────────────────────────────
const TMDB_KEY = process.env.TMDB_API_KEY;
const OUT_DIR = path.resolve("../website/public");
const CACHE_FILE = path.resolve("./cache.json.gz");
const OUTPUT_FILE = path.join(OUT_DIR, "movies.json");
const EXTRA_FILE = path.join(OUT_DIR, "extra.json");
const IMDB_BASICS_URL = "https://datasets.imdbws.com/title.basics.tsv.gz";
const IMDB_RATINGS_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz";
const TOP_N = 100_000;
const MIN_VOTES = 750;
const MIN_RATING = 5;
// Keep new/recent titles even before IMDb has enough ratings data.
// IMDb exposes release dates as years in title.basics, so use a coarse year window.
const RECENT_RELEASE_YEAR_WINDOW = 1;
const TMDB_RATE_LIMIT = 40; // requests per window
const TMDB_RATE_WINDOW = 2_000; // ms
const MAT_RATE_LIMIT = 8; // imdbapi.dev rate limit per window
const MAT_RATE_WINDOW = 5_000; // ms
const CSM_RATE_LIMIT = 4; // be polite to commonsensemedia.org
const CSM_RATE_WINDOW = 2_000; // ms


// CLI args
const args = process.argv.slice(2);
const enrichLimit = (() => {
  const idx = args.indexOf("--limit");
  return idx !== -1 ? parseInt(args[idx + 1]) : 1000;
})();
const matLimit = (() => {
  const idx = args.indexOf("--mat-limit");
  return idx !== -1 ? parseInt(args[idx + 1]) : 1000;
})();
const recrawlDays = (() => {
  const idx = args.indexOf("--recrawl-days");
  return idx !== -1 ? parseInt(args[idx + 1]) : 28;
})();
const RECRAWL_MS = recrawlDays * 24 * 60 * 60 * 1000;
const csmLimit = (() => {
  const idx = args.indexOf("--csm-limit");
  return idx !== -1 ? parseInt(args[idx + 1]) : 0; // default: crawl nothing
})();

// ─── Bitmask Definitions ────────────────────────────────────────────────────────
export const GENRES = {
  "Action":      1 << 0,
  "Adventure":   1 << 1,
  "Animation":   1 << 2,
  "Biography":   1 << 3,
  "Comedy":      1 << 4,
  "Crime":       1 << 5,
  "Documentary": 1 << 6,
  "Drama":       1 << 7,
  "Family":      1 << 8,
  "Fantasy":     1 << 9,
  "Film-Noir":   1 << 10,
  "History":     1 << 11,
  "Horror":      1 << 12,
  "Music":       1 << 13,
  "Musical":     1 << 14,
  "Mystery":     1 << 15,
  "Romance":     1 << 16,
  "Sci-Fi":      1 << 17,
  "Sport":       1 << 18,
  "Thriller":    1 << 19,
  "War":         1 << 20,
  "Western":     1 << 21,
};

const GENRE_MAP = GENRES;

// Maturity: 5 IMDb parentsGuide categories, 2 bits each (0=None,1=Mild,2=Moderate,3=Severe)
// Stored as a 10-bit number: bits 0-1=Nudity, 2-3=Violence, 4-5=Profanity, 6-7=Substances, 8-9=Frightening

// ─── Spain streaming providers bitmask ─────────────────────────────────────────
export const PROVIDERS = {
  8:    1 << 0,   // Netflix
  119:  1 << 1,   // Amazon Prime Video
  337:  1 << 2,   // Disney+
  384:  1 << 3,   // HBO Max (Max)
  149:  1 << 4,   // Movistar Plus+
  63:   1 << 5,   // Filmin
  350:  1 << 6,   // Apple TV+
  531:  1 << 7,   // Paramount+
  567:  1 << 8,   // SkyShowtime
  541:  1 << 9,   // Atresplayer Premium
  2:    1 << 10,  // Apple TV (buy/rent)
  11:   1 << 11,  // MUBI
};

const PROVIDER_ID_TO_BIT = Object.fromEntries(
  Object.entries(PROVIDERS).map(([id, bit]) => [Number(id), bit])
);

export const PROVIDER_NAMES = {
  8:    "Netflix",
  119:  "Prime Video",
  337:  "Disney+",
  384:  "Max",
  149:  "Movistar+",
  63:   "Filmin",
  350:  "Apple TV+",
  531:  "Paramount+",
  567:  "SkyShowtime",
  541:  "Atresplayer",
  2:    "Apple TV",
  11:   "MUBI",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
function log(msg) { process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`); }

function fetchGzip(url, destPath) {
  return new Promise((resolve, reject) => {
    log(`Downloading ${url}...`);
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      pipeline(res, zlib.createGunzip(), file).then(resolve).catch(reject);
    }).on("error", reject);
  });
}

async function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const defaultHeaders = { "User-Agent": "MovieDBScraper/1.0", "Accept": "application/json" };
    lib.get(url, { headers: { ...defaultHeaders, ...headers } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}\nBody: ${data.slice(0, 200)}`)); }
      });
    }).on("error", reject);
  });
}

const CSM_HEADERS = {
  "cache-control": "no-cache",
  "content-type": "application/json",
  "j-authorization": "Bearer 48307589",
  "pragma": "no-cache",
  "priority": "u=1, i",
  "sec-ch-ua": '"Chromium";v="147", "Not.A/Brand";v="8"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
};

class RateLimiter {
  constructor(limit, window) {
    this.limit = limit;
    this.window = window;
    this.queue = [];
    this.running = 0;
    this.timestamps = [];
  }

  async run(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this._drain();
    });
  }

  async _drain() {
    if (this.running >= this.limit) return;
    const task = this.queue.shift();
    if (!task) return;

    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.window);
    if (this.timestamps.length >= this.limit) {
      const wait = this.window - (now - this.timestamps[0]) + 50;
      setTimeout(() => { this.queue.unshift(task); this._drain(); }, wait);
      return;
    }

    this.timestamps.push(now);
    this.running++;
    try {
      task.resolve(await task.fn());
    } catch (e) {
      task.reject(e);
    } finally {
      this.running--;
      this._drain();
    }
  }
}

const tmdbLimiter = new RateLimiter(TMDB_RATE_LIMIT, TMDB_RATE_WINDOW);
const matLimiter = new RateLimiter(MAT_RATE_LIMIT, MAT_RATE_WINDOW);
const csmLimiter = new RateLimiter(CSM_RATE_LIMIT, CSM_RATE_WINDOW);

async function tmdbFetch(url) {
  return tmdbLimiter.run(() => fetchJson(url));
}

// ─── Step 1: Load / download IMDb TSVs ─────────────────────────────────────────
async function ensureImdbFiles() {
  const basicsPath = "./title.basics.tsv";
  const ratingsPath = "./title.ratings.tsv";

  if (!fs.existsSync(basicsPath)) {
    await fetchGzip(IMDB_BASICS_URL, basicsPath);
    log("Basics downloaded.");
  } else {
    log("Basics already on disk, skipping download.");
  }

  if (!fs.existsSync(ratingsPath)) {
    await fetchGzip(IMDB_RATINGS_URL, ratingsPath);
    log("Ratings downloaded.");
  } else {
    log("Ratings already on disk, skipping download.");
  }

  return { basicsPath, ratingsPath };
}

// ─── Step 2: Parse TSVs and build top-N list ───────────────────────────────────
async function parseTsv(filePath, onRow) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  let first = true;
  let headers = [];
  for await (const line of rl) {
    if (first) { headers = line.split("\t"); first = false; continue; }
    const cols = line.split("\t");
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i]));
    onRow(row);
  }
}

async function buildTopN() {
  log("Parsing IMDb ratings...");
  const ratings = new Map();
  await parseTsv("./title.ratings.tsv", (row) => {
    // No filter here — keep all ratings so we can later force-add CSM matches
    ratings.set(row.tconst, {
      rating: parseFloat(row.averageRating),
      votes: parseInt(row.numVotes),
    });
  });
  log(`Loaded ${ratings.size} total rated titles.`);

  log("Parsing IMDb basics...");
  const titles = [];
  const recentOrFutureTitles = [];
  const allTitlesMap = new Map(); // imdbId → movie object, unfiltered
  const currentYear = new Date().getFullYear();
  const recentReleaseCutoffYear = currentYear - RECENT_RELEASE_YEAR_WINDOW;

  await parseTsv("./title.basics.tsv", (row) => {
    // Include movies and TV seasons only
    if (row.titleType !== "movie" && row.titleType !== "tvSeries") return;
    if (row.isAdult === "1") return;

    const genreList = row.genres === "\\N" ? [] : row.genres.split(",");
    // Explicitly exclude adult genre entries
    if (genreList.includes("Adult")) return;

    let genreMask = 0;
    for (const g of genreList) {
      if (GENRE_MAP[g] !== undefined) genreMask |= GENRE_MAP[g];
    }

    const ratingInfo = ratings.get(row.tconst);
    const year = row.startYear === "\\N" ? null : parseInt(row.startYear, 10);
    const isRecentOrFutureRelease = year !== null && year >= recentReleaseCutoffYear;
    const entry = {
      id: row.tconst,
      title: row.primaryTitle,
      year,
      rating: ratingInfo?.rating,
      votes: ratingInfo?.votes ?? 0,
      genres: genreMask,
      isSeason: row.titleType === "tvSeries",
    };
    //allTitlesMap.set(row.tconst, entry);

    // Apply the normal quality filter for established titles, but don't let sparse
    // IMDb ratings data hide unreleased or newly released titles.
    if (ratingInfo?.votes >= MIN_VOTES && ratingInfo.rating >= MIN_RATING) {
      titles.push(entry);
    } else if (isRecentOrFutureRelease) {
      recentOrFutureTitles.push(entry);
    }
  });

  log(`Found ${titles.length} titles passing quality filter and ${recentOrFutureTitles.length} recent/future titles with sparse ratings (movies + TV seasons). Sorting by votes × rating...`);
  titles.sort((a, b) => b.votes * b.rating - a.votes * a.rating);
  const top = titles.slice(0, TOP_N);
  const selected = new Map(top.map((movie) => [movie.id, movie]));
  for (const movie of recentOrFutureTitles) selected.set(movie.id, movie);
  const movies = [...selected.values()];
  log(`Selected ${movies.length} titles (${top.length} ranked + ${movies.length - top.length} recent/future sparse-rating titles).`);
  if (global.gc) global.gc();
  return { movies, allTitlesMap };
}

// ─── Step 3: TMDB enrichment ───────────────────────────────────────────────────
async function enrichWithTmdb(movies, cache) {
  if (!TMDB_KEY) {
    log("⚠  No TMDB_API_KEY — skipping enrichment. Set env var and re-run.");
    return;
  }

  const now = Date.now();
  // A cache entry is stale if it has never been enriched, or its timestamp is older than RECRAWL_MS.
  // Entries with legacy `enriched: true` but no `tmdbEnrichedAt` are treated as epoch 0 (always stale).
  const needsEnrichment = (m) => {
    const c = cache[m.id];
    if (!c?.enriched) return true;
    const ts = c.tmdbEnrichedAt ? new Date(c.tmdbEnrichedAt).getTime() : 0;
    return now - ts > RECRAWL_MS;
  };

  // Sort: no-date (never enriched) first, then oldest tmdbEnrichedAt first
  const stale = movies
    .filter(needsEnrichment)
    .sort((a, b) => {
      const tsA = cache[a.id]?.tmdbEnrichedAt ? new Date(cache[a.id].tmdbEnrichedAt).getTime() : 0;
      const tsB = cache[b.id]?.tmdbEnrichedAt ? new Date(cache[b.id].tmdbEnrichedAt).getTime() : 0;
      return tsA - tsB;
    });

  const toEnrich = stale.slice(0, enrichLimit);
  log(`Enriching ${toEnrich.length} titles with TMDB data (${stale.length - toEnrich.length} stale deferred, recrawl window: ${recrawlDays}d)...`);

  let done = 0;
  const BATCH = 50;

  for (let i = 0; i < toEnrich.length; i += BATCH) {
    const batch = toEnrich.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (movie) => {
        try {
          const findUrl = `https://api.themoviedb.org/3/find/${movie.id}?api_key=${TMDB_KEY}&external_source=imdb_id`;
          const findData = await tmdbLimiter.run(() => fetchJson(findUrl));

          let poster = null;
          let popularity = 0;
          let providerMask = 0;

          let tmdbId = null;
          let overviewEn = null;
          let overviewEs = null;
          let titleEs = null;
          let originCountries = null;

          if (movie.isSeason) {
            // TV Series: use tv_results
            const tvSeries = findData.tv_results?.[0];
            if (tvSeries) {
              const showId = tvSeries.id;
              poster = tvSeries.poster_path
                ? `https://image.tmdb.org/t/p/w342${tvSeries.poster_path}`
                : null;
              tmdbId = tvSeries.id ?? null;
              overviewEn = tvSeries.overview || null;

              // Get popularity + origin countries from the series itself
              let showData = null;
              try {
                const showUrl = `https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_KEY}`;
                showData = await tmdbLimiter.run(() => fetchJson(showUrl));
                popularity = Math.round((showData.popularity ?? 0) * 10) / 10;
              } catch (_) {}
              originCountries = showData?.origin_country ?? null;

              // Watch providers
              try {
                const provUrl = `https://api.themoviedb.org/3/tv/${showId}/watch/providers?api_key=${TMDB_KEY}`;
                const provData = await tmdbLimiter.run(() => fetchJson(provUrl));
                const es = provData.results?.ES;
                if (es) {
                  for (const p of (es.flatrate || [])) {
                    const bit = PROVIDER_ID_TO_BIT[p.provider_id];
                    if (bit) providerMask |= bit;
                  }
                }
              } catch (_) {}

              // Spanish translation for overview + title
              try {
                const transUrl = `https://api.themoviedb.org/3/tv/${showId}/translations?api_key=${TMDB_KEY}`;
                const transData = await tmdbLimiter.run(() => fetchJson(transUrl));
                const esEntry = transData.translations?.find(
                  (t) => t.iso_3166_1 === "ES" && t.iso_639_1 === "es"
                );
                overviewEs = esEntry?.data?.overview || null;
                titleEs = esEntry?.data?.name || null;
              } catch (_) {}
            }
          } else {
            // Movie: use movie_results
            const tmdbMovie = findData.movie_results?.[0];
            if (tmdbMovie) {
              poster = tmdbMovie.poster_path
                ? `https://image.tmdb.org/t/p/w342${tmdbMovie.poster_path}`
                : null;
              popularity = Math.round((tmdbMovie.popularity ?? 0) * 10) / 10;
              tmdbId = tmdbMovie.id ?? null;
              overviewEn = tmdbMovie.overview || null;
              try {
                const provUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${TMDB_KEY}`;
                const provData = await tmdbLimiter.run(() => fetchJson(provUrl));
                const es = provData.results?.ES;
                if (es) {
                  for (const p of (es.flatrate || [])) {
                    const bit = PROVIDER_ID_TO_BIT[p.provider_id];
                    if (bit) providerMask |= bit;
                  }
                }
              } catch (_) {}
              // Fetch Spanish translation for overview + title + origin countries (single details call)
              try {
                const detailsUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}`;
                const details = await tmdbLimiter.run(() => fetchJson(detailsUrl));
                originCountries = details.origin_country ?? details.production_countries?.map((c) => c.iso_3166_1) ?? null;
              } catch (_) {}
              try {
                const transUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/translations?api_key=${TMDB_KEY}`;
                const transData = await tmdbLimiter.run(() => fetchJson(transUrl));
                const esEntry = transData.translations?.find((t) => t.iso_3166_1 === "ES" && t.iso_639_1 === "es");
                overviewEs = esEntry?.data?.overview || null;
                titleEs = esEntry?.data?.title || null;
              } catch (_) {}
            }
          }

          // ── MPA rating (US release certification) ──────────────────────
          let mpaCertification = null;
          if (tmdbId && !movie.isSeason) {
            try {
              const relUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${TMDB_KEY}`;
              const relData = await tmdbLimiter.run(() => fetchJson(relUrl));
              const usRelease = relData.results?.find((r) => r.iso_3166_1 === "US");
              if (usRelease) {
                // Sort a copy so we don't mutate the original; pick the first
                // non-empty certification, preferring theatrical (type 3) releases.
                const sorted = [...(usRelease.release_dates ?? [])]
                  .sort((a, b) => {
                    if (a.type === 3 && b.type !== 3) return -1;
                    if (b.type === 3 && a.type !== 3) return  1;
                    return 0;
                  });
                const cert = sorted.find((d) => d.certification?.trim())?.certification?.trim() ?? null;
                // Filter out placeholder-only values that TMDB sometimes returns
                mpaCertification = (cert && cert !== "NR" && cert !== "Not Rated") ? cert : null;
              }
            } catch (_) {}
          } else if (tmdbId && movie.isSeason) {
            // For TV series, fetch content ratings directly from the show
            try {
              const showId = findData.tv_results?.[0]?.id;
              if (showId) {
                const ratingsUrl = `https://api.themoviedb.org/3/tv/${showId}/content_ratings?api_key=${TMDB_KEY}`;
                const ratingsData = await tmdbLimiter.run(() => fetchJson(ratingsUrl));
                const usRating = ratingsData.results?.find((r) => r.iso_3166_1 === "US");
                const cert = usRating?.rating?.trim() ?? null;
                mpaCertification = (cert && cert !== "NR" && cert !== "Not Rated") ? cert : null;
              }
            } catch (_) {}
          }

          cache[movie.id] = { ...cache[movie.id], enriched: true, tmdbEnrichedAt: new Date().toISOString(), tmdbId, poster, popularity, providerMask, overviewEn, overviewEs, titleEs, mpaCertification, originCountries };
        } catch (e) {
          log(`  ✗ TMDB ${movie.id}: ${e.message}`);
          cache[movie.id].enriched = true
          cache[movie.id].tmdbEnrichedAt = new Date().toISOString()
        }
      })
    );

    done += batch.length;
    if (done % 200 === 0 || done === toEnrich.length) {
      log(`  TMDB enriched ${done}/${toEnrich.length}...`);
      saveCache(cache);
    }
  }

  saveCache(cache);
  log("TMDB enrichment complete.");
}

// ─── Step 4: Maturity enrichment (imdbapi.dev) ─────────────────────────────────
// API response shape (confirmed):
// { parentsGuide: [{ category: "VIOLENCE", severityBreakdowns: [{ severityLevel: "mild", voteCount: 121 }, ...], reviews: [{ text: "..." }] }] }



async function enrichWithMaturity(movies, cache) {
  const now = Date.now();
  // Stale if never enriched, or timestamp older than RECRAWL_MS (legacy entries with no date → epoch 0)
  const needsEnrichment = (m) => {
    const c = cache[m.id];
    if (!c?.maturityDone) return true;
    const ts = c.maturityEnrichedAt ? new Date(c.maturityEnrichedAt).getTime() : 0;
    return now - ts > RECRAWL_MS;
  };

  // Sort: never-enriched first, then oldest maturityEnrichedAt first
  const stale = movies
    .filter(needsEnrichment)
    .sort((a, b) => {
      const tsA = cache[a.id]?.maturityEnrichedAt ? new Date(cache[a.id].maturityEnrichedAt).getTime() : 0;
      const tsB = cache[b.id]?.maturityEnrichedAt ? new Date(cache[b.id].maturityEnrichedAt).getTime() : 0;
      return tsA - tsB;
    });

  const toEnrich = stale.slice(0, matLimit);
  log(`Enriching ${toEnrich.length} titles with maturity data (${stale.length - toEnrich.length} stale deferred, recrawl window: ${recrawlDays}d)...`);

  let done = 0;
  const BATCH = 8;

  for (let i = 0; i < toEnrich.length; i += BATCH) {
    const batch = toEnrich.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (movie) => {
        try {
          const url = `https://api.imdbapi.dev/titles/${movie.id}/parentsGuide`;
          const data = await matLimiter.run(() => fetchJson(url));
          const rawParentsGuide = data?.parentsGuide ?? null;
          cache[movie.id] = { ...cache[movie.id], maturityDone: true, maturityEnrichedAt: new Date().toISOString(), rawParentsGuide, preds: null };
        } catch (e) {
          log(`  ✗ Mat ${movie.id}: ${e.message}`);
          cache[movie.id] = { ...cache[movie.id], maturityDone: true, maturityEnrichedAt: new Date().toISOString() };
        }
      })
    );

    done += batch.length;
    if (done % 100 === 0 || done === toEnrich.length) {
      log(`  Maturity enriched ${done}/${toEnrich.length}...`);
      saveCache(cache);
    }
  }

  saveCache(cache);
  log("Maturity enrichment complete.");
}

// ─── Step 5: Common Sense Media enrichment ─────────────────────────────────────
// Strategy: loop a–z (plus "0" for digit-starting titles), paginate each letter
// until the API returns an empty items array. Match each CSM item to an IMDB
// entry by normalising both titles and comparing release years (±1 tolerance).
// Matched data is stored under cache[imdbId].csm = { … }.
//
// CLI: node scrape.js --csm-limit 500   (default: all pages for all letters)
//      node scrape.js --csm-only        (skip TMDB/maturity, only run CSM step)

/** Normalise a title for fuzzy matching */
function normaliseTitle(t) {
  return (t || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // strip accents
    .replace(/&/g, "and")                               // & → and
    .replace(/^(the|a|an)\s+/, "")                      // strip leading articles
    .replace(/[^a-z0-9\s]/g, "")                        // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip a trailing season/series qualifier from an IMDB tvSeason title.
 *  e.g. "Breaking Bad: Season 2" → "Breaking Bad"
 *       "The Crown - Series 3"   → "The Crown"
 *       "Stranger Things"        → "Stranger Things" (unchanged)
 */
function stripSeasonSuffix(t) {
  return t.replace(/[\s:,\-–]+(?:season|series|part|chapter|vol\.?|volume)\s+\d+\s*$/i, "").trim();
}

/**
 * Build a lookup map from the movies list:
 *   normalisedTitle -> [ { id, year, isSeason } ]
 * TV seasons are indexed under both their full IMDB title and the show name
 * with the season suffix stripped, so CSM's plain show titles can match.
 */
function buildTitleIndex(movies) {
  const idx = new Map();
  const add = (key, entry) => {
    if (!key) return;
    if (!idx.has(key)) idx.set(key, []);
    // Avoid duplicate entries for the same id
    if (!idx.get(key).find(e => e.id === entry.id)) idx.get(key).push(entry);
  };

  for (const m of movies.values()) {
    const entry = { id: m.id, year: m.year, isSeason: m.isSeason };
    const normFull = normaliseTitle(m.title);
    add(normFull, entry);

    // For TV seasons, also index under the stripped show name
    if (m.isSeason) {
      const stripped = normaliseTitle(stripSeasonSuffix(m.title));
      if (stripped !== normFull) add(stripped, entry);
    }
  }
  return idx;
}

/** Extract a release year from a CSM item's product.summary array */
function csmYear(item) {
  const summaries = item.product?.summary ?? [];
  for (const s of summaries) {
    if (s.label === "Release Year" && s.values?.[0]?.value) {
      return parseInt(s.values[0].value);
    }
  }
  return null;
}

/** Match a CSM item to an IMDB id. Returns the IMDB id string or null. */
function matchCsmToImdb(item, titleIndex, missLog) {
  const normCsm = normaliseTitle(item.title);
  const candidates = titleIndex.get(normCsm);
  if (!candidates?.length) {
    missLog?.push(item.title);
    return null;
  }

  const year = csmYear(item);
  const isTV = item.product?.type === "csm_tv_show" || item.product?.label === "TV";

  // Prefer candidates matching the content type (movie vs season)
  const typed = isTV
    ? candidates.filter(c => c.isSeason)
    : candidates.filter(c => !c.isSeason);
  const pool = typed.length > 0 ? typed : candidates; // fall back to all if no type match

  if (year == null) return pool[0].id;

  const exact = pool.find((c) => c.year === year);
  if (exact) return exact.id;
  const close = pool.find((c) => c.year != null && Math.abs(c.year - year) <= 1);
  return close?.id ?? pool[0].id;
}

/** Convert a CSM content_grid array to a plain object { violence, sex, language, drugs }.
 *  Returns null if all values are 0 (server default for missing data). */
function parseCsmContentGrid(grid) {
  const out = {};
  for (const cell of (grid ?? [])) {
    out[cell.type] = parseInt(cell.rating) || 0;
  }
  if (Object.keys(out).length === 0) return null;
  const allZero = Object.values(out).every((v) => v === 0);
  return allZero ? null : out;
}


// ─── Step 5b: Force-add CSM-matched movies missing from top-N ─────────────────
/**
 * After CSM crawl, the cache may contain entries matched to IMDb IDs that were
 * excluded from the top-N list (< 1000 votes or rating < 5). This function:
 *   1. Finds all such IMDb IDs in the cache that have CSM data
 *   2. Looks them up in allTitlesMap (the full unfiltered IMDb basics)
 *   3. Returns a deduplicated list to be appended to the working movie set
 *
 * These movies are then enriched with TMDB + maturity data in main().
 */
async function backfillCsmMovies(movies, cache, allTitlesMap) {
  const existingIds = new Set(movies.map((m) => m.id));
  const toAdd = [];

  for (const [imdbId, entry] of Object.entries(cache)) {
    if (!entry?.csm) continue;
    if (existingIds.has(imdbId)) continue;

    const title = allTitlesMap.get(imdbId);
    if (title) {
      toAdd.push(title);
      existingIds.add(imdbId);
    } else {
      log(`  CSM backfill: ${imdbId} not found in IMDb basics, skipping.`);
    }
  }

  log(`CSM backfill: ${toAdd.length} movies force-added (had CSM data but were outside top-N filter).`);
  return toAdd;
}
async function enrichWithCsm(movies, cache, allTitlesMap) {
  const titleIndex = buildTitleIndex(allTitlesMap);

  // A single space query returns all CSM results; page 1 starts at /page/1/%20,
  //const CSM_BASE_URL = "https://www.commonsensemedia.org/ajax/search/category/movie+tv/sort/score-desc";

  const csmUrl = (page) => `https://www.commonsensemedia.org/ajax/reviews/category/movie/rating/3+4+5/status/dvd/sort/date-desc/page/${page+1}/row/list`

  const alreadyHasCsm = new Set(
    movies.map((m) => m.id).filter((id) => cache[id]?.csm)
  );
  log(`CSM: ${alreadyHasCsm.size}/${movies.length} movies already have CSM data.`);

  let pagesScraped = 0;
  let itemsProcessed = 0;
  let matched = 0;
  let matchedPriority = 0;
  let newEntries = 0;
  let consecutiveErrors = 0;
  const missLog = [];
  const limitReached = () => csmLimit !== -1 && itemsProcessed >= csmLimit;

  log(`Starting CSM enrichment (limit: ${csmLimit === -1 ? "all" : csmLimit} items)...`);

  let page = 1;
  while (true) {
    if (limitReached()) break;

    const url = csmUrl(page);
    let data = null;
    try {
      data = await csmLimiter.run(() => fetchJson(url, CSM_HEADERS));
      consecutiveErrors = 0;
    } catch (e) {
      consecutiveErrors++;
      log(`  ✗ CSM fetch error (page=${page}): ${e.message}`);
      if (consecutiveErrors >= 2) {
        log("  CSM: 2 consecutive errors, stopping.");
        break;
      }
      page++;
      continue;
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    log(`  CSM page=${page}: ${items.length} items`);

    if (items.length === 0) break; // exhausted all pages

    for (const item of items) {
      if (limitReached()) break;
      itemsProcessed++;

      if (item.type !== "csm_review") continue;

      const imdbId = matchCsmToImdb(item, titleIndex, missLog);
      matched += imdbId ? 1 : 0;
      if (imdbId && alreadyHasCsm.has(imdbId)) matchedPriority++;

      if (imdbId) {
        const isNew = !cache[imdbId]?.csm;
        if (isNew) newEntries++;

        cache[imdbId] = {
          ...cache[imdbId],
          csm: {
            csmEnrichedAt: new Date().toISOString(),
            csmId: item.id,
            csmUrl: item.url,
            recommendedAge: item.recommendedAge != null ? parseInt(item.recommendedAge) : null,
            csmRating: item.rating != null ? parseInt(item.rating) : null,
            oneLiner: item.oneLiner ?? null,
            parentsNeedToKnow: item.parentsNeedToKnow ?? null,
            contentGrid: parseCsmContentGrid(item.content_grid) || cache[imdbId]?.csm?.contentGrid,
          },
        };
      }
    }

    pagesScraped++;
    if (pagesScraped % 10 === 0) {
      log(`  CSM progress: ${pagesScraped} pages | ${itemsProcessed} items | ${matched} matched (${matchedPriority} refreshed) | ${newEntries} new`);
      saveCache(cache);
    }

    page++;
  }

  saveCache(cache);
  log(`CSM enrichment complete. Pages: ${pagesScraped} | Items: ${itemsProcessed} | Matched: ${matched} (${matchedPriority} refreshed) | New: ${newEntries}`);
  if (missLog.length > 0) {
    log(`CSM unmatched (${missLog.length} total, first 50):\n  ${missLog.slice(0, 50).join("\n  ")}`);
  }
}

/** Counts how many bits are set to 1 in a bitmask */
function countProviders(mask) {
  if (!mask) return 0;
  // Convert to binary string and count the "1"s
  return mask.toString(2).split('1').length - 1;
}

// Countries whose content is excluded from the output
const EXCLUDED_COUNTRIES = new Set(["IN", "CN"]);

/** Returns true if the cache entry's originCountries includes an excluded country */
function isExcludedOrigin(c) {
  if (!c?.originCountries?.length) return false;
  return c.originCountries.some((cc) => EXCLUDED_COUNTRIES.has(cc));
}

const EXCLUDED_TITLE_WORDS = new Set(['sex', 'sexual', 'porn', 'pornhub', 'nude']);
function hasBannedWord(title) {
  return title.toLowerCase().split(/\W+/).some(w => EXCLUDED_TITLE_WORDS.has(w));
}

// ─── Step 6: Merge and output ──────────────────────────────────────────────────
async function buildOutput(movies, cache) {
  const extraLookup = {};
  const output = [];
  const total = movies.length;
  let matComputed = 0, matSkipped = 0, matErrors = 0;
  let excludedCount = 0;
  const LOG_EVERY = 500;

  log(`Building output for ${total} movies...`);

  for (let idx = 0; idx < movies.length; idx++) {
    const m = movies[idx];
    const c = cache[m.id] || {};

    // Skip titles from excluded countries (India, China) or banned words
    if (isExcludedOrigin(c) || hasBannedWord(m.title)) {
      excludedCount++;
      continue;
    }

    const entry = {
      id: m.id,
      t: m.title,
      y: m.year,
      r: m.rating,
      g: m.genres,
      pop: Math.sqrt(c.popularity ?? 0),
      p: c.poster ?? undefined,
      prov: c.providerMask ?? 0,
      mpa: c.mpaCertification ?? undefined,
      mat: computeMatMask(c),
      ts: c.titleEs ?? undefined,
    };
    if (m.isSeason) entry.s = 1;

    output.push(entry);


    // ─── 2. Heavy Metadata Map Entry (extra.json) ────────────────────────
    // Use the IMDb ID as a direct lookup key
    extraLookup[m.id] = {
      synopsisEn: c.overviewEn ?? undefined,
      csm: c.csm?.csmUrl ?? undefined,
      tags: extractMovieTags(c),
      tmdbUrl: c.tmdbId 
      ? `https://www.themoviedb.org/${m.isSeason ? 'tv' : 'movie'}/${c.tmdbId}`
      : undefined
    };
  }

  log(`buildOutput complete: ${output.length} entries (${excludedCount} excluded by origin country/banned words).`);

  
  fs.writeFileSync(EXTRA_FILE, JSON.stringify(extraLookup));
  const size = (fs.statSync(EXTRA_FILE).size / 1024).toFixed(1);
  log(`✓ Written ${EXTRA_FILE} (${size} KB, ${Object.keys(extraLookup).length} titles)`);

  
  return {
    movies: output,
    genres: Object.fromEntries(Object.entries(GENRES).map(([k, v]) => [k, v])),
    providers: PROVIDERS,
    providerNames: PROVIDER_NAMES,
    maturityCategories: MAT_CATS,
  };
}



// ─── Cache helpers ─────────────────────────────────────────────────────────────

export function readGzipJson(filePath) {
  const compressed = fs.readFileSync(filePath);
  const json = zlib.gunzipSync(compressed).toString('utf8');
  return JSON.parse(json);
}

export function writeGzipJson(filePath, data) {
  const json = JSON.stringify(data);
  const compressed = zlib.gzipSync(json);
  // Write to a temp file alongside the target, then rename (atomic on same fs)
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, compressed);
  fs.renameSync(tmp, filePath);
}


function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const cache = readGzipJson(CACHE_FILE)
      // Strip contentGrids where all values are 0 (server defaults for missing data)
      let stripped = 0;
      for (const entry of Object.values(cache)) {
        if (entry?.csm?.contentGrid) {
          const grid = entry.csm.contentGrid;
          const allZero = typeof grid === "object" && !Array.isArray(grid) &&
            Object.values(grid).every((v) => v === 0);
          if (allZero) {
            delete entry.csm.contentGrid;
            stripped++;
          }
        }
      }
      if (stripped > 0) log(`Stripped ${stripped} all-zero contentGrid entries from cache.`);
      return cache;
    } catch (_) {}
  }
  return {};
}

function saveCache(cache) {
  writeGzipJson(CACHE_FILE, cache);
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await ensureImdbFiles();
  const { movies, allTitlesMap } = await buildTopN();
  const cache = loadCache();

  await enrichWithTmdb(movies, cache);
  await enrichWithMaturity(movies, cache);
  await enrichWithCsm(movies, cache, allTitlesMap);

  // Force-add CSM-matched movies that were filtered out of the top-N
  const csmMovies = await backfillCsmMovies(movies, cache, allTitlesMap);
  // Enrich the newly added movies with TMDB + maturity data too
  if (csmMovies.length > 0) {
    log(`Force-added ${csmMovies.length} CSM-matched movies outside top-N. Running TMDB + maturity enrichment...`);
    await enrichWithTmdb(csmMovies, cache);
    await enrichWithMaturity(csmMovies, cache);
  }
  const allMovies = [...movies, ...csmMovies];

  log("Building output JSON...");
  const output = await buildOutput(allMovies, cache);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));
  const size = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  log(`✓ Written ${OUTPUT_FILE} (${size} KB, ${output.movies.length} titles)`);

  const enriched    = allMovies.filter((m) => cache[m.id]?.enriched).length;
  const withPoster  = allMovies.filter((m) => cache[m.id]?.poster).length;
  const withGuide   = allMovies.filter((m) => cache[m.id]?.rawParentsGuide).length;
  const withPreds   = allMovies.filter((m) => cache[m.id]?.preds).length;
  const withCsm     = allMovies.filter((m) => cache[m.id]?.csm).length;
  const forcedIn    = csmMovies.length;
  log(`  TMDB enriched: ${enriched}/${allMovies.length} | With poster: ${withPoster} | With preds: ${withPreds} | With guide: ${withGuide} | With CSM: ${withCsm} | CSM force-added: ${forcedIn}`);
}

main().catch((e) => { console.error(e); process.exit(1); });