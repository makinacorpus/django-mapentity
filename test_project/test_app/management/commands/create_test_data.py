"""
Management command to create test data for E2E testing using factories.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from test_project.test_app.tests.factories import (
    CityFactory,
    DummyModelFactory,
    GeoPointFactory,
    RoadFactory,
    SectorFactory,
    TagFactory,
)


class Command(BaseCommand):
    help = 'Create test data for E2E testing using factories'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cities',
            type=int,
            default=3,
            help='Number of cities to create',
        )
        parser.add_argument(
            '--roads',
            type=int,
            default=5,
            help='Number of roads to create',
        )
        parser.add_argument(
            '--dummies',
            type=int,
            default=10,
            help='Number of dummy models to create',
        )
        parser.add_argument(
            '--geopoints',
            type=int,
            default=5,
            help='Number of geo points to create',
        )
        parser.add_argument(
            '--sectors',
            type=int,
            default=3,
            help='Number of sectors to create',
        )
        parser.add_argument(
            '--tags',
            type=int,
            default=5,
            help='Number of tags to create',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing test data before creating new data',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing test data...')
            from test_project.test_app.models import (
                City,
                DummyModel,
                GeoPoint,
                Road,
                Sector,
                Tag,
            )
            GeoPoint.objects.all().delete()
            DummyModel.objects.all().delete()
            Road.objects.all().delete()
            City.objects.all().delete()
            Sector.objects.all().delete()
            Tag.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared existing test data'))

        self.stdout.write('Creating test data...')

        # Create tags first (they are referenced by other models)
        tags = []
        for i in range(options['tags']):
            tag = TagFactory()
            tags.append(tag)
        self.stdout.write(
            self.style.SUCCESS(f"Created {options['tags']} tags")
        )

        # Create cities
        cities = []
        for i in range(options['cities']):
            city = CityFactory()
            cities.append(city)
        self.stdout.write(
            self.style.SUCCESS(f"Created {options['cities']} cities")
        )

        # Create roads
        roads = []
        for i in range(options['roads']):
            road = RoadFactory()
            roads.append(road)
        self.stdout.write(
            self.style.SUCCESS(f"Created {options['roads']} roads")
        )

        # Create sectors
        sectors = []
        for i in range(options['sectors']):
            sector = SectorFactory()
            sectors.append(sector)
        self.stdout.write(
            self.style.SUCCESS(f"Created {options['sectors']} sectors")
        )

        # Create dummy models
        dummies = []
        for i in range(options['dummies']):
            dummy = DummyModelFactory()
            dummies.append(dummy)
        self.stdout.write(
            self.style.SUCCESS(f"Created {options['dummies']} dummy models")
        )

        # Create geo points
        geopoints = []
        for i in range(options['geopoints']):
            geopoint = GeoPointFactory()
            geopoints.append(geopoint)
        self.stdout.write(
            self.style.SUCCESS(f"Created {options['geopoints']} geo points")
        )

        self.stdout.write(
            self.style.SUCCESS('Successfully created all test data!')
        )
