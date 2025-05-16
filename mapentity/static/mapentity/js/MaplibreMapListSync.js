class MaplibreMapListSync {
    constructor(datatables, map, objectsLayer, options) {
        this.dt = datatables;
        this.map = map;
        this.layer = objectsLayer;
        this.options = options || {};

        this.selectorOnce = this.__initSelectorOnce();

        // this.layer.on('mouseenter', this._onObjectOver.bind(this));

        // this._loading = false; // loading state

        // this.map.on('moveend', this._onMapViewChanged.bind(this));

    }

    // _onListFilter() {
    //     var filterTxt = $(".dataTables_filter input[type='text']").val();
    //     var results = this.dt.fnGetColumnData(0);
    //     this.fire('reloaded', {
    //         nbrecords: results.length,
    //     });
    //     this.layer.updateFromPks(results);
    // }

    // _onMapViewChanged() {
    //     if (!this.map.loaded()) {
    //         setTimeout(() => this.map.fire('moveend'), 20);
    //         return;
    //     }
    //     this._formSetBounds();
    //     this._reloadList();
    // }

    // _onFormSubmit(e) {
    //     this._formSetBounds();
    //     this._reloadList(true);
    // }
    //
    // _onFormReset(e) {
    //     this._formClear($(this.options.filter.form));
    //     this._reloadList();
    //     this._formSetBounds();
    // }

    // _onObjectOver(e) {
    //     var search_pk = e.layer.properties.pk;
    // }

    _onRowCreated(nRow, aData, iDataIndex) {
        // var self = this;
        var pk = aData[0];
        $(nRow).hover(
            function() {
                this.layer.highlight(pk);
            },
            function() {
                this.layer.highlight(pk, false);
            }
        );

        $(nRow).click(function() {
            this.selectorOnce.select(pk, $(nRow));
        });

        // $(nRow).dblclick(function() {
        //     self.layer.jumpTo(pk);
        // });
    }

    // _reloadList(refreshLayer) {
    //     var formData = new FormData(document.querySelector('#mainfilter'));
    //     var filter = false;
    //
    //     for (var value of Array.from(formData)) {
    //         if (value[0] !== 'bbox') {
    //             if (value[1] !== '') {
    //                 filter = true;
    //             }
    //         }
    //     }
    //
    //     if (filter) {
    //         $('#filters-btn').removeClass('btn-info');
    //         $('#filters-btn').addClass('btn-warning');
    //     } else {
    //         $('#filters-btn').removeClass('btn-warning');
    //         $('#filters-btn').addClass('btn-info');
    //     }
    //
    //     this.dt.ajax.url($('#mainfilter').attr('action') + '?' + $('#mainfilter').serialize()).load();
    //
    //     if (this._loading)
    //         return;
    //     this._loading = true;
    //
    //     var self = this;
    //
    //     var extract_data_and_pks = function(data, type, callback_args) {
    //         callback_args.map_obj_pk = data.map_obj_pk;
    //         return data.aaData;
    //     };
    //
    //     var on_data_loaded = function(oSettings, callback_args) {
    //         var nbrecords = self.dt.fnSettings().fnRecordsTotal();
    //         var nbonmap = Object.keys(self.layer.getCurrentLayers()).length;
    //
    //         if (refreshLayer || (nbrecords > nbonmap)) {
    //             var updateLayerObjects = function() {
    //                 self.layer.updateFromPks(callback_args.map_obj_pk);
    //                 self._onListFilter();
    //             };
    //
    //             if (self.layer.loading) {
    //                 self.layer.on('loaded', updateLayerObjects);
    //             } else {
    //                 setTimeout(updateLayerObjects, 0);
    //             }
    //         }
    //
    //         self.fire('reloaded', {
    //             nbrecords: nbrecords,
    //         });
    //
    //         self._loading = false;
    //     };
    //
    //     $.get($('#mainfilter').attr('action').replace('.datatables', '/filter_infos.json'),
    //         $('#mainfilter').serialize(),
    //         function(data) {
    //             $('#nbresults').text(data.count);
    //             this.layer.updateFromPks(data.pk_list);
    //             self._loading = false;
    //         }.bind(this));
    //
    //     var url = this.options.url;
    //     if (this.options.filter) {
    //         url = this.options.filter.form.attr("action") + '?' + this.options.filter.form.serialize();
    //     }
    //     return false;
    // }

    // _formSetBounds() {
    //     if (!this.options.filter)
    //         return;
    //
    //     if (!this.map.loaded()) {
    //         console.warn("Map view not set, cannot get bounds.");
    //         return;
    //     }
    //
    //     var bounds = this.map.getBounds();
    //     var min_lat = Math.max(bounds._sw.lat, -90);
    //     var max_lat = Math.min(bounds._ne.lat, 90);
    //     var min_lon = Math.max(bounds._sw.lng, -180);
    //     var max_lon = Math.min(bounds._ne.lng, 180);
    //
    //     // Assuming you have a method to convert bounds to WKT or another format for your filter
    //     var bboxString = `${min_lon},${min_lat},${max_lon},${max_lat}`;
    //     this.options.filter.bboxfield.val(bboxString);
    // }

    // _formClear($form) {
    //     $form.find('input:text, input:password, input:file, input[type=number], select, textarea').val('').trigger('change');
    //     $form.find('input:radio, input:checkbox, select option')
    //          .removeAttr('checked').removeAttr('selected');
    //     $form.find('select').val('').trigger("chosen:updated");
    // }

    __initSelectorOnce() {
        // var self = this;
        var selectorOnce = (function() {
            var current = { 'pk': null, 'row': null };

            function toggleSelectRow($prevRow, $nextRow) {
                function nextRowAnim() {
                    if ($nextRow) {
                        $nextRow.hide('fast')
                                .show('fast', function() { $nextRow.addClass('success'); });
                    }
                }

                if ($prevRow) {
                    $prevRow.hide('fast', function() { $prevRow.removeClass('success'); })
                            .show('fast', nextRowAnim);
                } else {
                    nextRowAnim();
                }
            }

            function toggleSelectObject(pk, on) {
                on = on === undefined ? true : on;
                this.layer.select(pk, on);
            }

            return {
                'select': function(pk, row) {
                    if (pk == current.pk) {
                        pk = null, row = null;
                    }

                    var prev = current;
                    current = {'pk': pk, 'row': row};

                    toggleSelectRow(prev.row, row);

                    if (prev.pk && prev.row) {
                        toggleSelectObject(prev.pk, false);
                    }
                    if (row && pk) {
                        toggleSelectObject(pk, true);
                    }
                }
            };
        })();
        return selectorOnce;
    }

    fire(event, data) {
        console.log(`Event fired: ${event}`, data);
    }
}
