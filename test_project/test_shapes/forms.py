from mapentity.forms import MapEntityForm
from mapentity.widgets import MapWidget

from .models import AllowedTypesModel


class AllowedTypesModelForm(MapEntityForm):
    class Meta:
        model = AllowedTypesModel
        fields = ("name", "geom")
        widgets = {
            "geom": MapWidget(
                geom_type="GEOMETRY",
                allowed_types=["POINT", "LINESTRING"],
            )
        }
