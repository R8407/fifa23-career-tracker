#!/usr/bin/env python3
import json
from pathlib import Path

manifest = {'clubs': {}, 'competitions': {}, 'trophies': {}, 'awards': {}}
base = Path('public/assets')

names = {
    'serie-a': 'Serie A TIM',
    'copa-italia': 'Coppa Italia',
    'conference-league': 'UEFA Europa Conference League',
    'golden-boot': 'Golden Boot',
    'player-of-season': 'Player of the Season',
    'young-player': 'Young Player Award',
    'ballon-dor': 'Ballon d\'Or',
    'assist-king': 'Assist King',
    '113974': 'Spezia Calcio',
}

for cat in ['clubs', 'competitions', 'trophies', 'awards']:
    cat_dir = base / cat
    if not cat_dir.exists():
        continue
    for f in sorted(cat_dir.iterdir()):
        if f.suffix in ('.webp', '.png', '.jpg', '.svg') and f.stat().st_size > 500:
            key = f.stem
            manifest[cat][key] = {
                'name': names.get(key, key.replace('-', ' ').title()),
                'local_path': str(f.relative_to(Path('.'))),
                'status': 'downloaded',
                'size_kb': round(f.stat().st_size / 1024, 1),
            }

with open(base / 'manifest.json', 'w') as f:
    json.dump(manifest, f, indent=2)

total = sum(len(v) for v in manifest.values())
print(f'Asset manifest: {total} total assets\n')
for cat, items in manifest.items():
    if not items:
        continue
    print(f'{cat.upper()} ({len(items)}):')
    for k, v in items.items():
        print(f'  {v["name"]:35s} {v["local_path"]:45s} {v["size_kb"]:6.1f} KB')
    print()
