(function () {
    $('#div_id_attachment_file label').addClass('requiredField');
    $('#div_id_attachment_file label').append('<span class="asteriskField">*</span>');
    $('#div_id_attachment_video label').addClass('requiredField');
    $('#div_id_attachment_video label').append('<span class="asteriskField">*</span>');
    $('#div_id_attachment_link label').addClass('requiredField');
    $('#div_id_attachment_link label').append('<span class="asteriskField">*</span>');
    function init_mode() {
        if ($('#id_attachment_video').length && $('#id_attachment_video').val().length) {
            $('#id_attachment_video').prop('required', true);
            $('#div_id_attachment_file').hide();
            $('#div_id_attachment_link').hide();
            $('input[name="embed"][value="Youtube"]').prop("checked", true);
        } else if($('#id_attachment_link').length && $('#id_attachment_link').val().length) {
            $('#id_attachment_link').prop('required', true);
            $('#div_id_attachment_file').hide();
            $('#div_id_attachment_video').hide();
            $('input[name="embed"][value="Link"]').prop("checked", true);
        } else {
            $('.create #id_attachment_file').prop('required', true);
            $('#div_id_attachment_video').hide();
            $('#div_id_attachment_link').hide();
            $('input[name="embed"][value="File"]').prop("checked", true);
        }
    }
    init_mode();
    $('.file-attachment-form').on('click', 'input[name="embed"][value="File"]', function () {
        $('.create #id_attachment_file').prop('required', true);
        $('#id_attachment_video').removeAttr('required');
        $('#id_attachment_link').removeAttr('required');
        $('#div_id_attachment_file').show();
        $('#div_id_attachment_video').hide();
        $('#div_id_attachment_link').hide();
    });
    $('.file-attachment-form').on('click', 'input[name="embed"][value="Youtube"]', function () {
        $('.create #id_attachment_file').removeAttr('required');
        $('.create #id_attachment_link').removeAttr('required');
        $('#id_attachment_video').prop('required', true);
        $('#div_id_attachment_file').hide();
        $('#div_id_attachment_link').hide();
        $('#div_id_attachment_video').show();
    });
    $('.file-attachment-form').on('click', 'input[name="embed"][value="Link"]', function () {
        $('.create #id_attachment_file').removeAttr('required');
        $('.create #id_attachment_video').removeAttr('required');
        $('#id_attachment_link').prop('required', true);
        $('#div_id_attachment_file').hide();
        $('#div_id_attachment_video').hide();
        $('#div_id_attachment_link').show();
    });

    //
    // Update attachment
    //
    $('.update-action').click(function (e) {
        e.preventDefault();

        var $this = $(this);
        var updateUrl = $this.data('update-url');

        var $form = $('.file-attachment-form');
        var spinner = new Spinner({length: 3, radius: 5, width: 2}).spin($form[0]);
        $.get(updateUrl, function (html) {
            $form.find('.create').remove();
            $form.find('.update').html(html);
            init_mode();
            spinner.stop();
            // Update title on file change
            watchFileInput();
            // On cancel, restore Create form
            $('#button-id-cancel').click(function () {
                $form.find('.update').html('');
                $form.find('.create').show();
            });
        });

        return false;
    });


    //
    // Delete single attachment with confirm modal
    //
    $('.delete-action').click(function (e) {
        e.preventDefault();

        var $this = $(this);
        var deleteUrl = $this.data('delete-url');
        var $modal = $('.confirm-modal');
        var $attachment = $this.parents('tr');

        $modal.confirmModal({
            heading: $modal.data('confirm-delete-heading'),
            body: $modal.data('confirm-delete-msg').replace('{file}', $attachment.data('title')),
            closeBtnText: $modal.data('confirm-delete-close-button'),
            confirmBtnText: $modal.data('confirm-delete-confirm-button'),
            callback: function() {
                window.location = deleteUrl;
            }
        });

        return false;
    });


    //
    // Click to star/unstar attachments
    //
    $('a.star, a.unstar').click(function (e) {
        var $this = $(this);
        e.preventDefault();

        // Pass parameter to unstar (see views.py code)
        var starUrl = $this.data('star-url');
        if ($this.hasClass('unstar'))
            starUrl += '?unstar';

        // Show spinner on link while AJAX
        var spinner = new Spinner({length: 3, radius: 5, width: 2}).spin(this);
        $.getJSON(starUrl)
         .always(function () {
            spinner.stop();
         })
         .done(function (data) {
            // Replace the <img> icon after success
            var starIcon = $this.find('img').attr('src');
            starIcon = starIcon.replace(data.starred ? 'off' : 'on',
                                        data.starred ? 'on' : 'off');
            $this.find('img').attr('src', starIcon);
            $this.toggleClass('unstar star');
        });

        return false;
    });

    //
    // Attachment form
    //
    function watchFileInput () {
        var $form = $('form.attachment');
        var $file_input = $form.find('input[type="file"]');

        $file_input.on('change', function (e) {
            var chosenFiles = e.currentTarget.files;
            if (chosenFiles.length === 0)
                return;
            var filename = chosenFiles[0].name;
            // Remove extension from filename
            filename = filename.replace(/\.[^/.]+$/, "");
            $form.find('input[name="title"]').val(filename);
        });
    }

    watchFileInput();
})();
