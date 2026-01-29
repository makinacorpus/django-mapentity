"""
Management command to create test data for E2E tests using factories.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from test_project.test_app.tests.factories import (
    CityFactory,
    DummyModelFactory,
    GeoPointFactory,
    RoadFactory,
    SectorFactory,
    TagFactory,
)
from mapentity.tests.factories import SuperUserFactory, UserFactory

User = get_user_model()


class Command(BaseCommand):
    help = "Create test data for E2E tests using factories"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Delete existing test data before creating new ones",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=10,
            help="Number of objects to create for each model (default: 10)",
        )

    def handle(self, *args, **options):
        clean = options["clean"]
        count = options["count"]

        if clean:
            self.stdout.write(self.style.WARNING("Cleaning existing test data..."))
            # Clean up test data (be careful not to delete production data)
            from test_project.test_app.models import (
                City,
                DummyModel,
                GeoPoint,
                Road,
                Sector,
                Tag,
            )

            # Delete in order to respect foreign key constraints
            GeoPoint.objects.all().delete()
            DummyModel.objects.all().delete()
            City.objects.all().delete()
            Road.objects.all().delete()
            Sector.objects.all().delete()
            Tag.objects.all().delete()
            # Delete E2E test users
            User.objects.filter(username__startswith="e2e_").delete()

            self.stdout.write(self.style.SUCCESS("Test data cleaned"))

        # Create test users
        self.stdout.write("Creating test users...")
        
        # Create a test superuser for E2E tests
        # Note: The UserFactory._create method handles password hashing automatically
        # using Django's set_password() method
        if not User.objects.filter(username="e2e_admin").exists():
            admin_user = SuperUserFactory.create(
                username="e2e_admin",
                password="admin123",
                email="e2e_admin@test.com"
            )
            self.stdout.write(
                self.style.SUCCESS(f"  Created superuser: {admin_user.username}")
            )
        
        # Create a regular test user
        if not User.objects.filter(username="e2e_user").exists():
            regular_user = UserFactory.create(
                username="e2e_user",
                password="user123",
                email="e2e_user@test.com"
            )
            self.stdout.write(
                self.style.SUCCESS(f"  Created user: {regular_user.username}")
            )

        # Create Tags
        self.stdout.write(f"Creating {count} tags...")
        tags = [TagFactory.create() for _ in range(count)]
        self.stdout.write(self.style.SUCCESS(f"  Created {len(tags)} tags"))

        # Create Cities
        self.stdout.write(f"Creating {count} cities...")
        cities = [CityFactory.create() for _ in range(count)]
        self.stdout.write(self.style.SUCCESS(f"  Created {len(cities)} cities"))

        # Create Roads
        self.stdout.write(f"Creating {count} roads...")
        roads = [RoadFactory.create() for _ in range(count)]
        self.stdout.write(self.style.SUCCESS(f"  Created {len(roads)} roads"))

        # Create Sectors
        self.stdout.write(f"Creating {count} sectors...")
        sectors = [SectorFactory.create() for _ in range(count)]
        self.stdout.write(self.style.SUCCESS(f"  Created {len(sectors)} sectors"))

        # Create DummyModels
        self.stdout.write(f"Creating {count} dummy models...")
        dummy_models = [DummyModelFactory.create() for _ in range(count)]
        self.stdout.write(
            self.style.SUCCESS(f"  Created {len(dummy_models)} dummy models")
        )

        # Create GeoPoints (with relationships)
        self.stdout.write(f"Creating {count} geo points...")
        geo_points = [GeoPointFactory.create() for _ in range(count)]
        self.stdout.write(self.style.SUCCESS(f"  Created {len(geo_points)} geo points"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSuccessfully created test data!\n"
                f"  - Users: e2e_admin (admin123), e2e_user (user123)\n"
                f"  - {len(tags)} tags\n"
                f"  - {len(cities)} cities\n"
                f"  - {len(roads)} roads\n"
                f"  - {len(sectors)} sectors\n"
                f"  - {len(dummy_models)} dummy models\n"
                f"  - {len(geo_points)} geo points"
            )
        )
