CHANGELOG
=========

8.13.1     (2025-07-16)
-----------------------

- Use logout view in POST (https://code.djangoproject.com/ticket/15619)


8.13.0     (2025-04-29)
-----------------------

**Improvements**

- Prevent changes on internal user (used to authenticate map screenshots)


8.12.2     (2025-03-19)
-----------------------

**Bug fixes**

- Fix log entry filter view

**Improvements**

- Support Django 5.2


8.12.0     (2025-02-21)
-----------------------

**Improvements**

- Support Django 5.1
- Accept WebP as picture attachment format


8.11.1     (2025-02-19)
-----------------------

**Improvements**

- Add python 3.13 test suite
- Drop python 3.8 test suite


8.11.0     (2025-01-09)
-----------------------

**Breaking Changes**

- `MapEntityList` view now needs an extra `MapEntityFilter` view to maintain filtering functionalities. If you customize the `FilterSet`, it must be added to: `MapEntityFormatList`, `MapEntityFilter`, and `MapEntityViewSet`. See the "Filters" section in documentation : https://django-mapentity.readthedocs.io/en/stable/customization.html#filters

**UI/UX**

- Move an object's related objects from the properties tab into their own tab

**Performances**

- Delay loading filter options only when opening form


8.10.0     (2024-10-02)
-----------------------

**Breaking changes**

* Compatibility with new django-crispy-forms (2.0.0+)
  * New explicit dependency to ``crispy-bootstrap4``.
  * You should adapt configuration by adding `crispy_bootstrap4` in your INSTALLED_APPS and check your templates inheritance.

**Improvements**

- Due to new crispy forms, there is new login form
- Use HTML `button` tag for create/update forms
- Prevent multiple submissions of create/update form


8.9.2      (2024-07-15)
-----------------------

*Bug fixes*

- Fix storage usage to deals with django >= 4.2.14

**Tests**

- Fix tests useless warnings


8.9.1      (2024-06-28)
-----------------------

**Improvements**

- Increase filters popup size, to display full select dropdowns


8.9.0      (2024-06-04)
-----------------------

**Features**

- Add django 5.0 support
- Drop django 3.2 support
- Add python 3.12 support

*Bug fixes*

- Fix map in ODT / PDF documents by using absolute path in storage
- Fix converted document name (DOC and PDF)

**Tests**

- Fix flaky translations in tests


8.8.2      (2024-05-22)
-----------------------

**Improvements**

- Add a get_columns method to change column list dynamically.


8.8.1  (2024-05-07)
-------------------

**Hotfix**

- Fix new internal user cache


8.8.0      (2024-04-10)
-----------------------

**Improvements**

- Refactor storage usage with default_storage and staticfiles_storage

**Tests**

- Use temporary media folder for tests
- Make `MapentityTestCase` more consistent

**CI**

- Parallelize tests in CI
- Fix codecov


8.7.3  (2024-04-02)
-------------------

**Bug fixes**

- Form clearing not handling number fields
- Fix weasyprint html public view by converting file:// schemes with http://
- Revert fixing current object order in overlays menu (#292)


8.7.2  (2024-03-22)
-------------------

**Bug fixes**

- 'Others' color config to use with leaflet overlay (#290)


8.7.1      (2024-03-13)
-----------------------

**Feature**

- Add current object in detail leaflet overlay (related to https://github.com/GeotrekCE/Geotrek-admin/issues/1300)


8.7.0      (2024-02-28)
-----------------------

- Fix of the widget `SelectMultipleWithPop` which did not add the newly created element in the related list (#1299)
- Add `MAX_CHARACTERS_BY_FIELD` to control the max length of a rich text field.
- Deprecate the `MAX_CHARACTERS` parameter


8.6.2      (2024-01-05)
-----------------------

**Bug fixes**

- Support sub languages (see https://github.com/GeotrekCE/Geotrek-admin/issues/3801)


8.6.1      (2023-09-18)
-----------------------

**Bug fixes**

- Fix new authentication system


8.6.0      (2023-09-15)
-----------------------

**Feature**

- Modify TinyMCE configuration to add browser spelling check for textAreas (related to https://github.com/GeotrekCE/Geotrek-admin/issues/1189)

**Maintenance**

- Support django 4.2 and python 3.11
- Drop django 3.1 support

**Documentation**

- Ease quickstart for developers

**Minor fixes**

- Improve authentication mechanism for screamshotter and convertit


8.5.6      (2023-09-04)
-----------------------

**Bug fixes**

- Fix Control Information error and revert code (#272)


8.5.5 	   (2023-09-04)
-----------------------

**DO NOT USE IT**

**Bug fixes**

- Fix hidden base layer attributions (#271)


8.5.4      (2023-07-03)
-----------------------

**Improvments**

- Move filter popover close button (related to https://github.com/GeotrekCE/Geotrek-admin/issues/2968)
- Add a scroll bar into filter form
- Add a scroll bar into module list (elated to https://github.com/GeotrekCE/Geotrek-admin/issues/2849)

* Support django 4.2 and python 3.11


8.5.3      (2023-03-27)
-----------------------

**Bug fixes**

- Fix Attachment duplications


8.5.2      (2023-02-28)
-----------------------

**Bug fixes**

- Fix default format from API should be datatables when not specified


8.5.1      (2023-02-16)
-----------------------

**Dependencies**

* Drop python 3.6 support

**Bug fixes**

- Redirect on Paperclip form error (to include Paperclip error message on object detail page directly)


8.5.0      (2023-02-07)
-----------------------

* Drop django 2.2 support

**Bug fixes**

- Fix tests derived from MapEntityTest


8.4.0      (2023-01-16)
-----------------------

**New Features**

- Add blocks for actions buttons for every detail template (after / before other blocks)
- Add duplicate action

**Bug fix**

- Do not try to generate filters in list views for `GenericRelation` fields and `File` fields
- Disable scroll propagation on layers list to avoid zoom changes on map (fix https://github.com/GeotrekCE/Geotrek-admin/issues/2687)



8.3.0      (2022-12-12)
-----------------------

**New Features**

- Support django 4.1
- Add block in detail template to allow overriding attachments navigation tab


8.2.1      (2022-08-16)
-----------------------

**Bug fix**

- Fix SVG extra dependancy not needed ([See issue /SmileyChris/easy-thumbnails#602](https://github.com/SmileyChris/easy-thumbnails/issues/602))


8.2.0      (2022-08-11)
-----------------------

**New Features**

- Add setting MAX_CHARACTERS for rich text fields
- Set map resizable
- Drop support for Django 2.2

**Maintenance**

- Fix lint errors after pycodestyle upgrade
- Add svg extra for easy-thumbnail


8.1.2      (2022-06-10)
-----------------------

**Bug fixes**

- Refix Page number count on list pagination


8.1.1      (2022-06-10)
-----------------------

**Bug fixes**

- Fix Log Entry GeoJSON with no geometry
- Fix log entry access by creating mapentity.read_logentry permission
- Hide log entry menu for users without permission.
- Hide "Show full history" from object for users without permission.
- Hide admin menu entry for users without permission.
- Fix message in default in 404 view
- Fix exception recursion in default error 500 view


8.1.0      (2022-06-03)
-----------------------

**Improvments**

- New GeoJSON generation based on database

**Warning**

- You need to delete cache after this release upgrade.

**Maintenance**

- django-geojson is not required anymore


8.0.1      (2022-04-13)
-----------------------

**Bug fixes**

- Fix download buttons on lists.


8.0.0      (2022-04-13)
-----------------------

**Breaking Changes**

- MapentityJSONList is now generated in MapentityViewset. You should update your code to replace JSONList views with MapentityViewset views.
- Base filters have changed. to care of new design.
- MapEntityJSONList is now deprecated

**New Features**

- Server-side list pagination
- Configure which fields should be order-ableand searchable

**Maintenance**

- Update datatables to 1.11.5

**New**

- Support django 4.0
- Support python 3.10


7.1.3      (2022-02-23)
-----------------------

**Minor changes**

- Reduce test execution time


7.1.2      (2022-01-28)
-----------------------

**New feature**

- Add blocks after attachments detail views


7.1.1      (2022-01-26)
-----------------------

**New feature**

- Use js for url with tab parameters
- Add blocks detail views (attachments and properties)


7.1.0      (2022-01-13)
-----------------------

**Breaking changes**

- New django-tinymce 3+. You should update your project settings if you customize this (and dependencies). https://django-tinymce.readthedocs.io/en/latest/installation.html#configuration


7.0.6     (2022-01-07)
-----------------------

**Bug fixes**

- Set default config for crispy form and messages tags to match with included bootstrap4
- Fix shapefile generation for GeometryCollection layers


7.0.5     (2021-12-21)
-----------------------

**Bug fixes**

- Fix a template break in DEBUG False mode


7.0.4     (2021-12-17)
-----------------------

**Bug fixes**

- Fix django dynamic formset multiple deletion https://github.com/elo80ka/django-dynamic-formset/issues/180#issuecomment-705011515


7.0.3     (2021-12-15)
-----------------------

**New feature**

- Allow to choose regex which find attachments


7.0.2     (2021-12-08)
-----------------------

**Bug fixes**

- Update JQuery formsets to fix item deletion

**New feature**

- Use map styles to configure colors in lists and detail views


7.0.1      (2021-11-30)
-----------------------

**Bug fixes**

- Use a specific django-leaflet release instead of git+https to allow installation from pypi


7.0.0      (2021-11-30)
-----------------------

**New features**

- Support django 2.2 to 3.2
- Support python 3.6 to 3.9
- Bootstrap 4
- Disable form field with settings
- Choose export columns from settings


6.1.1      (2020-03-30)
-----------------------

**Bug fixes**

- Save sorted column by model rather than Django app


6.1.0      (2020-01-10)
-----------------------

**New features**

- Add support of Django 2.0


6.0.5      (2019-12-20)
-----------------------

**Bug fixes**

- Fix nav pills to choose language in forms


6.0.4      (2019-12-03)
-----------------------

**Minor changes**

- Remove dependency on mock


6.0.3      (2019-11-25)
-----------------------

**Bug fixes**

- Fix image size in ODT templates


6.0.2      (2019-11-25)
-----------------------

**Bug fixes**

- Remove useless dependency django-shapes
- Fix autologin
- Fix XML attributes in ODT templates
- Fix logo and map size on ODT template


6.0.1      (2019-11-25)
-----------------------

**Bug fixes**

- Fix dependency to appy (use Python 3 version)


6.0.0      (2019-11-22)
-----------------------

**Breaking changes**

- Upgrade dependencies


5.1.0      (2019-11-18)
-----------------------

**New features**

- Create new permission Update geom
- Drop support to Django 1.9 and 1.10 versions
- upgrade libraries

**Performances**

- Allow client side caching with systematic revalidation for Layer and JsonList views
- Remove validation of history bar
- Don't bringToFront() every single feature on map

**Minor changes**

- Change serve_attachments get all attachments using generic foreign key
- Load local file in list views
- Geojson float precision settings.
- Can use function style in leaflet
- Save column sort by module

**Bug fixes**

- Fix sort list
- Fix filters after get context
- Fix multi select filters
- Fix BadStatusLine exception
- Fix croped attachments
- Make sure that locateOnLine() tolerance is sufficient to pass Geotrek tests
- Fix points on narrow angles sublines (Leaflet.GeometryUtil)
- Fix tests csv : stringio and encode
- Fix permission paperclip (version 2.2.1)
- Snap better on lines splitted.
- Fix HTTP headers forwarded to convertit
- Fix test permission geom
- Fix crash in log entries view
- Fix makemigrations (disabling of modeltranslation)


5.0.0      (2018-05-07)
-----------------------

**Breaking changes**

- Move to python 3


4.3.4      (2018-04-08)
-----------------------

**Bug fixes**

- Fix/upgrade all requirements


4.3.3      (2018-04-08)
-----------------------

**Bug fixes**

- Fix django version in setup.py


4.3.2      (2018-04-08)
-----------------------

**Bug fixes**

- Fix (django-)weasyprint versions in setup.py


4.3.1      (2018-04-07)
-----------------------

**Minor changes**

- Make MapEntityTest more extensible


4.3.0      (2018-04-02)
-----------------------

**Bug fixes**

- Fix logo path/url
- Fix test_project settings
- Make sure mapentity settings are loaded before leaflet ones

**New features**

- Add weasyprint HTML markup view


4.2.0      (2018-03-31)
-----------------------

**New features**

- add support of Django 1.11 (Django 1.9 and 1.10 are still supported)

**Minor changes**

- fix errors logged during tests
- create a map image (with an error message) when geom is null
- add a default logo-header.png
- use file transport instead of http one in weasyprint template


4.1.1      (2018-03-28)
-----------------------

**Bug fixes**

- Fix registering of Mapentity based models when migrations are not done


4.1.0      (2018-03-26)
-----------------------

**Bug fixes**

- Fix select multiple reset

**New features**

- add support of Django 1.10
- add an install.sh script


4.0.0      (2018-03-06)
-----------------------

**New features**

- upgrade to django 1.9

**Breaking changes**

- replace `from mapentity import registry` by `from mapentity.registry import registry`


3.3.0      (2018-02-02)
-----------------------

**New features**

- allow to specify print context on models for map captures


3.2.2      (2018-01-11)
-----------------------

**Bug fixes**

- add missing support for polygon in shapefile exports


3.2.1      (2017-11-07)
-----------------------

**Bug fixes**

- constant size numbers for POI enumeration
- change nav icons size depending on page height instead of width
- draw circle geometries if radius property exists



3.2.0      (2017-08-21)
-----------------------

**New features**

- Serialize polygons to GPX

**Bug fixes**

- Fix POI enumeration if > 26 * 26


3.1.4      (2017-06-21)
-----------------------

**Bug fixes**

- Fix UnicodeDecode Error


3.1.3      (2017-06-21)
-----------------------

**Bug fixes**

- Fix GenericRelation


3.1.2      (2017-06-21)
-----------------------

**Bug fixes**

- Fix AutoLogin middleware with django 1.8

**Internal changes**

- Prepare code to compatibility python2 / python3
- Use GenericRelation for Paperclip, to permit prefetch_related on them
- Upgrade requirements

3.1.0      (2017-03-23)
-----------------------

**New features**

- new django-paperclip version, with external picture URLs

3.0.2      (2017-03-08)
-----------------------

**Bug fixes**

- fix distribution version

3.0.1      (2017-03-08)
-----------------------

**Bug fixes**

- GPX linestring export in track format, instead of route

3.0.0      (2017-02-21)
-----------------------

**Breaking change**

- Require Django 1.8
- Upgrade several dependencies with some API changes

2.8.7      (2017-02-06)
-----------------------

**Bug fixes**

- Remove initial migration

2.8.6      (2017-02-02)
-----------------------

**Bug fixes**

- fix context size

2.8.5      (2017-01-08)
-----------------------

**Bug fixes**

- Fix install
- Add initial migration

2.8.4      (2016-10-12)
-----------------------

**Bug fixes**

- Fix map fitBounds() when size is constrained

2.8.3      (2016-08-17)
-----------------------

**Bug fixes**

- Fix latlngbounds template tag for GEOSGemetries objects

2.8.2      (2016-08-17)
-----------------------

**Bug fixes**

- Fix timezone bug in cache invalidation for map screenshots

2.8.1      (2016-08-17)
-----------------------

**Bug fixes**

- Forgot to package leaflet plugins

2.8.0      (2016-08-17)
-----------------------

**New features**

- Adjust size of map captures to entirely fill it with the geometry

**Bug fixes**

- Hide None in template if creator is not known

2.7.1      (2016-01-28)
-----------------------

**Bug fixes**

- Set language to capture map images

2.7.0      (2016-01-28)
-----------------------

**New features**

- Allow to override the css selector to wait to capture map image

2.6.1      (2015-11-05)
-----------------------

**Bug fixes**

- Rework CSS to prevent overlaping controls in list view

2.6.0      (2015-10-28)
-----------------------

**Breaking changes**

- Use translated verbose_name fields instead of column/property names in shapefiles export

2.5.2      (2015-07-29)
-----------------------

**Bug fixes**

- Upgrade gpxpy (fix elevation 0 in GPX exports)

2.5.1      (2015-07-29)
-----------------------

**Bug fixes**

- Readd missing dependencies

2.5.0      (2015-07-28)
-----------------------

**New features**

- Add possibility to add custom menu entries

2.4.2      (2015-07-06)
-----------------------

**Bug fixes**

- Don't crash when logging anonymous actions


2.4.1      (2015-06-24)
-----------------------

**Bug fixes**

- Fix insertion of images with WeasyPrint


2.4.0      (2015-06-19)
-----------------------

**New features**

- Use WeasyPrint PDF export system


2.3.0      (2015-06-09)
-----------------------

**New features**

- Hide models in navbar when not allowed to read them


2.2.0      (2015-05-22)
-----------------------

**New features**

- Auto cleanup of HTML markup when pasting into TinyMCE


2.1.0      (2015-04-28)
-----------------------

**New features**

- Configurable Django Rest Framework API URL


2.0.0      (2015-04-23)
-----------------------

**Breaking changes**

- Remove trailing slash from API URLs (/api/models.json instead of /api/models/)

**Bug fixes**

- Fix LastModifiedMixin to handle all dispatch() parameters


1.16.0     (2015-03-20)
-----------------------

**New features**

- Allow to add links to Youtube or Soundcloud media as attachment


1.15.2     (2015-03-11)
-----------------------

**Bug fixes**

- Workaround a bug in django test framework


1.15.1     (2015-03-11)
-----------------------

**Bug fixes**

- Allow to delete a field in TranslatedModelForm.__init__()


1.15.0     (2015-02-25)
-----------------------

**New features**

- Allow to disable html attributes in MapEntityDocument context


1.14.2     (2015-02-20)
-----------------------

**Bug fixes**

- Fix formating of float and boolean values in CSV/Shapefile exports


1.14.1     (2015-02-18)
-----------------------

**Bug fixes**

- Fix MapEntityLiveTest (mock screamshot)


1.14.0     (2015-02-18)
-----------------------

**New features**

- Allow anonymous users to access map image attached to public objects
- Allow to configure X-Accel-Redirect/X-Sendfile HTTP header


1.13.0     (2015-02-13)
-----------------------

**New features**

- Allow to specify headers to convertit_download() helper

**Bug fixes**

- Fix logging in management commands


1.12.0     (2015-02-13)
-----------------------

**New features**

- Check read permission of related model when serving media (attachment, map)
- Allow anonymous users to access media attached to public objects

**Bug fixes**

- Allow serving media other than attachments if not having read_attachment perm


1.11.1     (2015-01-30)
-----------------------

**Bug fixes**

- Fix tests derived from MapEntityTest


1.11.0     (2015-01-29)
-----------------------

**New features**

- Add geojson with full properties support to REST API

**Bug fixes**

- Fix geojson caching that returns sometime "None" instead of valid json


1.10.5     (2015-01-21)
-----------------------

**Packaging fixes**

- Fix missing ressources files in pypi release


1.10.4     (2015-01-21)
-----------------------

**Bug fixes**

- Pick up the ViewSet only if its model matches


1.10.3     (2014-12-18)
-----------------------

**Bug fixes**

- Fix zoom level for map captures (fixes #108)
- Don't try (and fail) to prepare map images when geom is absent

**Internal changes**

- Upgrade paperclip to 0.2.3


1.10.2     (2014-11-21)
-----------------------

**Bug fixes**

- Fix TinyMCE config to keep colors
- Fix apparence of add buttons with popup


1.10.1     (2014-11-07)
-----------------------

**Bug fixes**

- Fixes crash when a change on proxy model is stored (fixes #104)
- Prevent email to be sent twice on conversion error. Use info instead.


1.10.0     (2014-11-05)
-----------------------

**Breaking changes**

- Got rid of Year filters.

**Bug fixes**

- Fix list filter restore (see https://github.com/makinacorpus/Geotrek/issues/1236)


1.9.1      (2014-10-24)
-----------------------

- Fix overlay layers being lost in grouped layers control


1.9.0      (2014-10-23)
-----------------------

**New features**

- Ability to edit attachments directly in detail pages

**Bug fixes**

- Clearer action message in object history table
- Remove top messages only (fixes `a Geotrek bug <https://github.com/makinacorpus/Geotrek/issues/1225>`_)

**Internal changes**

- Upgraded Chosen from 0.9.12 to 1.2.0 (used in comboxboxes and multiselect forms fields)


1.8.4      (2014-10-13)
-----------------------

**Bug fixes**

- Fix forms not passing extra fields (backport from PNR PACA hotfix in Geotrek 0.27)

1.8.3      (2014-10-08)
-----------------------

**Bug fixes**

- Fix enumeration when no item in layer
- Fix highlight in list when geometries are multi-part


1.8.2      (2014-09-26)
-----------------------

**Bug fixes**

- Do not crash when getting object creator with an inconsistent history
- Create tabs for translatable fields when crispy form layout is not specified
- Apply styles for translatable fields when there are not in a tab
- Fix save of form field falsy value
- Fix test_no_html_in_csv test with non-ascii field verbose names


1.8.1      (2014-09-09)
-----------------------

**Bug fixes**

- Prevent error if only queryset is used for ``LastModifiedMixin``


1.8.0      (2014-09-08)
-----------------------

**Bug fixes**

- Prevent colors to be cleaned from text fields
- Limit fit zoom on small objects (fixes #91).
  Introduced new setting ``MAP_FIT_MAX_ZOOM``, default to 18.
- Add setting to control ``date_update`` field name (fixes #11)

**Bug fixes**

- Safety check for showing layer enumeration if layer has no item

**New features**

- Added Django Rest Framework REST views. Activated by default on every
  registered models

** Internal changes **

- Moved versions of dependencies from setup to ``requirements.txt``
- Refactor of URLs initialization


1.7.3      (2014-08-21)
-----------------------

**Bug fixes**

- Fix list of values DOM error, preventing document attributes export
  and list vertical display


1.7.2      (2014-08-21)
-----------------------

**Bug fixes**

- Fix export views when only queryset is specified in view class


1.7.1      (2014-08-21)
-----------------------

**Bug fixes**

- Do not save last list in session if JSON or format list
- Support of ``menu`` option in MapEntity register


1.7.0      (2014-08-21)
-----------------------

**Breaking changes**

- ``registry.register()`` takes a class instead of keyword-args for options

**New features**

- Ability to configure apparence of objets in print exports (fixes #86)
- GeoJSON layers can now be filtered as other list views
- New template tag to show a list of record as a table
- New events ``entity:mouseout`` and ``entity:mouseover`` emitted when
  objects are hovered on maps and in detail pages
- Interaction between maps and detail tables or lists of values

** Internal changes **

- Refactor of class inheritance for lists views


1.6.0      (2014-08-01)
-----------------------

**Breaking changes**

- Removed ``fied_verbose_name`` and ``timesince`` template tag librairies
- Now all grouped inside ``mapentity_tags``


- Added parameters to view_cache_response_content decorator
- Limit height of layer switcher on small screens
- Get rid of next parameter when redirecting to login when permission missing
- Removed history links for proxied models
- Fix permission code name when model is proxied
- Fix apparence of main menu when permissions are missing to view logbook and admin
- Fix status code of ConvertIt being lost in Convert views
- Display messages in login page too (useful for redirections)
- Support edition of several fields on the same map, via django-leaflet new feature (fixes #53)
- Show objects numbering on print detail maps (fixes #35)

1.5.1      (2014-06-26)
-----------------------

**Minor changes**

- Ordered Log entries by date descending
- Fix tab "None" being shown in list view

1.5.0      (2014-06-23)
-----------------------

**New features**

- Show small colored symbols for objects in layer switcher

**Bug fixes**

- Fix empty paragraphs in TinyMCE
- Fix missing translation of Load local layer
- Fix apparence of attachment form
- Adjust vertical alignment of checkboxes in layer switcher
- Fix object layer not being shown by default
- Fix multiple occurences of same author in detail view


1.4.2      (2014-06-19)
-----------------------

- Fix missing translation of Load local layer
- Fix empty paragraphs in TinyMCE
- Fix translations not being packaged


1.4.0      (2014-06-13)
-----------------------

** New features **

- Show object type in Document export (fixes #36)
- Nicer margins for translated pills form fields
- Close filters popup when clicking outside
- Show object type in document export (fixes #36)
- Better apparence of filters popup close button
- Command to update all map images
- Nicer layer switcher, with groups of layers (fixes #61)

** Bug fixes **

- Fix first value not coming from label for YearFilter
- Fix download buttons from list view
- Fix measure control appearing twice in forms
- Fix permission check on attachments

** Internal changes **

- Allow to override GPX serialization
- Prevent to use a cycle request/response to extract HTML attributes
- Allow to control scrollable aspect of left panel when subclassing
- Add test for never cache decorator of geojson views
- Split cache keys instead of splitting cached values
- Prevent to use a cycle request/response on HTML extraction for document
- Fix behaviour of flag ``FrontEndTest`` in User-Agent


1.3.2      (2014-06-04)
-----------------------

- Fixed GDAL installation since UbuntuGIS stable major upgrade (sic)
- Fixed unicode conversion of title


1.3.1      (2014-05-26)
-----------------------

- Remove flag ``FrontEndTest`` from User-Agent
- Make sure ``detailspanel`` template block can be fully overriden

1.3.0      (2014-05-22)
-----------------------

** New features **

- Add fullscreen button on maps
- Add all controls on detail map
- Add buttons to create records from anypage from within the drop down
  menu.
- Add a button to close filters

** Bug fixes **

- Drop down menu not disabled in list view
- Fix generic document view not being usable with querysets

** Internal changes **

- Split MapEntity init module
- Added a command to update MapEntity models permissions


1.2.8      (2014-05-19)
-----------------------

- Pluggable filters
- Open ODT/DOC/PDF exports in a new tab


1.2.7      (2014-05-16)
-----------------------

- Fix regression about conversion urls that are not absolute


1.2.6      (2014-05-15)
-----------------------

- Do not override HOST HTTP header sent to convertit


1.2.5      (2014-05-15)
-----------------------

- Fix regression on conversion headers


1.2.4      (2014-05-14)
-----------------------

- Fix perms creation with south migrations
- Fix register when database is not yet synced


1.2.3      (2014-05-13)
-----------------------

- Create perms at post_syncdb signal


1.2.2      (2014-05-12)
-----------------------

- Flush caches before creating permissions


1.2.1      (2014-05-07)
-----------------------

* Fix internal user not being given permission if inactive


1.2.0      (2014-05-06)
-----------------------

* Include SVG files in package data
* Fix original headers not being transmitted to *ConvertIt*.


1.1.2      (2014-05-06)
-----------------------

* Fix regression on permissions creation after using exists()


1.1.1      (2014-05-06)
-----------------------

* Add missing .odt template file in package


1.1.0      (2014-05-06)
-----------------------

** New features **

* Show number of attached files in tab (fixes #39)
* Define missing classes dynamically during register (fixes #17)
* Add a setting to serve media as attachment (default: True) (fixes #37)

** Bug fixes **

* Force browser's cache revalidation of geojson data (fixes #38)
* Fix action history (no link to deleted objects)
* Fix map views JS event attributes

** Breaking changes **

* No more `Meta` in `MapEntityForm` (see `commit notes <https://github.com/makinacorpus/django-mapentity/commit/3362bfd834e3b538f1377e63f7935fb3128a63d1>`_)


1.0.0      (2014-04-26)
-----------------------

** New features **

* Track objects creations, changes and deletions
* Rely on Django permissions to control access to detail, list and exports
* Got rid of inline JavaScript blocks, now rely on stupid-simple events

** Internal changes **

* Make API_SRID a constant hardcoded to 4326
* Make SRID an app setting so must appears in ``MAPENTITY_CONFIG`` in your project's
  settings


0.1.0      (unreleased)
-----------------------

* Internal version of Geotrek < 0.23
