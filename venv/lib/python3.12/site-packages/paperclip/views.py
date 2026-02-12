import json

from django.apps import apps
from django.contrib import messages
from django.contrib.admin.models import CHANGE, LogEntry
from django.contrib.auth.decorators import permission_required
from django.contrib.contenttypes.models import ContentType
from django.http import (Http404, HttpResponse, HttpResponseRedirect,
                         JsonResponse)
from django.shortcuts import get_object_or_404
from django.template import RequestContext, Template
from django.utils.encoding import force_str
from django.utils.translation import gettext_lazy as _
from django.views.decorators.http import require_http_methods, require_POST

from paperclip import settings

from .forms import AttachmentForm


@require_POST
@permission_required(settings.get_attachment_permission('add_attachment'), raise_exception=True)
def add_attachment(request, app_label, model_name, pk,
                   attachment_form=AttachmentForm,
                   extra_context=None):
    model = apps.get_model(app_label, model_name)
    obj = get_object_or_404(model, pk=pk)
    form = attachment_form(request, request.POST, request.FILES, object=obj)
    return _handle_attachment_form(request, obj, form,
                                   _('Add attachment %s'),
                                   _('Your attachment was uploaded.'),
                                   extra_context)


@require_http_methods(["GET", "POST"])
@permission_required(settings.get_attachment_permission('change_attachment'), raise_exception=True)
def update_attachment(request, attachment_pk,
                      attachment_form=AttachmentForm,
                      extra_context=None):
    attachment = get_object_or_404(settings.get_attachment_model(), pk=attachment_pk)
    obj = attachment.content_object
    if request.method == 'POST':
        form = attachment_form(
            request, request.POST, request.FILES,
            instance=attachment,
            object=obj)
    else:
        form = attachment_form(
            request,
            instance=attachment,
            object=obj)
    return _handle_attachment_form(request, obj, form,
                                   _('Update attachment %s'),
                                   _('Your attachment was updated.'),
                                   extra_context)


def _handle_attachment_form(request, obj, form, change_msg, success_msg,
                            extra_context):
    if form.is_valid():
        attachment = form.save(request, obj)
        if settings.PAPERCLIP_ACTION_HISTORY_ENABLED:
            LogEntry.objects.log_action(
                user_id=request.user.pk,
                content_type_id=attachment.content_type.id,
                object_id=obj.pk,
                object_repr=force_str(obj),
                action_flag=CHANGE,
                change_message=change_msg % attachment.title,
            )
        messages.success(request, success_msg)
        return HttpResponseRedirect(form.success_url())

    if request.POST and form.redirect_on_error:
        all_errors = json.loads(form.errors.as_json())
        errors_message = ""
        for __, errors in all_errors.items():
            for error in errors:
                errors_message += f"{error['message']}\n"
        messages.error(request, errors_message)
        return HttpResponseRedirect(form.data.get('next'))

    template_string = """{% load attachments_tags %}
        {% attachment_form object attachment_form %}"""

    context = RequestContext(request)
    context['object'] = obj
    context['attachment_form'] = form

    if extra_context is not None:
        context.update(extra_context)

    t = Template(template_string)

    return HttpResponse(t.render(context))


@permission_required(settings.get_attachment_permission('delete_attachment'), raise_exception=True)
def delete_attachment(request, attachment_pk):
    g = get_object_or_404(settings.get_attachment_model(), pk=attachment_pk)
    can_delete = (request.user.has_perm(
        settings.get_attachment_permission('delete_attachment_others')) or request.user == g.creator)
    if can_delete:
        g.delete()
        if settings.PAPERCLIP_ACTION_HISTORY_ENABLED:
            LogEntry.objects.log_action(
                user_id=request.user.pk,
                content_type_id=g.content_type.id,
                object_id=g.object_id,
                object_repr=force_str(g.content_object),
                action_flag=CHANGE,
                change_message=_('Remove attachment %s') % g.title,
            )
        messages.success(request, _('Your attachment was deleted.'))
    else:
        error_msg = _('You are not allowed to delete this attachment.')
        messages.error(request, error_msg)
    next_url = request.GET.get('next', '/')
    return HttpResponseRedirect(next_url)


@permission_required(settings.get_attachment_permission('change_attachment'), raise_exception=True)
def star_attachment(request, attachment_pk):
    g = get_object_or_404(settings.get_attachment_model(), pk=attachment_pk)
    g.starred = request.GET.get('unstar') is None
    g.save()
    if g.starred:
        change_message = _('Star attachment %s')
    else:
        change_message = _('Unstar attachment %s')
    if settings.PAPERCLIP_ACTION_HISTORY_ENABLED:
        LogEntry.objects.log_action(
            user_id=request.user.pk,
            content_type_id=g.content_type.id,
            object_id=g.object_id,
            object_repr=force_str(g.content_object),
            action_flag=CHANGE,
            change_message=change_message % g.title,
        )
    reply = {
        'status': 'ok',
        'starred': g.starred
    }
    return JsonResponse(reply)


@permission_required(settings.get_attachment_permission('read_attachment'), raise_exception=True)
def get_attachments(request, app_label, model_name, pk):

    try:
        ct = ContentType.objects.get_by_natural_key(app_label, model_name)
    except ContentType.DoesNotExist:
        raise Http404
    attachments = settings.get_attachment_model().objects.filter(content_type=ct, object_id=pk)
    reply = [
        {
            'id': attachment.id,
            'title': attachment.title,
            'legend': attachment.legend,
            'url': attachment.attachment_file.url,
            'type': attachment.filetype.type,
            'author': attachment.author,
            'filename': attachment.filename,
            'mimetype': attachment.mimetype.split('/'),
            'is_image': attachment.is_image,
            'starred': attachment.starred,
        }
        for attachment in attachments
    ]
    return JsonResponse(reply, safe=False)
