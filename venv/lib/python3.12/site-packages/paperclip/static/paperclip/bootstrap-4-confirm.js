(function ($) {
    $.fn.extend({
        //pass the options variable to the function
        confirmModal: function (options) {
            var html = '<div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">' +
                         '<div class="modal-dialog">' +
                           '<div class="modal-content">' +
                             '<div class="modal-header">' +
                               '<h5 class="modal-title">#Heading#</h5>' +
                               '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
                                 '<span aria-hidden="true">&times;</span>' +
                               '</button>' +
                             '</div>' +
                             '<div class="modal-body">' +
                               '#Body#' +
                             '</div>' +
                             '<div class="modal-footer">' +
                               '<button type="button" class="btn btn-default" data-dismiss="modal">#Close#</button>' +
                               '<button type="button" class="btn btn-primary" id="confirmYesBtn">#Confirm#</button>' +
                             '</div>' +
                           '</div>' +
                         '</div>' +
                       '</div>';

            var defaults = {
                heading: 'Please confirm',
                body:'Body contents',
                closeBtnText: 'Close',
                confirmBtnText: 'Confirm',
                callback : null
            };
            
            var options = $.extend(defaults, options);
            html = html.replace('#Heading#',options.heading).replace('#Body#',options.body);
            html = html.replace('#Close#',options.closeBtnText).replace('#Confirm#',options.confirmBtnText);
            $(this).html(html);
            $(this).find('.modal').modal('show');
            var context = $(this); 
            $('#confirmYesBtn',this).click(function(){
                if(options.callback!=null)
                    options.callback();
                $(context).modal('hide');
            });
        }

    });
})(jQuery);
