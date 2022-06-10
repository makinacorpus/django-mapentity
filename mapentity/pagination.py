from rest_framework_datatables.pagination import DatatablesPageNumberPagination


class MapentityDatatablePagination(DatatablesPageNumberPagination):
    """ Custom datatable pagination for Mapentity list views. """
    pass
    # def get_count_and_total_count(self, queryset, view):
    #     """ Handle count for all filters """
    #     count, total_count = super().get_count_and_total_count(queryset, view)
    #     count = queryset.count()  # replace count by real count - not only drf-datatables count
    #     return count, total_count
