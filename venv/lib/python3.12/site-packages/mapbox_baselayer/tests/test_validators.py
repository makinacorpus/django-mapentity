from django.core.exceptions import ValidationError
from django.test import TestCase

from mapbox_baselayer.validators import (
    validate_only_required_tokens_in_tile_url,
    validate_required_token_in_tile_url,
)


class ValidateRequiredTokenInTileUrlTestCase(TestCase):
    def test_valid_url(self):
        validate_required_token_in_tile_url("https://example.com/{z}/{x}/{y}.png")

    def test_missing_y_raises(self):
        with self.assertRaises(ValidationError):
            validate_required_token_in_tile_url("https://example.com/{z}/{x}/tile.png")

    def test_missing_x_raises(self):
        with self.assertRaises(ValidationError):
            validate_required_token_in_tile_url("https://example.com/{z}/{y}/tile.png")

    def test_missing_z_raises(self):
        with self.assertRaises(ValidationError):
            validate_required_token_in_tile_url("https://example.com/{x}/{y}/tile.png")


class ValidateOnlyRequiredTokensInTileUrlTestCase(TestCase):
    def test_valid_url(self):
        validate_only_required_tokens_in_tile_url("https://example.com/{z}/{x}/{y}.png")

    def test_a_token_raises(self):
        with self.assertRaises(ValidationError) as ctx:
            validate_only_required_tokens_in_tile_url(
                "https://example.com/{a}/{z}/{x}/{y}.png"
            )
        self.assertIn("{a}", str(ctx.exception))

    def test_unsupported_token_raises(self):
        with self.assertRaises(ValidationError) as ctx:
            validate_only_required_tokens_in_tile_url(
                "https://example.com/{z}/{x}/{y}/{foo}.png"
            )
        self.assertIn("unsupported", str(ctx.exception).lower())

    def test_no_extra_tokens_passes(self):
        validate_only_required_tokens_in_tile_url(
            "https://tiles.example.com/{z}/{x}/{y}@2x.png"
        )
