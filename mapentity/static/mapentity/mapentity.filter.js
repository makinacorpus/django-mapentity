MapEntity.TogglableFilter = L.Class.extend({
    includes: L.Mixin.Events,
    options: {},

    initialize: function () {
        var self = this;

        this.$button = $('#filters-btn');

        this.fields = {};
        this.visible = false;
        this.loaded_form = false;
        this.popover = $('#filters-popover')
                          .popover({
                              placement: 'right',
                              html: true,
                              content: '',
                              title: 'Useless'
                          });
        this.hover = $('#filters-hover')
                          .popover({
                              placement: 'bottom',
                              html: true,
                              content: this.infos.bind(this),
                              title: tr("Current criteria")
                          });

        this.$button.mouseenter(this.showinfo.bind(this));
        this.$button.mouseleave(this.hideinfo.bind(this));

        $('#mainfilter').find('select,input').change(function (e) {
            self.setfield(this);
        });


        //
        // Filters open/close
        //

        // Close button
        var toggle_func = this.toggle.bind(this);
        $('#filters-close').click(toggle_func);


        this.$button.click(function (e) {
            e.stopPropagation();

            // Open/Close from button
            self.toggle();

            // Close when click outside
            if (self.visible) {
                $(document).on('click.outside', function close_panel(e) {
                    if (self.tip().has(e.target).length === 0 &&
                        self.$button.has(e.target).length === 0) {
                        self.toggle();
                    }
                });

                self.popover.on('hidden.bs.popover', function () {
                    $(document).off('click.outside');
                });
            }
        });
    },

    tip: function () {
        return $(this.popover.data('bs.popover').tip);
    },

    load_filter_form: function (mapsync) {
        var self = this;
        // On first click on Filter button, load HTML content for form
        var $mainfilter = $('#mainfilter');
        if (!self.loaded_form) {
            var filter_url = $mainfilter.attr('filter-url');
            $.get(filter_url)
                .done(response => {
                    $('#filters-panel .filter-spinner-container').hide();
                    // Replace simple form that contains only BBOX with full form, including attributes
                    $mainfilter.replaceWith(response);
                    $mainfilter = $('#mainfilter');
                    // Update L.MapListSync to refresh datatable on change
                    mapsync.options.filter.form = $mainfilter;
                    // Bind new form buttons to keep refreshing list on click
                    $("#filter").click(function(e) {
                        mapsync._onFormSubmit(e);
                    });
                    $("#reset").click(function(e) {
                        mapsync._onFormReset(e);
                    });
                    // Bind setfields to update list of enabled fields displayed on hover
                    $mainfilter.find('select,input').change(function () {
                        self.setfield(this);
                    });
                    self.loaded_form = true;

                    // Use chosen for multiple values
                    $mainfilter.bind("reset", function() {
                        setTimeout(function() {
                            $mainfilter.find('select[multiple]').trigger('chosen:updated');
                        }, 1);
                    });
                    // style select elements
                    $('select[multiple]').select2();

                    // Make sure filter-set class is added if a choice is selected.
                    $mainfilter.find('select[multiple]').select2({theme: "bootstrap4"}).on('change', function (e) {
                        var $target = $(e.target),
                            name = $target.attr('name'),
                            $container = $('div#id_' + name + '_chzn > ul');
                        var hasSelectedOption = $target.find('option:selected').length > 0;
                        $container.toggleClass('filter-set', hasSelectedOption);
                    });
                    // Move right-filters to right side
                    $mainfilter.find('.right-filter').parent('p').detach().appendTo('#mainfilter > .right');
                    // Trigger event allowing to launch further processing
                    var context = $('body').data();
                    $(window).trigger('entity:view:filter', {modelname: context.modelname});
                })
                .fail(xhr => console.error('Error:', xhr.status));
        }
    },

    showinfo: function () {
        // If popover is already visible, do not show hover
        if (this.visible)
            return;
        this.hover.popover('show');
    },

    hideinfo: function () {
        this.hover.popover('hide');
    },

    infos: function () {
        if (Object.keys(this.fields).length === 0)
            return "<p>" + tr("No filter") + "</p>";
        // We do not use handlebars just for this. If more to come, we will !
        var p = '<p><span class="filter-info">%name%</span>: %value%</p>';
        var i = '';
        for (var k in this.fields) {
            var f = this.fields[k];
            var value = f.value;
            value = value.replace(/&/g, '&amp;');
            value = value.replace(/</g, '&lt;');
            value = value.replace(/>/g, '&gt;');
            value = value.replace(/">"/g, '&quot;');
            value = value.replace(/'>'/g, '&#x27;');
            i += p.replace('%name%', f.label).replace('%value%', value);
        }
        return i;
    },

    toggle: function () {
        /* Show/Hide popover */
        if (this.visible) {
            // The whole $tip will be deleted, save the panel
            // and add it to the DOM so the dynamic filters still works.
            $('#filters-wrapper').append(
                this.tip().find('#filters-panel').detach()
            );
        }

        this.popover.popover('toggle');
        this.visible = !this.visible;

        if (this.visible) {
            this.hideinfo();
            this.tip()
              .empty()
              .append('<div class="arrow"/>')
              .append($('#filters-wrapper #filters-panel').detach());

            // Adjust popover width
            this.tip()
                .width(this.tip().find('#filters-panel form').outerWidth());
        }
    },

    setfield: function (field) {
        var label = $(field).data('label'),
            name = $(field).attr('name'),
            val = $(field).val(),
            set = val !== '' && val != [''];

        // Consider a value set if it is not the first option selected
        if ($(field).is('input[type=hidden]')) {
            set = false;
        }
        else if ($(field).is('select[multiple]')) {
            set = val !== null;
        }
        else if ($(field).is('select')) {
            set = val != $(field).find('option').first().val();
        }

        // Displayed value
        var value = val;
        if (field.tagName == 'SELECT') {
            value = $(field).find("option:selected").toArray().map(function (node) {
                return $(node).text()
            }).join(', ')
        }
        if (set) {
            this.fields[name] = {name: name, val:val, value:value, label:label};
        }
        else {
            delete this.fields[name];
        }

        if (set) {
            $(field).addClass('filter-set');
        }
        else {
            $(field).removeClass('filter-set');
        }
        return set;
    },

    setsubmit: function () {
        this.submitted = true;
        // Show fields as bold
        // Show button as active
        if (Object.keys(this.fields).length === 0) {
            $('#filters-btn').addClass('btn-info');
            $('#filters-btn').removeClass('btn-warning');
        }
        else {
            $('#filters-btn').removeClass('btn-info');
            $('#filters-btn').addClass('btn-warning');
        }
    }
});
