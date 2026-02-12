import magic


def mimetype(attachment_file):
    if not attachment_file:
        return None
    attachment_file.file.seek(0)
    mt = magic.from_buffer(attachment_file.file.read(), mime=True)
    return mt


def is_an_image(mimetype):
    return False if not mimetype else mimetype.split('/')[0].startswith('image')
