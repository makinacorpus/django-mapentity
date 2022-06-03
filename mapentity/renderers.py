from rest_framework.renderers import JSONRenderer


class GeoJSONRenderer(JSONRenderer):
    format = 'geojson'
    media_type = 'application/geo+json'
