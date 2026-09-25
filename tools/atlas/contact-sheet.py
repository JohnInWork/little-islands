"""
Лист кандидатов: спрайты библиотеки рядом, x4, на тайле пола, с путями.

Иван выбирает картинки сам; этот лист — то, из чего выбирать. Запуск из корня
репозитория интерпретатором с Pillow (`~/.claude/kag-venv/bin/python`):

    python tools/atlas/contact-sheet.py output/visual-choices/gold-piles.png \\
        --glob 'item/gold/*.png' licensed/7soul-icons/coin-gold.png \\
        --pick 'item/gold/03.png:small <=10' --pick 'item/gold/08.png:medium 11-21' \\
        --pick 'item/gold/16.png:large >=22'

Пути — относительно `public/assets/dcss-preview/`. `--pick путь:подпись`
обводит выбранные сейчас. Лист ложится в `output/` (он в .gitignore).
"""
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = 'public/assets/dcss-preview/'
out = sys.argv[1]
args = sys.argv[2:]
paths: list[str] = []
picks: dict[str, str] = {}
title = 'Candidates (path relative to public/assets/dcss-preview/), x4 on a floor tile'
i = 0
while i < len(args):
    if args[i] == '--glob':
        paths += sorted(os.path.relpath(p, ROOT) for p in glob.glob(ROOT + args[i + 1]))
        i += 2
    elif args[i] == '--pick':
        path, label = args[i + 1].rsplit(':', 1)
        picks[path] = label
        i += 2
    elif args[i] == '--title':
        title = args[i + 1]
        i += 2
    else:
        paths.append(args[i])
        i += 1

cell_w, cell_h, scale = 240, 180, 4
cols = 5
rows = (len(paths) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * cell_w, rows * cell_h + 30), (28, 26, 30, 255))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 12)
except Exception:
    font = ImageFont.load_default()
d.text((8, 8), title, fill=(230, 220, 200), font=font)
floor = None
floors = sorted(glob.glob(ROOT + 'dngn/floor/*.png'))
if floors:
    floor = Image.open(floors[0]).convert('RGBA').resize((32 * scale, 32 * scale), Image.NEAREST)
for n, p in enumerate(paths):
    im = Image.open(ROOT + p).convert('RGBA')
    big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    x = (n % cols) * cell_w
    y = (n // cols) * cell_h + 30
    if floor:
        sheet.alpha_composite(floor, (x + (cell_w - floor.width) // 2, y + 4))
    sheet.alpha_composite(big, (x + (cell_w - big.width) // 2, y + 4))
    d.text((x + 6, y + 4 + 32 * scale + 4), p, fill=(240, 220, 140), font=font)
    d.text((x + 6, y + 4 + 32 * scale + 20), f'{im.width}x{im.height} bbox {im.getbbox()}', fill=(170, 170, 170), font=font)
    if p in picks:
        d.rectangle((x + 2, y + 1, x + cell_w - 3, y + cell_h - 3), outline=(120, 220, 120), width=3)
        d.text((x + 8, y + 6), 'PICK: ' + picks[p], fill=(140, 240, 140), font=font)
sheet.save(out)
print(out, sheet.size, len(paths))
