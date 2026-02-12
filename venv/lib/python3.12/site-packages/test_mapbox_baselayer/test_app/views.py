from django.views.generic import TemplateView


class MapExampleView(TemplateView):
    template_name = "test_app/map_example.html"
