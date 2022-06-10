from rest_framework_datatables.pagination import DatatablesPageNumberPagination


class MapentityDatatablePagination(DatatablesPageNumberPagination):
    """ Custom datatable pagination for Mapentity list views. """

    def get_count_and_total_count(self, queryset, view):
        """ Handle count for all filters """
        count = queryset.count()  # replace count by real count - not only drf-datatables count
        if hasattr(view, '_datatables_total_count'):
            total_count = view._datatables_total_count
            del view._datatables_total_count
        else:  # pragma: no cover
            total_count = count
        return count, total_count
