import mimetypes

from django.template import Library, Node, Variable
from django.utils.translation import gettext_lazy as _

from paperclip.forms import AttachmentForm
from paperclip import settings

register = Library()


@register.filter
def read_attachment(perms):
    perm = settings.get_attachment_permission('read_attachment')
    return perm in perms


@register.filter
def add_attachment(perms):
    perm = settings.get_attachment_permission('add_attachment')
    return perm in perms


@register.filter
def delete_attachment(perms):
    perm = settings.get_attachment_permission('delete_attachment')
    return perm in perms


@register.filter
def change_attachment(perms):
    perm = settings.get_attachment_permission('change_attachment')
    return perm in perms


@register.filter
def delete_attachment_others(perms):
    perm = settings.get_attachment_permission('delete_attachment_others')
    return perm in perms


@register.filter
def icon_name(value):
    mimetype = value.mimetype
    if not mimetype or mimetype == ('application', 'octet-stream'):
        return 'bin'
    ext = mimetypes.guess_extension(mimetype)
    return ext[1:] if ext else 'bin'


@register.inclusion_tag('paperclip/_attachment_form.html', takes_context=True)
def attachment_form(context, obj, form=None):
    """
    Renders a "upload attachment" form. `obj` argument is required and
    represents the instance to which you want to associate the file.
    A bound form can be given optionnaly with the argument ``form``.
    Important : a ``attachment_form_next`` variable is expected in context.
    If you want to use a custom form class, you can add
    ``attachment_form_class`` variable in context too
    """
    # Unbound form by default (this is why a template tag is used!)
    if form is None:
        request = context['request']
        next_url = context['attachment_form_next']
        form_class = context.get('attachment_form_class', AttachmentForm)
        form = form_class(request, object=obj, next_url=next_url)

    form_title = _("New file attachment")
    if form.instance.pk:
        form_title = "%s %s" % (_("Update"), form.instance.filename)

    return {
        'attachment_form': form,
        'form_title': form_title,
    }


class AttachmentsForObjectNode(Node):
    def __init__(self, obj, var_name, file_type):
        self.obj = obj
        self.var_name = var_name
        self.file_type = file_type

    def resolve(self, var, context):
        """Resolves a variable out of context if it's not in quotes"""
        if var[0] in ('"', "'") and var[-1] == var[0]:
            return var[1:-1]
        else:
            return Variable(var).resolve(context)

    def render(self, context):
        obj = self.resolve(self.obj, context)
        var_name = self.resolve(self.var_name, context)
        if self.file_type:
            file_type = self.resolve(self.file_type, context)
        else:
            file_type = None

        if file_type:
            method = 'attachments_for_object_only_type'
            args = [obj, file_type]
        else:
            method = 'attachments_for_object'
            args = [obj]

        context[var_name] = getattr(settings.get_attachment_model().objects, method)(*args)
        return ''


@register.tag
def get_attachments_for(parser, token):
    """
    Resolves attachments that are attached to a given object. You can specify
    the variable name in the context the attachments are stored using the `as`
    argument. Default context variable name is `attachments`. You can filter
    on a specified FileType with the optional `only_type` argument.

    Syntax::

        {% get_attachments_for obj %}
        {% for att in attachments %}
            {{ att }}
        {% endfor %}

        {% get_attachments_for obj as "my_attachments" %}

    """
    def next_bit_for(bits, key, if_none=None):
        try:
            return bits[bits.index(key) + 1]
        except ValueError:
            return if_none

    bits = token.contents.split()
    args = {
        'obj': next_bit_for(bits, 'get_attachments_for'),
        'var_name': next_bit_for(bits, 'as', '"attachments"'),
        'file_type': next_bit_for(bits, 'only_type'),
    }
    return AttachmentsForObjectNode(**args)
