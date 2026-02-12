'''Recognize image file formats based on their first few bytes'''

# This code was removed from the standard Python library in Python 3.13. It was
# then copied here. Several test* functions not used by Appy were removed.

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
from os import PathLike

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
def what(file, h=None):
    '''Return the type of image contained in a file or byte stream'''
    f = None
    try:
        if h is None:
            if isinstance(file, (str, PathLike)):
                f = open(file, 'rb')
                h = f.read(32)
            else:
                location = file.tell()
                h = file.read(32)
                file.seek(location)
        for tf in tests:
            res = tf(h, f)
            if res:
                return res
    finally:
        if f: f.close()
    return None

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
#                    Subroutines per image file type
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

tests = []

def test_jpeg(h, f):
    '''Test for JPEG data with JFIF or Exif markers; and raw JPEG'''
    if h[6:10] in (b'JFIF', b'Exif'):
        return 'jpeg'
    elif h[:4] == b'\xff\xd8\xff\xdb':
        return 'jpeg'

tests.append(test_jpeg)

def test_png(h, f):
    '''Verify if the image is a PNG'''
    if h.startswith(b'\211PNG\r\n\032\n'):
        return 'png'

tests.append(test_png)

def test_gif(h, f):
    '''Verify if the image is a GIF ('87 or '89 variants)'''
    if h[:6] in (b'GIF87a', b'GIF89a'):
        return 'gif'

tests.append(test_gif)

def test_tiff(h, f):
    '''Verify if the image is a TIFF (can be in Motorola or Intel byte
       order).'''
    if h[:2] in (b'MM', b'II'):
        return 'tiff'

tests.append(test_tiff)

def test_webp(h, f):
    '''Verify if the image is a WebP'''
    if h.startswith(b'RIFF') and h[8:12] == b'WEBP':
        return 'webp'

tests.append(test_webp)
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
