from django.template.response import TemplateResponse


class OdtTemplateResponse(TemplateResponse):
    def __init__(self, *args, **kwargs):
        kwargs['content_type'] = 'application/vnd.oasis.opendocument.text'
        super(OdtTemplateResponse, self).__init__(*args, **kwargs)
