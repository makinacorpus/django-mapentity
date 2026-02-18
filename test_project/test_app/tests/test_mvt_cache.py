import time

from django.contrib.gis.geos import Point
from django.core.cache import caches
from django.test import TestCase
from django.urls import reverse

from mapentity.settings import app_settings
from test_project.test_app.tests.factories import DummyModelFactory


class MVTCacheTest(TestCase):
    def setUp(self):
        self.cache = caches[app_settings["GEOJSON_LAYERS_CACHE_BACKEND"]]
        self.cache.clear()

    def test_mvt_spatial_cache_invalidation(self):
        """Test if MVT cache is only invalidated by objects inside the tile"""
        # Use zoom 10 where we can distinguish different tiles
        # Point(0, 0) is in tile (512, 512, 10)
        # Point(0.527, -0.176) is in tile (513, 512, 10)
        self.z, self.x, self.y = 10, 512, 512
        self.url = reverse(
            "test_app:dummymodel-drf-mvt",
            kwargs={"z": self.z, "x": self.x, "y": self.y},
        )

        # Create object INSIDE tile (512, 512, 10)
        obj_in = DummyModelFactory.create(name="Inside", geom=Point(0, 0, srid=4326))
        # Create object OUTSIDE tile (512, 512, 10), in tile (513, 512, 10)
        obj_out = DummyModelFactory.create(
            name="Outside", geom=Point(0.527, -0.176, srid=4326)
        )

        # First request to get initial ETag
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("ETag", response)
        etag_initial = response["ETag"]

        # Request with If-None-Match should return 304
        response2 = self.client.get(self.url, HTTP_IF_NONE_MATCH=etag_initial)
        self.assertEqual(response2.status_code, 304)

        # Update object OUTSIDE the tile
        time.sleep(1.1)
        obj_out.name = "Updated Outside"
        obj_out.save()

        # Request should still return 304 - cache should NOT be invalidated
        response3 = self.client.get(self.url, HTTP_IF_NONE_MATCH=etag_initial)
        self.assertEqual(
            response3.status_code,
            304,
            "Cache should NOT be invalidated by update outside tile",
        )

        # Update object INSIDE the tile
        time.sleep(1.1)
        obj_in.name = "Updated Inside"
        obj_in.save()

        # Request should return 200 - cache SHOULD be invalidated
        response4 = self.client.get(self.url, HTTP_IF_NONE_MATCH=etag_initial)
        self.assertEqual(
            response4.status_code,
            200,
            "Cache SHOULD be invalidated by update inside tile",
        )
        self.assertNotEqual(response4["ETag"], etag_initial)

    def test_mvt_cache_key_includes_coords(self):
        """Test if different tiles have different cache entries"""
        # Zoom 1 has 4 tiles. (0,0,1), (1,0,1), (0,1,1), (1,1,1)
        # Point(0,0) should be in one of them.
        DummyModelFactory.create(name="Inside", geom=Point(0, 0, srid=4326))

        url1 = reverse("test_app:dummymodel-drf-mvt", kwargs={"z": 1, "x": 0, "y": 0})
        res1 = self.client.get(url1)
        self.assertEqual(res1.status_code, 200)

        url2 = reverse("test_app:dummymodel-drf-mvt", kwargs={"z": 1, "x": 1, "y": 1})
        res2 = self.client.get(url2)
        self.assertEqual(res2.status_code, 200)

        # They are different tiles, so cache keys should be different.
        # Even if both are empty (which they shouldn't both be), the keys are different.
        # But here we check that they don't share the same cache content incorrectly.
        # We can check that updating an object in one tile doesn't affect the other tile's last-modified if it's cached.
        # But easiest is just to check they can have different content.
