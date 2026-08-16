#!/usr/bin/env python3
"""
FIFA Career Tracker - Trophy & Competition Asset Downloader
Downloads competition logos and trophy images for the user's career competitions.
Sources: Wikipedia Commons (free CC images), football-data.org (competition emblems)
"""
import os
import sys
import json
import time
import hashlib
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).parent
ASSETS_DIR = BASE_DIR / 'public' / 'assets' / 'images'
MANIFEST_PATH = BASE_DIR / 'public' / 'assets' / 'manifest.json'

# Assets directories
DIRS = {
    'clubs': ASSETS_DIR / 'clubs',
    'competitions': ASSETS_DIR / 'competitions',
    'trophies': ASSETS_DIR / 'trophies',
    'awards': ASSETS_DIR / 'awards',
}

# Competition key mapping
COMPETITION_KEYS = {
    'Serie A TIM': 'serie-a',
    'Serie A': 'serie-a',
    'Coppa Italia': 'copa-italia',
    'UEFA Champions League': 'champions-league',
    'UEFA Europa League': 'europa-league',
    'UEFA Europa Conference League': 'conference-league',
    'Premier League': 'premier-league',
    'La Liga': 'la-liga',
    'Bundesliga': 'bundesliga',
    'Ligue 1': 'ligue-1',
}

# Wikipedia Commons search terms for trophies
TROPHY_SEARCH = {
    'serie-a': 'Serie A trophy',
    'copa-italia': 'Coppa Italia trophy',
    'champions-league': 'UEFA Champions League trophy',
    'europa-league': 'UEFA Europa League trophy',
    'conference-league': 'UEFA Europa Conference League trophy',
    'premier-league': 'Premier League trophy',
    'la-liga': 'La Liga trophy',
    'bundesliga': 'Bundesliga Meisterschale',
    'ligue-1': 'Trophée des Champions',
}

# Award search terms on Wikipedia Commons
AWARD_SEARCH = {
    'golden-boot': 'Golden Boot football award',
    'player-of-season': 'Player of the Season football',
    'young-player': 'Young Player Award football',
    'ballon-dor': 'Ballon d Or trophy',
    'assist-king': 'Playmaker Award football',
}

# Known direct URLs as fallback (Wikipedia Commons direct image URLs)
KNOWN_TROPHY_URLS = {
    'serie-a': 'https://upload.wikimedia.org/wikipedia/en/e/e1/Serie_A_Trophy.png',
    'copa-italia': 'https://upload.wikimedia.org/wikipedia/en/3/3c/Coppa_Italia.png',
    'champions-league': 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_trophy.png',
    'europa-league': 'https://upload.wikimedia.org/wikipedia/en/1/1b/UEFA_Cup_2009-10.jpg',
    'conference-league': 'https://upload.wikimedia.org/wikipedia/en/5/5f/UEFA_Europa_Conference_League.png',
    'premier-league': 'https://upload.wikimedia.org/wikipedia/en/2/29/Premier_League_Trophy.jpg',
    'ballon-dor': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Ballon_d%27Or_2024.png',
}

# Known award image URLs from Wikipedia Commons
KNOWN_AWARD_URLS = {
    'golden-boot': 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Golden_Boot_award.jpg',
    'ballon-dor': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Ballon_d%27Or_2024.png',
}


def load_manifest() -> dict:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text())
    return {}


def save_manifest(manifest: dict):
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))


def download_file(url: str, dest: Path, timeout: int = 30) -> bool:
    """Download a file with retries."""
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'FIFACareerTracker/1.0 (Personal project; contact: github.com/R8407)'
            })
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
                if len(data) < 100:  # Too small, probably error page
                    print(f"  [WARN] Response too small ({len(data)} bytes), skipping")
                    return False
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
                return True
        except urllib.error.HTTPError as e:
            if e.code == 429:  # Rate limited
                wait = 5 * (attempt + 1)
                print(f"  [RATE LIMITED] Waiting {wait}s...")
                time.sleep(wait)
            elif e.code == 404:
                print(f"  [404] Not found: {url}")
                return False
            else:
                print(f"  [HTTP {e.code}] {url}")
                if attempt < 2:
                    time.sleep(2)
        except Exception as e:
            print(f"  [ERROR] {e}")
            if attempt < 2:
                time.sleep(2)
    return False


def search_wikipedia_commons(query: str, limit: int = 3) -> list[dict]:
    """Search Wikipedia Commons for images."""
    params = urllib.parse.urlencode({
        'action': 'query',
        'generator': 'search',
        'gsrsearch': f'filetype:bitmap {query}',
        'gsrnamespace': '6',
        'gsrlimit': str(limit),
        'prop': 'imageinfo',
        'iiprop': 'url|size',
        'iiurlwidth': '512',
        'format': 'json',
    })
    url = f'https://commons.wikimedia.org/w/api.php?{params}'
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'FIFACareerTracker/1.0 (Personal project)'
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            pages = data.get('query', {}).get('pages', {})
            results = []
            for pid, page in pages.items():
                info = page.get('imageinfo', [{}])[0]
                if info.get('url') and info.get('width', 0) > 100:
                    results.append({
                        'title': page.get('title', ''),
                        'url': info['thumburl'] if 'thumburl' in info else info['url'],
                        'full_url': info['url'],
                        'width': info.get('width', 0),
                        'height': info.get('height', 0),
                    })
            return results
    except Exception as e:
        print(f"  [WIKI SEARCH ERROR] {e}")
        return []


def download_competition_logo(competition: str, manifest: dict) -> bool:
    """Download a competition logo."""
    key = COMPETITION_KEYS.get(competition)
    if not key:
        print(f"  [SKIP] Unknown competition: {competition}")
        return False

    dest = DIRS['competitions'] / f'{key}.webp'
    if dest.exists() and dest.stat().st_size > 500:
        print(f"  [EXISTS] {key}")
        return True

    # Try Wikipedia Commons
    print(f"  [SEARCH] {competition} logo...")
    results = search_wikipedia_commons(f'{competition} logo emblem', limit=3)
    if results:
        url = results[0]['url']
        print(f"  [DOWNLOAD] {url[:80]}...")
        if download_file(url, dest):
            manifest.setdefault('competitions', {})[key] = {
                'name': competition,
                'provider': 'wikimedia-commons',
                'source_url': results[0].get('full_url', url),
                'local_path': str(dest.relative_to(BASE_DIR)),
                'status': 'downloaded',
            }
            return True

    print(f"  [FAILED] Could not find logo for {competition}")
    return False


def download_trophy_image(competition: str, manifest: dict) -> bool:
    """Download a trophy image for a competition."""
    key = COMPETITION_KEYS.get(competition)
    if not key:
        return False

    dest = DIRS['trophies'] / f'{key}.webp'
    if dest.exists() and dest.stat().st_size > 500:
        print(f"  [EXISTS] {key}")
        return True

    # Try known URLs first
    if key in KNOWN_TROPHY_URLS:
        url = KNOWN_TROPHY_URLS[key]
        print(f"  [KNOWN URL] {key}: {url[:60]}...")
        if download_file(url, dest):
            manifest.setdefault('trophies', {})[key] = {
                'name': competition,
                'provider': 'wikimedia-commons',
                'source_url': url,
                'local_path': str(dest.relative_to(BASE_DIR)),
                'status': 'downloaded',
            }
            return True

    # Search Wikipedia Commons
    search_term = TROPHY_SEARCH.get(key, f'{competition} trophy')
    print(f"  [SEARCH] {search_term}...")
    results = search_wikipedia_commons(search_term, limit=5)
    for r in results:
        # Prefer images that look like trophies (not logos, not photos of people)
        title_lower = r['title'].lower()
        if any(skip in title_lower for skip in ['logo', 'emblem', 'badge', 'patch', 'player', 'coach', 'stadium']):
            continue
        url = r['url']
        print(f"  [DOWNLOAD] {r['title'][:50]}...")
        if download_file(url, dest):
            manifest.setdefault('trophies', {})[key] = {
                'name': competition,
                'provider': 'wikimedia-commons',
                'source_url': r.get('full_url', url),
                'local_path': str(dest.relative_to(BASE_DIR)),
                'status': 'downloaded',
            }
            return True

    print(f"  [FAILED] No trophy image found for {competition}")
    return False


def download_award_images(manifest: dict) -> int:
    """Download generic award images (golden boot, player of season, etc.)."""
    downloaded = 0
    for award_key, search_term in AWARD_SEARCH.items():
        dest = DIRS['awards'] / f'{award_key}.webp'
        if dest.exists() and dest.stat().st_size > 500:
            print(f"  [EXISTS] {award_key}")
            downloaded += 1
            continue

        # Try known URLs first
        if award_key in KNOWN_AWARD_URLS:
            url = KNOWN_AWARD_URLS[award_key]
            print(f"  [KNOWN URL] {award_key}...")
            if download_file(url, dest):
                manifest.setdefault('awards', {})[award_key] = {
                    'name': award_key.replace('-', ' ').title(),
                    'provider': 'wikimedia-commons',
                    'source_url': url,
                    'local_path': str(dest.relative_to(BASE_DIR)),
                    'status': 'downloaded',
                }
                downloaded += 1
                continue

        # Search Wikipedia Commons
        print(f"  [SEARCH] {search_term}...")
        results = search_wikipedia_commons(search_term, limit=5)
        for r in results:
            title_lower = r['title'].lower()
            if any(skip in title_lower for skip in ['player', 'coach', 'team', 'stadium', 'match', 'season']):
                continue
            url = r['url']
            print(f"  [DOWNLOAD] {r['title'][:50]}...")
            if download_file(url, dest):
                manifest.setdefault('awards', {})[award_key] = {
                    'name': award_key.replace('-', ' ').title(),
                    'provider': 'wikimedia-commons',
                    'source_url': r.get('full_url', url),
                    'local_path': str(dest.relative_to(BASE_DIR)),
                    'status': 'downloaded',
                }
                downloaded += 1
                break

    return downloaded


def download_club_badge(team_id: str, team_name: str, manifest: dict) -> bool:
    """Download a club badge."""
    dest = DIRS['clubs'] / f'{team_id}.webp'
    if dest.exists() and dest.stat().st_size > 500:
        print(f"  [EXISTS] {team_id} ({team_name})")
        return True

    print(f"  [SEARCH] {team_name} badge...")
    results = search_wikipedia_commons(f'{team_name} F.C. logo', limit=3)
    if not results:
        results = search_wikipedia_commons(f'{team_name} badge logo', limit=3)

    for r in results:
        url = r['url']
        print(f"  [DOWNLOAD] {r['title'][:50]}...")
        if download_file(url, dest):
            manifest.setdefault('clubs', {})[team_id] = {
                'name': team_name,
                'provider': 'wikimedia-commons',
                'source_url': r.get('full_url', url),
                'local_path': str(dest.relative_to(BASE_DIR)),
                'status': 'downloaded',
            }
            return True

    print(f"  [FAILED] No badge found for {team_name} ({team_id})")
    return False


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Download trophy and competition assets')
    parser.add_argument('career_data', help='Path to career_export.json')
    parser.add_argument('--clubs', action='store_true', help='Download club badges')
    parser.add_argument('--competitions', action='store_true', help='Download competition logos')
    parser.add_argument('--trophies', action='store_true', help='Download trophy images')
    parser.add_argument('--awards', action='store_true', help='Download award images')
    parser.add_argument('--all', action='store_true', help='Download everything')
    parser.add_argument('--verify', action='store_true', help='Verify existing assets')
    args = parser.parse_args()

    # Create directories
    for d in DIRS.values():
        d.mkdir(parents=True, exist_ok=True)

    # Load career data
    career_path = Path(args.career_data)
    if not career_path.exists():
        print(f"File not found: {career_path}")
        sys.exit(1)

    with open(career_path) as f:
        data = json.load(f)

    manifest = load_manifest()
    stats = {'downloaded': 0, 'skipped': 0, 'failed': 0}

    # Get competitions from career
    competitions = set()
    for s in data.get('seasons', []):
        league = s.get('league', '')
        if league:
            competitions.add(league)
        for cs in s.get('competitionStats', []):
            comp = cs.get('competition', '')
            if comp:
                competitions.add(comp)

    # Get teams from career
    teams = {}
    for s in data.get('seasons', []):
        club = s.get('club', '')
        club_id = s.get('clubId', '')
        if club and club_id:
            teams[club_id] = club
    # Add squad teams
    for member in data.get('my_squad', []):
        # We don't have team ID for squad members, but we have the user's team
        pass

    do_all = args.all

    # Download competition logos
    if do_all or args.competitions:
        print(f"\n{'='*50}")
        print(f"COMPETITION LOGOS ({len(competitions)} found)")
        print(f"{'='*50}")
        for comp in sorted(competitions):
            if comp in COMPETITION_KEYS:
                if download_competition_logo(comp, manifest):
                    stats['downloaded'] += 1
                else:
                    stats['failed'] += 1
            else:
                print(f"  [SKIP] No key mapping for: {comp}")

    # Download trophy images
    if do_all or args.trophies:
        print(f"\n{'='*50}")
        print(f"TROPHY IMAGES ({len(competitions)} competitions)")
        print(f"{'='*50}")
        for comp in sorted(competitions):
            if comp in COMPETITION_KEYS:
                if download_trophy_image(comp, manifest):
                    stats['downloaded'] += 1
                else:
                    stats['failed'] += 1

    # Download award images
    if do_all or args.awards:
        print(f"\n{'='*50}")
        print(f"AWARD IMAGES ({len(AWARD_SEARCH)} types)")
        print(f"{'='*50}")
        count = download_award_images(manifest)
        stats['downloaded'] += count

    # Download club badges
    if do_all or args.clubs:
        print(f"\n{'='*50}")
        print(f"CLUB BADGES ({len(teams)} teams)")
        print(f"{'='*50}")
        for team_id, team_name in sorted(teams.items()):
            if download_club_badge(team_id, team_name, manifest):
                stats['downloaded'] += 1
            else:
                stats['failed'] += 1

    # Verify mode
    if args.verify:
        print(f"\n{'='*50}")
        print("ASSET VERIFICATION")
        print(f"{'='*50}")
        for category, dir_path in DIRS.items():
            files = list(dir_path.glob('*')) if dir_path.exists() else []
            valid = [f for f in files if f.stat().st_size > 500]
            print(f"  {category}: {len(valid)} valid assets")
            for f in valid:
                size_kb = f.stat().st_size / 1024
                print(f"    {f.name} ({size_kb:.1f} KB)")

    # Save manifest
    save_manifest(manifest)

    print(f"\n{'='*50}")
    print(f"SUMMARY")
    print(f"{'='*50}")
    print(f"  Downloaded: {stats['downloaded']}")
    print(f"  Failed:     {stats['failed']}")
    print(f"  Manifest:   {MANIFEST_PATH}")


if __name__ == '__main__':
    main()
