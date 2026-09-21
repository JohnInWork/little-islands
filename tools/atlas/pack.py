"""
Сборщик атласа спрайтов.

itch.io берёт не больше тысячи файлов в html-сборке, а игре нужно полторы: по
файлу на каждый спрайт. Атлас складывает их в несколько больших листов и
опись — и полторы тысячи запросов превращаются в три.

Запускается руками, когда меняется состав спрайтов:

    ~/.claude/kag-venv/bin/python tools/atlas/pack.py

Результат кладётся в `public/assets/atlas/` и коммитится: сборка не умеет
запускать Python, а тест `dcss-rpg-atlas.test.js` следит, чтобы опись не
разошлась со списком нужных спрайтов.
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys

from PIL import Image

КОРЕНЬ = pathlib.Path(__file__).resolve().parents[2]
СПРАЙТЫ = КОРЕНЬ / 'public' / 'assets' / 'dcss-preview'
ВЫХОД = КОРЕНЬ / 'public' / 'assets' / 'atlas'
# Лист крупнее этого некоторые мобильные браузеры отказываются держать текстурой.
СТОРОНА = 2048
ОТСТУП = 1


def нужные_пути() -> list[str]:
    """Список спрайтов берётся у самой игры, а не собирается здесь заново."""
    код = 'import("./tools/dcss-rpg-required-assets.js").then((m)=>console.log(JSON.stringify(m.requiredAssetPaths())))'
    вывод = subprocess.run(
        ['node', '-e', код], cwd=КОРЕНЬ, capture_output=True, text=True, check=True,
    ).stdout
    return sorted(set(json.loads(вывод)))


def упаковать() -> dict:
    пути = нужные_пути()
    картинки = []
    for путь in пути:
        файл = СПРАЙТЫ / путь
        if not файл.exists():
            raise SystemExit(f'нет спрайта: {путь}')
        картинки.append((путь, Image.open(файл).convert('RGBA')))
    # Сначала высокие: полосами укладывается плотнее, чем как попало.
    картинки.sort(key=lambda пара: (-пара[1].height, -пара[1].width, пара[0]))

    листы: list[Image.Image] = []
    кадры: dict[str, list] = {}
    лист = None
    x = y = высота_полосы = 0
    for путь, картинка in картинки:
        ш, в = картинка.size
        if ш > СТОРОНА or в > СТОРОНА:
            raise SystemExit(f'спрайт больше листа: {путь} ({ш}×{в})')
        if лист is None or x + ш > СТОРОНА:
            if лист is not None:
                y += высота_полосы + ОТСТУП
                x = высота_полосы = 0
            if лист is None or y + в > СТОРОНА:
                лист = Image.new('RGBA', (СТОРОНА, СТОРОНА), (0, 0, 0, 0))
                листы.append(лист)
                x = y = высота_полосы = 0
        лист.alpha_composite(картинка, (x, y))
        кадры[путь] = [len(листы) - 1, x, y, ш, в]
        x += ш + ОТСТУП
        высота_полосы = max(высота_полосы, в)

    ВЫХОД.mkdir(parents=True, exist_ok=True)
    for старый in ВЫХОД.glob('*'):
        старый.unlink()
    имена = []
    for номер, изображение in enumerate(листы):
        имя = f'atlas-{номер}.png'
        изображение.save(ВЫХОД / имя, optimize=True)
        имена.append(имя)
    опись = {'version': 1, 'side': СТОРОНА, 'sheets': имена, 'frames': кадры}
    (ВЫХОД / 'atlas.json').write_text(json.dumps(опись, separators=(',', ':')), encoding='utf-8')
    return опись


if __name__ == '__main__':
    опись = упаковать()
    вес = sum((ВЫХОД / имя).stat().st_size for имя in опись['sheets'])
    print(f'спрайтов: {len(опись["frames"])}', file=sys.stderr)
    print(f'листов: {len(опись["sheets"])} ({вес // 1024} КБ)', file=sys.stderr)
