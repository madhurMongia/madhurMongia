# Turns a photo + person mask into ASCII art (portrait-dark.txt, portrait-light.txt).
# Usage: python ascii.py photo.png mask.png out_prefix cols x0 y0 x1 y1 [ramp]
# Made with: swift segment.swift avatar.png mask.png && python ascii.py avatar.png mask.png portrait 72 140 38 340 290
import sys
from PIL import Image, ImageOps, ImageFilter
photo, mask, out = sys.argv[1:4]
cols = int(sys.argv[4]); box = tuple(int(v) for v in sys.argv[5:9])
CELL_ASPECT = 0.5  # glyph width / line height
img = Image.open(photo).convert('L').crop(box)
m = Image.open(mask).convert('L').crop(box)
w, h = img.size
rows = round(h / (w / cols) * CELL_ASPECT)
# Equalize tones inside the person only; the background becomes blank space.
img = ImageOps.equalize(img, mask=m.point(lambda v: 255 if v > 128 else 0))
img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=2))
small = img.resize((cols, rows), Image.LANCZOS)
ms = m.resize((cols, rows), Image.LANCZOS)
RAMP = sys.argv[9] if len(sys.argv) > 9 else " .:-=+*#%@"
# Light mode inverts the ramp; a gamma curve first keeps bright skin in the mid-tones.
for theme, invert, gamma in (('dark', False, 1.0), ('light', True, 2.2)):
    lines = []
    for y in range(rows):
        row = ''
        for x in range(cols):
            if ms.getpixel((x, y)) < 110:
                row += ' '; continue
            v = (small.getpixel((x, y)) / 255) ** gamma
            if invert: v = 1 - v
            row += RAMP[min(len(RAMP) - 1, 1 + int(v * (len(RAMP) - 1)))]
        lines.append(row.rstrip())
    open(f'{out}-{theme}.txt', 'w').write('\n'.join(lines) + '\n')
print(cols, rows)
