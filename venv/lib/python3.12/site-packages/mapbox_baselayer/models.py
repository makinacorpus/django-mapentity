from django.db import models
from django.db.models import TextChoices
from django.urls import reverse
from django.utils.functional import cached_property
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from mapbox_baselayer.validators import (
    validate_only_required_tokens_in_tile_url,
    validate_required_token_in_tile_url,
)


class MapBaseLayer(models.Model):
    class LayerType(TextChoices):
        STYLE_URL = "mapbox", _("Style URL")
        RASTER = "raster", _("Raster tiles")
        VECTOR = "vector", _("Vector tiles")

    name = models.CharField(max_length=50, unique=True, verbose_name=_("Name"))
    is_overlay = models.BooleanField(
        default=False,
        verbose_name=_("Is overlay"),
        db_index=True,
        help_text=_(
            "Whether this layer is an overlay (displayed on top of base layers) or a base layer."
        ),
    )
    order = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Order"),
        help_text=_(
            "Order of the layer in the list. Lower numbers are displayed first."
        ),
        db_index=True,
    )
    slug = models.SlugField(unique=True, editable=False)
    base_layer_type = models.CharField(
        max_length=25,
        choices=LayerType.choices,
        db_index=True,
        blank=False,
        verbose_name=_("Layer type"),
    )
    map_box_url = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Should start by http(s):// or mapbox://"),
        verbose_name=_("Style URL"),
    )
    sprite = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Override default sprite URL."),
        verbose_name=_("Sprite URL"),
    )
    glyphs = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Override default glyphs URL."),
        verbose_name=_("Glyphs URL"),
    )
    min_zoom = models.PositiveSmallIntegerField(
        default=0,
        verbose_name=_("Minimum zoom level"),
        help_text=_("Minimum zoom level for the layer."),
    )
    max_zoom = models.PositiveSmallIntegerField(
        default=22,
        verbose_name=_("Maximum zoom level"),
        help_text=_("Maximum zoom level for the layer."),
    )
    tile_size = models.PositiveSmallIntegerField(
        default=512,
        verbose_name=_("Tile size"),
        help_text=_("Tile size. Often 256 for raster tiles, 512 for vector tiles."),
    )
    attribution = models.CharField(
        max_length=1024,
        blank=True,
        default="",
        help_text=_("Attribution text for the layer."),
        verbose_name=_("Attribution"),
    )
    enabled = models.BooleanField(
        default=True,
        verbose_name=_("Enabled"),
        db_index=True,
        help_text=_(
            "Whether this layer is enabled and should be displayed on the map."
        ),
    )

    class Meta:
        verbose_name = _("Layer")
        verbose_name_plural = _("All layers")
        ordering = ("is_overlay", "order", "name")

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        import uuid

        base_slug = slugify(self.name)
        if not self.pk:
            # temporary unique slug to satisfy unique constraint on first insert
            self.slug = f"{base_slug[:41]}-{uuid.uuid4().hex[:8]}"
            super().save(*args, **kwargs)
        # always include pk for uniqueness
        self.slug = f"{base_slug}-{self.pk}"
        super().save(update_fields=["slug"])

    def get_source(self):
        source = {
            "type": f"{self.base_layer_type}",
            "tiles": list(self.tiles.values_list("url", flat=True)),
            "minzoom": self.min_zoom,
            "maxzoom": self.max_zoom,
            "attribution": self.attribution,
        }

        if self.base_layer_type == self.LayerType.RASTER:
            # only available for raster layers
            source["tileSize"] = self.tile_size

        return source

    @cached_property
    def tilejson(self):
        data = {
            "version": 8,
            "sources": {
                f"{self.slug}": self.get_source(),
            },
            "layers": [
                {
                    "id": f"{self.slug}-background",
                    "type": f"{self.base_layer_type}",
                    "source": f"{self.slug}",
                }
            ],
        }
        # prevents mapbox problems by set glyphs and sprite only if specified
        if self.sprite:
            data["sprite"] = self.sprite

        data["glyphs"] = self.glyphs or "mapbox://fonts/mapbox/{fontstack}/{range}.pbf"

        return data

    @cached_property
    def url(self):
        if self.base_layer_type != self.LayerType.STYLE_URL:
            return reverse("mapbox_baselayer:tilejson", args=(self.pk,))
        else:
            return self.map_box_url

    @cached_property
    def real_url(self):
        if self.base_layer_type not in (
            self.LayerType.STYLE_URL,
            self.LayerType.VECTOR,
        ):
            return self.url
        else:
            return self.map_box_url.replace(
                "mapbox://styles", "https://api.mapbox.com/styles/v1"
            )


class BaseLayerManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_overlay=False)


class OverlayLayerManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_overlay=True)


class BaseLayer(MapBaseLayer):
    """Proxy model for base layers (is_overlay=False)"""

    objects = BaseLayerManager()

    class Meta:
        proxy = True
        verbose_name = _("Base layer")
        verbose_name_plural = _("Base layers")

    def save(self, *args, **kwargs):
        self.is_overlay = False
        super().save(*args, **kwargs)


class OverlayLayer(MapBaseLayer):
    """Proxy model for overlay layers (is_overlay=True)"""

    objects = OverlayLayerManager()

    class Meta:
        proxy = True
        verbose_name = _("Overlay layer")
        verbose_name_plural = _("Overlay layers")

    def save(self, *args, **kwargs):
        self.is_overlay = True
        super().save(*args, **kwargs)


class BaseLayerRasterManager(models.Manager):
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(is_overlay=False, base_layer_type=MapBaseLayer.LayerType.RASTER)
        )


class BaseLayerStyleManager(models.Manager):
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(is_overlay=False, base_layer_type=MapBaseLayer.LayerType.STYLE_URL)
        )


class OverlayRasterManager(models.Manager):
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(is_overlay=True, base_layer_type=MapBaseLayer.LayerType.RASTER)
        )


class OverlayStyleManager(models.Manager):
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(is_overlay=True, base_layer_type=MapBaseLayer.LayerType.STYLE_URL)
        )


class BaseLayerRaster(MapBaseLayer):
    objects = BaseLayerRasterManager()

    class Meta:
        proxy = True
        verbose_name = _("Base layer (Raster)")
        verbose_name_plural = _("Base layers (Raster)")

    def save(self, *args, **kwargs):
        self.is_overlay = False
        self.base_layer_type = MapBaseLayer.LayerType.RASTER
        super().save(*args, **kwargs)


class BaseLayerStyle(MapBaseLayer):
    objects = BaseLayerStyleManager()

    class Meta:
        proxy = True
        verbose_name = _("Base layer (Style URL)")
        verbose_name_plural = _("Base layers (Style URL)")

    def save(self, *args, **kwargs):
        self.is_overlay = False
        self.base_layer_type = MapBaseLayer.LayerType.STYLE_URL
        super().save(*args, **kwargs)


class OverlayRaster(MapBaseLayer):
    objects = OverlayRasterManager()

    class Meta:
        proxy = True
        verbose_name = _("Overlay (Raster)")
        verbose_name_plural = _("Overlays (Raster)")

    def save(self, *args, **kwargs):
        self.is_overlay = True
        self.base_layer_type = MapBaseLayer.LayerType.RASTER
        super().save(*args, **kwargs)


class OverlayStyle(MapBaseLayer):
    objects = OverlayStyleManager()

    class Meta:
        proxy = True
        verbose_name = _("Overlay (Style URL)")
        verbose_name_plural = _("Overlays (Style URL)")

    def save(self, *args, **kwargs):
        self.is_overlay = True
        self.base_layer_type = MapBaseLayer.LayerType.STYLE_URL
        super().save(*args, **kwargs)


class BaseLayerTile(models.Model):
    base_layer = models.ForeignKey(
        MapBaseLayer, related_name="tiles", on_delete=models.CASCADE
    )
    url = models.CharField(
        max_length=2048,
        validators=[
            validate_required_token_in_tile_url,
            validate_only_required_tokens_in_tile_url,
        ],
    )

    def __str__(self):
        return f"{self.base_layer.name} - {self.url}"
