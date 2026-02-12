/*
Copyright (c) 2003-2011, CKSource - Frederico Knabben. All rights reserved.
For licensing, see LICENSE.html or http://ckeditor.com/license
*/
CKEDITOR.editorConfig = function(config) {
  config.toolbar = 'Standard';
  const charIcons    = ['Format', 'Bold', 'Italic', 'Underline', 'Subscript',
                        'Superscript', 'RemoveFormat'],
        paraIcons    = ['NumberedList', 'BulletedList', 'Outdent', 'Indent'],
        clipIcons    = ['Cut', 'Copy', 'Paste', 'PasteText', 'Undo', 'Redo'],
        colorIcons   = ['TextColor', 'BGColor'],
        miscBase     = ['Source', 'Maximize'],
        miscStandard = ['Table', 'Image', 'SpecialChar', 'Link', 'Unlink',
                        'Source', 'Maximize'],
        miscFullAll  = miscStandard.concat(['EmojiPanel']);

  config.toolbar_Simple = [
    { name: 'basicstyles', items: charIcons},
    { name: 'paragraph'  , items: paraIcons},
    { name: 'clipboard'  , items: clipIcons},
    { name: 'misc'       , items: miscBase}
  ];
  config.toolbar_Standard = [
    { name: 'basicstyles', items: charIcons},
    { name: 'paragraph'  , items: paraIcons},
    { name: 'clipboard'  , items: clipIcons},
    { name: 'editing'    , items: ['Scayt']},
    { name: 'misc'       , items: miscStandard}
  ];
  config.toolbar_Full = [
    { name: 'basicstyles', items: charIcons},
    { name: 'morestyles' , items: colorIcons},
    { name: 'paragraph'  , items: paraIcons},
    { name: 'clipboard'  , items: clipIcons},
    { name: 'editing'    , items: ['Scayt']},
    { name: 'misc'       , items: miscStandard}
  ];
  config.toolbar_FullAll = [
    { name: 'basicstyles', items: charIcons},
    { name: 'morestyles' , items: colorIcons},
    { name: 'paragraph'  , items: paraIcons},
    { name: 'clipboard'  , items: clipIcons},
    { name: 'editing'    , items: ['Scayt']},
    { name: 'misc'       , items: miscFullAll}
  ];
  // CK options
  config.entities = false;
  config.entities_greek = false;
  config.entities_latin = false;
  config.fillEmptyBlocks = false;
  config.removePlugins = 'elementspath';
  config.scayt_sLang = 'fr_BE';
  config.scayt_uiTabs = '0,1,0';
  config.removeDialogTabs = 'image:advanced;link:advanced';
  config.versionCheck = false;
};
