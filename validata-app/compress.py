import PIL.Image
import sys

def compress():
    for name in ['opengraph-image', 'twitter-image']:
        try:
            img = PIL.Image.open(f"src/app/{name}.png")
            img = img.convert("RGB")
            img.thumbnail((800, 800))
            img.save(f"src/app/{name}.jpg", "JPEG", quality=85)
            print(f"Saved {name}.jpg")
        except Exception as e:
            print("Error", e)

compress()
