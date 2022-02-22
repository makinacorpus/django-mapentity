from rest_framework_datatables.pagination import DatatablesPageNumberPagination


class MapentityDatatablePagination(DatatablesPageNumberPagination):
    """ Custom datatable pagination for Mapentity list views. """
    def get_count_and_total_count(self, queryset, view):
        """ Override count method because this handle only drf-datatables filtering format (limit to defined columns) """
        count, total_count = super().get_count_and_total_count(queryset, view)
        count = queryset.count()  # replace count by real count
        return count, total_count
