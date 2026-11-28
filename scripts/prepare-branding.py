"""Generate platform assets from the supplied original; requires Pillow.
Only scales/composites artwork. Never redraws the logo or adds an inner icon border.
"""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
source = Image.open(ROOT / "resources/branding/star-goats-farm-original.png").convert("RGBA")
background = (17, 17, 20, 255)
def fitted(canvas_size, edge, bg=(0, 0, 0, 0)):
    art = source.copy()
    art.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", canvas_size, bg)
    canvas.alpha_composite(art, ((canvas_size[0]-art.width)//2, (canvas_size[1]-art.height)//2))
    return canvas
public = ROOT / "public/branding"
public.mkdir(parents=True, exist_ok=True)
art = source.copy(); art.thumbnail((640, 640), Image.Resampling.LANCZOS)
art.save(public / "star-goats-farm-logo.png", optimize=True)
res = ROOT / "android/app/src/main/res"
for density, scale in [("mdpi",1),("hdpi",1.5),("xhdpi",2),("xxhdpi",3),("xxxhdpi",4)]:
    folder = res / ("mipmap-"+density)
    size = round(48*scale)
    legacy = fitted((size,size), round(size*.88), background)
    legacy.save(folder / "ic_launcher.png", optimize=True)
    legacy.save(folder / "ic_launcher_round.png", optimize=True)
    full = round(108*scale)
    # Artwork stays within the adaptive icon safe zone, without a nested white tile.
    fitted((full,full), round(59*scale)).save(folder / "ic_launcher_foreground.png", optimize=True)
(res / "mipmap-anydpi-v26").mkdir(exist_ok=True)
xml = '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/farm_icon_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n'
for name in ["ic_launcher.xml","ic_launcher_round.xml"]:
    (res / "mipmap-anydpi-v26" / name).write_text(xml,encoding="utf-8")
(res / "values/farm_branding.xml").write_text('<resources><color name="farm_icon_background">#111114</color><color name="farm_splash_background">#111114</color></resources>\n',encoding="utf-8")
fitted((256,256),224).save(res / "drawable/farm_splash_logo.png", optimize=True)
fitted((192,192),168,background).save(res / "drawable/farm_notice_logo.png", optimize=True)
fitted((96,96),84,background).save(ROOT / "public/favicon.png", optimize=True)
for splash in res.glob("drawable*/splash.png"):
    old = Image.open(splash)
    fitted(old.size, min(round(old.width*.46),round(old.height*.32)), background).save(splash,optimize=True)
# Preview final adaptive mask at launcher size, including circular clipping.
preview = ROOT / "artifacts/ui-v32"
preview.mkdir(parents=True,exist_ok=True)
for shape in ["round","square"]:
    full = Image.new("RGBA",(432,432),background)
    fg = Image.open(res / "mipmap-xxxhdpi/ic_launcher_foreground.png")
    full.alpha_composite(fg)
    visible = full.crop((72,72,360,360))
    mask = Image.new("L",visible.size,0); draw=ImageDraw.Draw(mask)
    if shape=="round": draw.ellipse((0,0,287,287),fill=255)
    else: draw.rounded_rectangle((0,0,287,287),radius=60,fill=255)
    visible.putalpha(mask); visible.save(preview / ("launcher-"+shape+".png"))
print("Generated local branding, adaptive/legacy icons, notification logo and native splash assets")
