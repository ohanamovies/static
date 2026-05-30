#!/usr/bin/env node
/**
 * MovieDB Scraper
 * ---------------
 * 1. Downloads IMDb title.basics + title.ratings datasets
 * 2. Filters top 50k movies+tvSeasons by vote count + rating
 * 3. Enriches with TMDB data (poster URL, providers, popularity)
 *    - Runs incrementally: skips already-enriched movies
 *    - Respects TMDB rate limits (40 req/10s)
 * 4. Enriches with IMDb parentsGuide maturity data
 * 5. Outputs: public/movies.json (bitmask-encoded, minified)
 *
 * Usage:
 *   TMDB_API_KEY=your_key node scrape.js
 *   TMDB_API_KEY=your_key node scrape.js --limit 100   # enrich only 100 new movies
 *   TMDB_API_KEY=your_key node scrape.js --mat-limit 100  # enrich 100 maturity entries
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import zlib from "zlib";
import readline from "readline";
import { pipeline } from "stream/promises";

// ─── Config ────────────────────────────────────────────────────────────────────
const TMDB_KEY = process.env.TMDB_API_KEY;
const OUT_DIR = path.resolve("../website/public");
const CACHE_FILE = path.resolve("./cache.json");
const OUTPUT_FILE = path.join(OUT_DIR, "movies.json");
const IMDB_BASICS_URL = "https://datasets.imdbws.com/title.basics.tsv.gz";
const IMDB_RATINGS_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz";
const TOP_N = 50_000;
const TMDB_RATE_LIMIT = 40; // requests per window
const TMDB_RATE_WINDOW = 10_000; // ms
const MAT_RATE_LIMIT = 5; // imdbapi.dev rate limit per window
const MAT_RATE_WINDOW = 5_000; // ms

// CLI args
const args = process.argv.slice(2);
const enrichLimit = (() => {
  const idx = args.indexOf("--limit");
  return idx !== -1 ? parseInt(args[idx + 1]) : 500;
})();
const matLimit = (() => {
  const idx = args.indexOf("--mat-limit");
  return idx !== -1 ? parseInt(args[idx + 1]) : 50;
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
export const MATURITY_CATEGORIES = [
  { key: "sexAndNudity",           label: "Sex & Nudity",             shift: 0 },
  { key: "violenceAndGore",        label: "Violence & Gore",          shift: 2 },
  { key: "profanity",              label: "Profanity",                shift: 4 },
  { key: "alcoholDrugsAndSmoking", label: "Alcohol, Drugs & Smoking", shift: 6 },
  { key: "frighteningScenes",      label: "Frightening Scenes",       shift: 8 },
];

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

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, { headers: { "User-Agent": "MovieDBScraper/1.0", "Accept": "application/json" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}\nBody: ${data.slice(0, 200)}`)); }
      });
    }).on("error", reject);
  });
}

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
    if (parseFloat(row.numVotes) >= 1000 && parseFloat(row.averageRating) >= 5 ) {
      ratings.set(row.tconst, {
        rating: parseFloat(row.averageRating),
        votes: parseInt(row.numVotes),
      });
    }
  });
  log(`Loaded ${ratings.size} titles with ≥1000 votes & averageRating ≥ 5.`);

  log("Parsing IMDb basics...");
  const titles = [];
  await parseTsv("./title.basics.tsv", (row) => {
    // Include movies and TV seasons only
    if (row.titleType !== "movie" && row.titleType !== "tvSeason") return;
    if (!ratings.has(row.tconst)) return;
    if (row.isAdult === "1") return;

    const genreList = row.genres === "\\N" ? [] : row.genres.split(",");
    // Explicitly exclude adult genre entries
    if (genreList.includes("Adult")) return;

    let genreMask = 0;
    for (const g of genreList) {
      if (GENRE_MAP[g] !== undefined) genreMask |= GENRE_MAP[g];
    }

    const r = ratings.get(row.tconst);
    titles.push({
      id: row.tconst,
      title: row.primaryTitle,
      year: row.startYear === "\\N" ? null : parseInt(row.startYear),
      rating: r.rating,
      votes: r.votes,
      genres: genreMask,
      isSeason: row.titleType === "tvSeason",
    });
  });

  log(`Found ${titles.length} titles (movies + TV seasons). Sorting by votes × rating...`);
  titles.sort((a, b) => b.votes * b.rating - a.votes * a.rating);
  const top = titles.slice(0, TOP_N);
  log(`Top ${top.length} titles selected.`);
  return top;
}

// ─── Step 3: TMDB enrichment ───────────────────────────────────────────────────
async function enrichWithTmdb(movies, cache) {
  if (!TMDB_KEY) {
    log("⚠  No TMDB_API_KEY — skipping enrichment. Set env var and re-run.");
    return;
  }

  const unenriched = movies.filter((m) => !cache[m.id]?.enriched);
  const toEnrich = unenriched.slice(0, enrichLimit);
  log(`Enriching ${toEnrich.length} titles with TMDB data (${unenriched.length - toEnrich.length} deferred)...`);

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

          if (movie.isSeason) {
            // TV Season: use tv_season_results
            const tvSeason = findData.tv_season_results?.[0];
            if (tvSeason) {
              poster = tvSeason.poster_path
                ? `https://image.tmdb.org/t/p/w342${tvSeason.poster_path}`
                : null;
              const showId = tvSeason.show_id;
              // Get popularity from the parent show
              try {
                const showUrl = `https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_KEY}`;
                const showData = await tmdbLimiter.run(() => fetchJson(showUrl));
                popularity = Math.round((showData.popularity ?? 0) * 10) / 10;
              } catch (_) {}
              // Get watch providers for the TV show
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
            }
          } else {
            // Movie: use movie_results
            const tmdbMovie = findData.movie_results?.[0];
            if (tmdbMovie) {
              poster = tmdbMovie.poster_path
                ? `https://image.tmdb.org/t/p/w342${tmdbMovie.poster_path}`
                : null;
              popularity = Math.round((tmdbMovie.popularity ?? 0) * 10) / 10;
              const tmdbId = tmdbMovie.id;
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
            }
          }

          cache[movie.id] = { enriched: true, poster, popularity, providerMask };
        } catch (e) {
          log(`  ✗ TMDB ${movie.id}: ${e.message}`);
          cache[movie.id] = { enriched: true, poster: null, popularity: 0, providerMask: 0 };
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

// Map API uppercase category names → our MATURITY_CATEGORIES shift positions
const API_CAT_TO_SHIFT = {
  "SEXUAL_CONTENT":             0,  // sexAndNudity
  "VIOLENCE":                   2,  // violenceAndGore
  "PROFANITY":                  4,  // profanity
  "ALCOHOL_DRUGS":              6,  // alcoholDrugsAndSmoking
  "FRIGHTENING_INTENSE_SCENES": 8,  // frighteningScenes
};

const SEV_WEIGHT = { none: 1, mild: 2, moderate: 3, severe: 4 };

// Compute weighted average from severityBreakdowns array → 0-3
function weightedSeverity(severityBreakdowns) {
  if (!Array.isArray(severityBreakdowns) || severityBreakdowns.length === 0) return null;
  let total = 0, wsum = 0;
  for (const { severityLevel, voteCount } of severityBreakdowns) {
    const w = SEV_WEIGHT[severityLevel];
    if (w == null) continue;
    total += voteCount;
    wsum  += voteCount * w;
  }
  if (total === 0) return null;
  return Math.round(wsum / total) - 1; // convert 1-4 avg → 0-3
}

function parseMaturityResponse(data) {
  const items = data?.parentsGuide;
  if (!Array.isArray(items) || items.length === 0) return null;

  let mat = 0;
  let anyFound = false;
  for (const item of items) {
    const shift = API_CAT_TO_SHIFT[item.category];
    if (shift == null) continue;
    const sev = weightedSeverity(item.severityBreakdowns);
    if (sev != null) {
      mat |= (sev & 3) << shift;
      anyFound = true;
    }
  }
  return anyFound ? mat : null;
}

async function enrichWithMaturity(movies, cache) {
  const unenriched = movies.filter((m) => cache[m.id]?.maturityDone !== true);
  const toEnrich = unenriched.slice(0, matLimit);
  log(`Enriching ${toEnrich.length} titles with maturity data (${unenriched.length - toEnrich.length} deferred)...`);

  let done = 0;
  const BATCH = 8;

  for (let i = 0; i < toEnrich.length; i += BATCH) {
    const batch = toEnrich.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (movie) => {
        try {
          const url = `https://api.imdbapi.dev/titles/${movie.id}/parentsGuide`;
          const data = await matLimiter.run(() => fetchJson(url));
          const matMask = parseMaturityResponse(data);
          // matMask is null if we couldn't parse any data, or a number (0-1023) if parsed
          if (matMask != null) {
            cache[movie.id] = { ...cache[movie.id], maturityDone: true, matMask };
          } else {
            cache[movie.id] = { ...cache[movie.id], maturityDone: true };
          }
        } catch (e) {
          log(`  ✗ Mat ${movie.id}: ${e.message}`);
          cache[movie.id] = { ...cache[movie.id], maturityDone: true }; // mark done, no matMask
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

// ─── Step 5: Merge and output ──────────────────────────────────────────────────
function buildOutput(movies, cache) {
  const output = movies.map((m) => {
    const c = cache[m.id] || {};
    const entry = {
      id: m.id,
      t: m.title,
      y: m.year,
      r: m.rating,
      g: m.genres,
      pop: c.popularity ?? 0,
      p: c.poster ?? null,
      prov: c.providerMask ?? 0,
    };
    if (m.isSeason) entry.s = 1;
    // mat is only written when scraper successfully computed a mask (including 0 = all-None)
    if (c.maturityDone && c.matMask !== undefined) entry.mat = c.matMask;
    return entry;
  });

  return {
    movies: output,
    genres: Object.fromEntries(Object.entries(GENRES).map(([k, v]) => [k, v])),
    providers: PROVIDERS,
    providerNames: PROVIDER_NAMES,
    maturityCategories: MATURITY_CATEGORIES,
  };
}

// ─── Cache helpers ─────────────────────────────────────────────────────────────
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); }
    catch (_) {}
  }
  return {};
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await ensureImdbFiles();
  const movies = await buildTopN();
  const cache = loadCache();

  await enrichWithTmdb(movies, cache);
  await enrichWithMaturity(movies, cache);

  log("Building output JSON...");
  const output = buildOutput(movies, cache);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));
  const size = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  log(`✓ Written ${OUTPUT_FILE} (${size} KB, ${output.movies.length} titles)`);

  const enriched = movies.filter((m) => cache[m.id]?.enriched).length;
  const withPoster = movies.filter((m) => cache[m.id]?.poster).length;
  const withMat = movies.filter((m) => cache[m.id]?.maturityDone).length;
  log(`  TMDB enriched: ${enriched}/${movies.length} | With poster: ${withPoster} | With maturity: ${withMat}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
