"""Compression des photos à l'upload (règle n°6 : économe en données).

Une photo prise au téléphone pèse 3 à 6 Mo. Servie telle quelle, elle rend le
marché inutilisable sur une connexion lente. On la redimensionne et on la
réencode en WebP avant de l'enregistrer : on passe typiquement sous 150 Ko.

Remplace le pipeline `sharp` de la version Next.
"""

from io import BytesIO

from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image, ImageOps

# Un écran de téléphone n'a pas besoin de plus : on borne le plus grand côté.
LARGEUR_MAX = 1280
HAUTEUR_MAX = 1280
QUALITE_WEBP = 78


class PhotoInvalide(Exception):
    """Le fichier envoyé n'est pas une image exploitable."""


def compresser(fichier) -> InMemoryUploadedFile:
    """Redimensionne, corrige l'orientation EXIF et réencode en WebP.

    Renvoie un fichier prêt à être affecté à un ImageField.
    """
    try:
        image = Image.open(fichier)
        image.verify()  # détecte un fichier corrompu ou qui n'est pas une image
        fichier.seek(0)
        image = Image.open(fichier)
    except Exception as erreur:  # noqa: BLE001 — Pillow lève des types variés
        raise PhotoInvalide(
            "Ce fichier n'est pas une image valide (JPEG, PNG ou WebP attendu)."
        ) from erreur

    # Les photos de téléphone portent leur rotation dans l'EXIF : sans cette
    # ligne, une photo prise à la verticale s'affiche couchée.
    image = ImageOps.exif_transpose(image)

    # WebP n'accepte pas la palette ni le CMJN.
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")

    image.thumbnail((LARGEUR_MAX, HAUTEUR_MAX), Image.LANCZOS)

    tampon = BytesIO()
    image.save(tampon, format="WEBP", quality=QUALITE_WEBP, method=4)
    tampon.seek(0)

    return InMemoryUploadedFile(
        tampon,
        field_name="image",
        name="photo.webp",
        content_type="image/webp",
        size=tampon.getbuffer().nbytes,
        charset=None,
    )
