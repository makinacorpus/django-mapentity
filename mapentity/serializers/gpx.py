import gpxpy.gpx
from django.conf import settings
from django.contrib.gis.geos import LineString, Point, Polygon
from django.contrib.gis.geos.collections import GeometryCollection
from django.core.serializers.base import Serializer
from django.utils.translation import gettext_lazy as _

from ..settings import app_settings
from ..templatetags.mapentity_tags import humanize_timesince


class GPXSerializer(Serializer):
    """
    GPX serializer class. Very rough implementation, but better than inline code.

    :note:

        TODO : this should definitely respect Serializer abstraction :
        LineString -> Route with Point
        Collection -> One route/waypoint per item

    """

    def __init__(self, *args, **kwargs):
        self.gpx = None

    def serialize(self, queryset, **options):
        self.gpx = gpxpy.gpx.GPX()
        self.options = options

        for obj in queryset:
            self.end_object(obj)

        stream = options.pop("stream")
        stream.write(self.gpx.to_xml())

    def end_object(self, obj):
        """Single object serialization."""
        objtype = obj.__class__._meta.verbose_name
        name = f"[{objtype}] {obj}"
        description = getattr(obj, "description", "")
        objupdate = obj.get_date_update()
        if objupdate:
            description += _("Modified") + ": " + humanize_timesince(objupdate)
        geom_field = self.options.pop("gpx_field", app_settings["GPX_FIELD_NAME"])
        geom = getattr(obj, geom_field, None)
        if not geom:
            geom = getattr(obj, app_settings["GEOM_FIELD_NAME"], None)
        if geom:
            # assert geom.srid == settings.SRID, f"Invalid SRID ({geom.srid}!= {settings.SRID})"
            self.geomToGPX(geom, name, description)

    def _point_to_GPX(self, point, klass=gpxpy.gpx.GPXWaypoint):
        if isinstance(point, (tuple, list)):
            point = Point(*point, srid=settings.SRID)
        newpoint = point.transform(4326, clone=True)  # transformation: gps uses 4326
        # transform looses the Z parameter
        return klass(latitude=newpoint.y, longitude=newpoint.x, elevation=point.z)

    def geomToGPX(self, geom, name, description):
        """Convert a geometry to a gpx entity.
        Raise ValueError if it is not a Point, LineString or a collection of those

        Point -> add as a Way Point
        LineString -> add all Points in a Route
        Polygon -> add all Points of the external linering in a Route
        Collection (of LineString or Point) -> add as a route, concatening all points
        """
        if isinstance(geom, GeometryCollection):
            for i, g in enumerate(geom):
                self.geomToGPX(g, f"{name} ({i})", description)
        elif isinstance(geom, Point):
            wp = self._point_to_GPX(geom)
            wp.name = name
            wp.description = description
            self.gpx.waypoints.append(wp)
        elif isinstance(geom, LineString):
            gpx_track = gpxpy.gpx.GPXTrack(name=name, description=description)
            gpx_segment = gpxpy.gpx.GPXTrackSegment()
            gpx_segment.points = [
                self._point_to_GPX(point, klass=gpxpy.gpx.GPXTrackPoint)
                for point in geom
            ]
            gpx_track.segments.append(gpx_segment)
            self.gpx.tracks.append(gpx_track)
        elif isinstance(geom, Polygon):
            self.geomToGPX(geom[0], name, description)
        else:
            msg = f"Unsupported geometry {geom}"
            raise ValueError(msg)
