import copy

from warnings import warn

from crispy_forms.bootstrap import FormActions
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, Button, HTML, Submit
from django import forms
from django.conf import settings
from django.contrib.gis.db.models.fields import GeometryField
from django.core.exceptions import FieldDoesNotExist
from django.utils.translation import gettext_lazy as _
from modeltranslation.utils import build_localized_fieldname
from paperclip.forms import AttachmentForm as BaseAttachmentForm
from tinymce.widgets import TinyMCE

from .models import ENTITY_PERMISSION_UPDATE_GEOM
from .widgets import MapWidget

if 'modeltranslation' in settings.INSTALLED_APPS:
    from modeltranslation.translator import translator, NotRegistered


class TranslatedModelForm(forms.ModelForm):
    """
    Auto-expand translatable fields.
    Expand means replace native (e.g. `name`) by translated (e.g. `name_fr`, `name_en`)
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Track translated fields
        self.orig_fields = list(self.fields.keys())
        self._translated = {}

        if 'modeltranslation' in settings.INSTALLED_APPS:
            self.replace_orig_fields()
            self.populate_fields()

    def replace_orig_fields(self):
        # Expand i18n fields
        try:
            # Obtain model translation options
            mto = translator.get_options_for_model(self._meta.model)
        except NotRegistered:
            # No translation field on this model, nothing to do
            return
        # For each translated model field
        for modelfield in mto.fields:
            if modelfield not in self.fields:
                continue
            # Remove form native field (e.g. `name`)
            native = self.fields.pop(modelfield)
            # Add translated fields (e.g. `name_fr`, `name_en`...)
            for lang in settings.MODELTRANSLATION_LANGUAGES:
                name = build_localized_fieldname(modelfield, lang)
                # Add to form.fields{}
                translated = copy.deepcopy(native)
                translated.required = native.required and (
                            lang == settings.MODELTRANSLATION_DEFAULT_LANGUAGE.replace('-', '_'))
                translated.label = "{0} [{1}]".format(translated.label, lang)
                self.fields[name] = translated
                # Keep track of replacements
                self._translated.setdefault(modelfield, []).append(name)

    def save(self, *args, **kwargs):
        """ Manually saves translated fields on instance.
        """
        # Save translated fields
        for fields in self._translated.values():
            for field in fields:
                value = self.cleaned_data.get(field)
                setattr(self.instance, field, value)
        return super().save(*args, **kwargs)

    def populate_fields(self):
        """ Manually loads translated fields from instance.
        """
        if self.instance:
            for fields in self._translated.values():
                for field in fields:
                    self.fields[field].initial = getattr(self.instance, field.replace("-", "_"))


class SubmitButton(HTML):

    def __init__(self, div_id, label):
        content = ("""
            <a id="{0}" class="btn btn-success"
               onclick="javascript:$(this).parents('form').submit();">
                <i class="bi bi-check-circle-fill"></i> {1}
            </a>""".format(div_id, label))
        super().__init__(content)


class MapEntityForm(TranslatedModelForm):
    fieldslayout = None
    geomfields = None
    leftpanel_scrollable = True
    hidden_fields = []

    def __init__(self, *args, **kwargs):
        if self.geomfields is None:
            self.geomfields = ['geom']
        self.user = kwargs.pop('user', None)
        self.can_delete = kwargs.pop('can_delete', True)

        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_tag = True

        # If MAX_CHARACTERS is setted, set help text for rich text fields
        global_help_text = ''
        max_characters = settings.MAPENTITY_CONFIG.get('MAX_CHARACTERS', None)
        if max_characters:
            warn(
                "Parameters MAX_CHARACTERS is deprecated, please use MAX_CHARACTERS_BY_FIELD instead",
                DeprecationWarning,
                stacklevel=2
            )
            global_help_text = _('%(max)s characters maximum recommended') % {'max': max_characters}

        max_characters_by_field_config = settings.MAPENTITY_CONFIG.get('MAX_CHARACTERS_BY_FIELD', {}) or {}
        # Default widgets
        for fieldname, formfield in self.fields.items():
            textfield_help_text = ''
            # Custom code because formfield_callback does not work with inherited forms
            if formfield:
                # set max character limit :
                if self._meta.model._meta.db_table in max_characters_by_field_config:
                    for conf in max_characters_by_field_config[self._meta.model._meta.db_table]:
                        if fieldname == conf["field"]:
                            textfield_help_text = _('%(max)s characters maximum recommended') % {'max': conf["value"]}

                # Assign map widget to all geometry fields
                try:
                    formmodel = self._meta.model
                    modelfield = formmodel._meta.get_field(fieldname)
                    needs_replace_widget = (isinstance(modelfield, GeometryField)
                                            and not isinstance(formfield.widget, MapWidget))
                    if needs_replace_widget:
                        formfield.widget = MapWidget()
                        if self.instance.pk and self.user:
                            if not self.user.has_perm(self.instance.get_permission_codename(
                                    ENTITY_PERMISSION_UPDATE_GEOM)):
                                formfield.widget.modifiable = False
                        formfield.widget.attrs['geom_type'] = formfield.geom_type
                except FieldDoesNotExist:
                    pass

                # Bypass widgets that inherit textareas, such as geometry fields
                if formfield.widget.__class__ == forms.widgets.Textarea:
                    formfield.widget = TinyMCE()
                    if max_characters:
                        textfield_help_text = global_help_text
                    if formfield.help_text:
                        formfield.help_text += f", {textfield_help_text}"
                    else:
                        formfield.help_text = textfield_help_text

        if self.instance.pk and self.user:
            if not self.user.has_perm(self.instance.get_permission_codename(
                    ENTITY_PERMISSION_UPDATE_GEOM)):
                for field in self.geomfields:
                    self.fields.get(field).widget.modifiable = False
        self._init_layout()

    def _init_layout(self):
        """ Setup form buttons, submit URL, layout
        """
        is_creation = self.instance.pk is None

        actions = [
            Button('cancel', _('Cancel'), css_class="btn btn-light ml-auto mr-2"),
            SubmitButton('save_changes', _('Create') if is_creation else _('Save changes')),
        ]

        # Generic behaviour
        if not is_creation:
            self.helper.form_action = self.instance.get_update_url()
            # Put delete url in Delete button
            actions.insert(0, HTML(
                """<a class="btn {0} delete" href="{1}"><i class="bi bi-trash"></i> {2}</a>""".format(
                    'btn-danger' if self.can_delete else 'disabled',
                    self.instance.get_delete_url() if self.can_delete else '#',
                    _("Delete")
                )))
        else:
            self.helper.form_action = self.instance.get_add_url()

        # Check if fieldslayout is defined, otherwise use Meta.fields
        fieldslayout = self.fieldslayout
        if not fieldslayout:
            # Remove geomfields from left part
            fieldslayout = [fl for fl in self.orig_fields if fl not in self.geomfields]
        # Replace native fields in Crispy layout by translated fields
        fieldslayout = self.__replace_translatable_fields(fieldslayout)

        has_geomfield = len(self.geomfields) > 0
        leftpanel_css = "col-12"
        if has_geomfield:
            leftpanel_css = "col-12 col-sm-6 col-lg-5"
        if self.leftpanel_scrollable:
            leftpanel_css += " scrollable"

        leftpanel = Div(
            *fieldslayout,
            css_class=leftpanel_css,
            css_id="modelfields",
        )

        rightpanel = tuple()
        if has_geomfield:
            rightpanel = (Div(
                *self.geomfields,
                css_class="col-12 col-sm-6 col-lg-7",
                css_id="geomfield"
            ),)

        # Create form actions
        # crispy_form bootstrap4 template is overriden
        # because of label and field classes added but not wanted here
        formactions = FormActions(
            *actions,
            css_class="form-actions",
            template='mapentity/crispy_bootstrap4/bootstrap4/layout/formactions.html'
        )

        # Main form layout
        self.helper.help_text_inline = True
        self.helper.form_class = 'form-horizontal'
        self.helper.form_style = "default"
        self.helper.label_class = 'col-md-3'
        self.helper.field_class = 'controls col-md-9'
        self.helper.layout = Layout(
            Div(
                Div(
                    leftpanel,
                    *rightpanel,
                    css_class="row"
                ),
                css_class="container-fluid"
            ),
            formactions,
        )

    def __replace_translatable_fields(self, fieldslayout):
        newlayout = []
        for field in fieldslayout:
            # Layout fields can be nested (e.g. Div('f1', 'f2', Div('f3')))
            if hasattr(field, 'fields'):
                field.fields = self.__replace_translatable_fields(field.fields)
                newlayout.append(field)
            else:
                # Add translated fields to layout
                if field in self._translated:
                    field_is_required = self.fields[
                        build_localized_fieldname(field, settings.MODELTRANSLATION_DEFAULT_LANGUAGE)
                    ].required
                    # Only if they are required or not hidden
                    if field_is_required or field not in self.hidden_fields:
                        newlayout.append(self.__tabbed_layout_for_field(field))
                else:
                    newlayout.append(field)
        return newlayout

    def __tabbed_layout_for_field(self, field):
        fields = []
        for replacement in self._translated[field]:
            active = "active" if replacement.endswith(
                '_{0}'.format(settings.MODELTRANSLATION_DEFAULT_LANGUAGE.replace('-', '_'))) else ""
            fields.append(Div(replacement,
                              css_class="tab-pane " + active,
                              css_id=replacement))

        layout = Div(
            HTML("""
            {{% load mapentity_tags %}}
            <ul class="nav nav-pills offset-md-3">
            {{% for lang in MODELTRANSLATION_LANGUAGES %}}
                <li class="nav-item">
                    <a class="nav-link{{% if lang|replace:"-|_" == '{lang_code}'""" """ %}}
                       active{{% endif %}}" href="#{field}_{{{{ lang|replace:"-|_" }}}}"
                       data-toggle="tab">{{{{ lang }}}}
                    </a>
                </li>
            {{% endfor %}}
            </ul>
            """.format(lang_code=settings.MODELTRANSLATION_DEFAULT_LANGUAGE.replace('-', '_'), field=field)),
            Div(
                *fields,
                css_class="tab-content"
            ),
            css_class="translatable tabbable"
        )
        return layout


class AttachmentForm(BaseAttachmentForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.redirect_on_error = True
        self.helper = FormHelper(form=self)
        self.helper.form_tag = True
        self.helper.form_class = 'attachment form-horizontal'
        self.helper.help_text_inline = True
        self.helper.form_style = "default"
        self.helper.label_class = 'col-md-3'
        self.helper.field_class = 'col-md-9'

        if self.is_creation:
            form_actions = [
                Submit('submit_attachment',
                       _('Submit attachment'),
                       css_class="btn-primary")
            ]
        else:
            form_actions = [
                Button('cancel', _('Cancel'), css_class=""),
                Submit('submit_attachment',
                       _('Update attachment'),
                       css_class="btn-primary")
            ]

        self.helper.form_action = self.form_url
        self.helper.layout.fields.append(
            FormActions(*form_actions, css_class="form-actions"))
