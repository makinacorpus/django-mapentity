$(document).ready(function () {
    var url_string = window.location.href;
    var url = new URL(url_string);
    var tab = url.searchParams.get("tab");
    if (tab !== null) {
        $('#tab-' + tab).click();
    }
});
