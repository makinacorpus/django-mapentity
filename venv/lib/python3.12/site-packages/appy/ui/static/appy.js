var lsTimeout,  // Timout for the live search
    podTimeout, // Timeout for checking status of pod downloads
    queryMobile = 'only screen and (hover:none) and (pointer:coarse)';

class ClassState {
  /* Used by UiState class below, a ClassState object represents UI-state data
     being specific to a given Appy class. */
  constructor(data) {
    // If p_data is passed, initialise this from it
    if (data) {
      for (const key in data) this[key] = data[key];
      return;
    }
    // Current sidebar visibility
    this.sidebarDisplay = 'block';
    // Current sidebar width
    this.sidebarWidth = null;
    /* Note that these sidebar-related attributes are ignored if the related
       Appy class does not define a sidebar. */
  }
}

class UiState {
  /* This class stores the state of the UI. By "UI", we mean a specific browser
     tab. A UiState object stores things like:
     - sidebar or sub-titles visibility,
     - group searches being expanded or collapsed,
     - currently shown tabs in a tabbed-styled group of fields,
     - ...
     UiState attributes are marshalled and stored in the session storage, but
     accessible via a UiState object set in a global variable named "ui".
     This allows to avoid to repeatedly unmarshall session storage data. */

  constructor() {
    /* Most of the UI-related attributes are specific to each Appy class. Dict
       v_perClass contains one entry per Appy class: keys are names of Appy
       classes and values are ClassState objects. */
    this.perClass = {};
  }

  get(cls) {
    /* Get the ClassState object corresponding to the class having this p_cls.
       Create it if it does not exist yet. */
    // a. Get it if it already exists
    if (cls in this.perClass) return this.perClass[cls];
    // b. Get it from the session storage if it exists there
    let cstate = sessionStorage.getItem(cls);
    if (cstate) return new ClassState(JSON.parse(cstate));
    // c. Create it, put it in this.perClass and add it in the session storage
    cstate = new ClassState();
    this.perClass[cls] = cstate;
    sessionStorage.setItem(cls, JSON.stringify(cstate));
    return cstate;
  }

  set(cls, name, value) {
    /* Sets, on the ClassState object corresponding to p_cls, this new p_value
       for the attribute having this p_name. */
    let cstate = this.get(cls);
    cstate[name] = value;
    sessionStorage.setItem(cls, JSON.stringify(cstate));
  }
}

// Builds the URL to a static resource named p_name
function buildUrl(name) { return `${siteUrl}/static/appy/${name}` }

// Chunk of XHTML code containing a "loading" animated icon
function loading(icon) {
 return `<div align="center"><img src="${buildUrl(icon)}"/></div>`;
}

// Add to form p_f a hidden field named p_name with this p_value
function addFormField(f, name, value) {
  // If a field named p_name already exists, simply set its value to p_value
  if (name in f.elements) {
    f.elements[name].value = value;
    return;
  }
  let field = document.createElement('input');
  field.setAttribute('type', 'hidden');
  field.setAttribute('name', name);
  field.setAttribute('value', value);
  f.appendChild(field);
}

// Function for performing a HTTP POST request
function post(action, params, target) {
  // Create a form object
  let f = document.createElement('form');
  f.setAttribute('action', action);
  f.setAttribute('method', 'post');
  if (target) f.setAttribute('target', target);
  // Create a (hidden) field for every parameter
  for (let key in params) addFormField(f, key, params[key]);
  document.body.appendChild(f);
  f.submit();
}

// Fills dict p_d with elements from form p_f
function form2dict(f, d) {
  // Get the other params
  let name, value, elem, elems = f.elements;
  for (const elem of elems) {
    // Ignore unnamed form elements
    name = elem.name;
    if (!name) continue;
    // Get the field value
    if (elem.type == 'checkbox') {
      value = (elem.checked)? '1':'0';
    }
    else if (elem.type == 'radio') {
      if (elem.checked) value = elem.value;
      else continue;
    }
    else if (elem.type == 'textarea') {
      value = encodeURIComponent(elem.value);
    }
    else value = elem.value;
    // Store the value on p_d
    d[name] = value;
  }
}

function quote(s) { return '\'' + s + '\''}

// Convert HTML text, containing entities and "br" tags, to pure text
function html2text(v) {
  let r = v.replace(/<br\/?>/g, '\n').replace('&amp;', '&');
  return r.replace('&lt;', '<').replace('&gt;', '>')
}

function toggleLoginBox(show) {
  // Hide/show the login icon
  const loginIcon = document.getElementById('loginIcon');
  loginIcon.style.display = (show)? 'none': 'flex';
  // Show/hide the login box
  const loginBox = document.getElementsByClassName('loginBox')[0];
  loginBox.style.display = (show)? 'block': 'none';
  if (show) document.getElementById('login').focus();
}

function goto(url, stay, params) {
  // Display this p_url in the current window
  let win = null;
  if (stay) {
    win = window;
  }
  else { // Refresh the whole page if we are in the iframe
    win = (window.name == 'appyIFrame')? window.parent: window;
  }
  /* Add or update, in p_url, any parameter that would be present in dict
     p_params. */
  if (params) {
    const o = new URL(url);
    for (const key in params) {
      o.searchParams.set(key, params[key]);
    }
    url = o.href;
  }
  win.location = url;
}

function len(dict) {
  let r = 0;
  for (let key in dict) r += 1;
  return r;
}

function getElementsHavingName(tag, name, forceTop) {
  let r = window.document.getElementsByName(name);
  if ((r.length == 0) && forceTop) {
    r = window.top.document.getElementsByName(name);
  }
  return r;
}

// AJAX machinery
var xhrObjects = new Array(); // An array of XMLHttpRequest objects

function XhrObject() { // Wraps a XmlHttpRequest object
  this.xhr = new XMLHttpRequest();
  this.freed = 1;      // Is this object already dealing with a request ?
  this.hook = '';      /* The ID of the HTML element in the page that will be
                          replaced by result of executing the Ajax request. */
  this.onGet = '';     /* The name of a Javascript function to call once we
                          receive the result. */
  this.info = {};      // An associative array for putting anything else
  this.append = false; // Replace or append the ajax response to the hook ?
}

/* When inserting HTML at some DOM node in a page via Ajax, scripts defined in
   this chunk of HTML are not executed. This function, typically used as "onGet"
   param for the askAjaxChunk function below, will evaluate those scripts. */
function evalInnerScripts(xhrObject, hookElem) {
  if (!hookElem) return;
  let scripts = hookElem.getElementsByTagName('script');
  for (let i=0; i<scripts.length; i++) eval(scripts[i].innerHTML);
}

function injectChunk(tag, content, inner, searchTop, append){
  /* Injects the chunk of XHTML code p_content in this p_tag, or append it to
     the existing p_tag content if p_append is true. */
  let r = tag;
  if (inner) {
    r.innerHTML = append ? r.innerHTML + content : content;
  }
  else {
    // Replace p_tag with a new one filled with p_content and return it
    if ((tag.tagName == 'TR') && content.startsWith('<!')) {
      /* Replace the whole table instead of the current row: p_content is not a
         chunk but a complete (probably, error) page. */
      tag = tag.parentNode.parentNode;
    }
    let id = tag.id;
    if (id && searchTop) id = ':' + id;
    /* Add p_content to the p_tag content or replace the whole p_tag, depending
       on p_append. */
    if (append) tag.innerHTML = tag.innerHTML + content;
    else tag.outerHTML = content;
    if (id) r = getNode(id); // Get the new element
  }
  return r;
}

function getNode(id, forceTop) {
  /* Gets the DOM node whose ID is p_id. If p_id starts with ':', we search
     the node in the top browser window, not in the current one that can be
     an iframe. If p_forceTop is true, even if p_id does not start with ':',
     if the node is not found, we will search in the top browser window. */
  if (!id) return;
  let container = window.document,
      startIndex = 0;
  if (id[0] == ':') {
    container = window.top.document;
    startIndex = 1;
  }
  let nodeId = id.slice(startIndex),
      r = container.getElementById(nodeId);
  if (!r && forceTop) r = window.top.document.getElementById(nodeId);
  return r;
}

function getAjaxChunk(pos) {
  // This function is the callback called by the AJAX machinery (see function
  // askAjaxChunk below) when an Ajax response is available.
  // First, find back the correct XMLHttpRequest object
  let rq = xhrObjects[pos];
  if ( (typeof(rq) != 'undefined') && (rq.freed == 0)) {
    if ((!rq.hook) || (rq.xhr.readyState != 4)) return;
    // We have received the HTML chunk
    let hookElem = getNode(rq.hook);
    if (hookElem) {
      let content = rq.xhr.responseText,
          searchTop = rq.hook[0] == ':',
          injected= injectChunk(hookElem, content, false, searchTop, rq.append);
      // Call a custom Javascript function if required
      if (rq.onGet) rq.onGet(rq, injected);
      // Refresh the whole page if requested
      let goto = rq.xhr.getResponseHeader('Appy-Redirect');
      if (goto) {
        window.top.location = goto;
        // Do not "consume" any message here: let v_goto do it
      }
      else {
        // Display the Appy message if present
        const msg = readCookie('AppyMessage');
        if (msg) { updateAppyMessage(msg); createCookie('AppyMessage', ''); }
      }
    }
    rq.freed = 1;
  }
}

// Displays the waiting icon when an ajax chunk is asked
function showPreloader(hook, waiting) {
  /* p_hook may be null if the ajax result would be the same as what is
     currently shown, as when inline-editing a rich text field). */
  if (!hook || (waiting == 'none')) return;
  // What waiting icon to show ?
  if (!waiting) waiting = 'loading.gif';
  injectChunk(getNode(hook), loading(waiting), true);
}

function askAjaxChunk(url, mode, params, hook, beforeSend, onGet, waiting,
                      append) {
  /* Ask a chunk of XHTML on the server at p_url, through a XMLHttpRequest.
     p_mode can be 'GET' or 'POST'. URL parameters or form data can be specified
     in associative array p_params.

     p_hook is the ID of the XHTML node that will be filled with the XHTML
     result from the server. If it starts with ':', we will find the node in
     the top browser window and not in the current one (that can be an iframe).
     If it starts with '*', it is the name of a key in the session storage, the
     request will be synchronous and its result, expected to be JSON, will be
     stored in the session storage at this key.

     p_beforeSend is a Javascript function to call before sending the request.
     This function will get 2 args: the XMLHttpRequest object and the p_params.
     This method can return, in a string, additional parameters to send, ie:
     "&param1=blabla&param2=blabla".

     p_onGet is a Javascript function to call when we will receive the answer.
     This function will get 2 args, too: the XMLHttpRequest object and the
     HTML node element into which the result has been inserted.

     p_waiting is the name of the animated icon that will be shown while waiting
     for the ajax result. If null, it will be "loading.gif". If string "none" is
     passed, there will be no icon at all.

     If p_append is False or null, the hook content will be replaced with the
     Ajax response. Else, it will be appended after the existing hook content.
  */

  // First, get a non-busy XMLHttpRequest object
  let sync = hook[0] == '*', pos = -1;
  for (let i=0; i < xhrObjects.length; i++) {
    if (xhrObjects[i].freed == 1) { pos = i; break; }
  }
  if (pos == -1) {
    pos = xhrObjects.length;
    xhrObjects[pos] = new XhrObject();
  }
  let rq = xhrObjects[pos];
  rq.hook = hook;
  rq.onGet = onGet;
  rq.append = append;
  rq.freed = 0;
    
  // Construct parameters
  let allParams = ['ajax=True'];
  if (params) {
    for (const name in params) {
      allParams.push(`${name}=${params[name]}`);
    }
  }
  allParams = allParams.join('&');
  // Call beforeSend if required
  if (beforeSend) {
     let r = beforeSend(rq, params);
     if (r) allParams = allParams + r;
  }
  // Build the URL to call
  let urlFull = url;
  if (mode == 'GET') {
    urlFull = `${urlFull}?${allParams}`;
  }
  // Display the pre-loader when appropriate
  if (!sync && !rq.append) showPreloader(rq.hook, waiting);
  // Perform the asynchronous HTTP GET or POST
  rq.xhr.open(mode, urlFull, !sync);
  if (mode == 'POST') { // Set the correct HTTP headers
    rq.xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
  }
  else { allParams = null; }
  // For an asynchronous request, define the callback function
  if (!sync) rq.xhr.onreadystatechange = function(){ getAjaxChunk(pos); }
  // Perform the HTTP request
  rq.xhr.send(allParams);
  // Manage a sync request
  if (sync) {
    sessionStorage.setItem(hook.substr(1), rq.xhr.responseText);
    rq.freed = 1;
  }
}

class AjaxData {
  // Represents all the data required to perform an Ajax request

  constructor(url, mode, params, hook, parentHook, beforeSend, onGet, append,
              childToSync) {
    this.url = url;
    this.mode = (!mode)? 'GET': mode;
    this.params = params;
    this.hook = hook;
    /* If a parentHook is specified, this AjaxData must be completed with a
       parent AjaxData object. */
    this.parentHook = parentHook;
    /* If p_childToSync is true, p_this is a special child whose current
       v_params must be integrated into the parent's data everytime the parent
       is ajax-refreshed. */
    this.syncedChild = null;
    if (childToSync) {
      const parent = getNode(parentHook, true)['ajax'];
      if (parent) parent.syncedChild = this;
    }
    this.beforeSend = beforeSend;
    this.onGet = onGet;
    this.append = append;
    // Inject this AjaxData object into p_hook
    getNode(hook, true)['ajax'] = this;
    // If v_this corresponds to a search, copy its parameters in the session
    if (params && 'search' in params) {
      this.storeInSession();
    }
  }

  // Merge p_other into p_this, attributes "params" and "syncedChild" excepted
  merge(other) {
    for (let name in other) {
      // Ignore these attributes. Merging params is done by m_mergeParams below.
      if ((name == 'params') || (name == 'syncedChild')) continue;
      // Keep this' value if it exists
      if (!this[name]) this[name] = other[name];
    }
  }

  /* Merge p_this.params with p_other.params. If p_override is true, if both
     AjaxData objects have an homonymous parameter, the kept one is the p_other
     one. */

  mergeParams(other, override) {
    if (!other.params) return;
    for (let key in other.params) {
      // Don't override v_key when appropriate
      if (!override && (key in this.params)) continue;
      this.params[key] = other.params[key];
    }
  }

  storeInSession() {
    // Stores or updates p_this.params into the session storage
    let params = this.params,
        key = params['className'] + '_' + params['search'] + ':P';
    if ('criteria-' in params) {
      // Create a variant, where this key is replaced with key "criteria"
      let clone = {};
      for (let key in params) {
        if (key == 'criteria-') clone['criteria'] = params[key];
        else clone[key] = params[key];
      }
      params = clone;
    }
    sessionStorage.setItem(key, JSON.stringify(params));
  }

  // p_this, as a short string
  asString() {
    let sparams = (this.params)? stringFromDict(this.params): '-';
    let schild = (this.syncedChild)? this.syncedChild.hook: '-';
    return `AjaxData(hook=${this.hook},url=${this.url},params=${sparams},` +
           `syncedChild=${schild})`;
  }
}

function getSearchInfo(key, siblings) {
   // Get the search info stored at this p_key in the session storage
  let suffix = (siblings)? '': ':P',
      r = JSON.parse(sessionStorage.getItem(key + suffix)) || {};
  if (!siblings && 'filters' in r) {
    r['filters'] = stringFromDict(r['filters']);
  }
  return r
}

function askAjax(hook, form, params, waiting) {
  /* Call askAjaxChunk by getting an AjaxData instance from p_hook, a
      potential action from p_form and additional parameters from p_param. */
  let d = getNode(hook)['ajax'];
  // Complete data with a parent data if present
  if (d.parentHook) {
    let parentHook = d.parentHook;
    if (hook[0] == ':') parentHook = `:${parentHook}`;
    const parent = getNode(parentHook)['ajax'];
    d.merge(parent);
    // Merge parameters
    d.mergeParams(parent, false);
  }
  // Complete data with a synced child, if any
  const schild = d.syncedChild;
  if (schild) d.mergeParams(schild, true);
  // Resolve dynamic parameter "cbChecked" if present
  if ('cbChecked' in d.params) {
    let cb = getNode(d.params['cbChecked'], true);
    if (cb) d.params['cbChecked'] = (cb.checked)? 'True': 'False';
    else delete d.params['cbChecked'];
  }
  // Convert the "filter" dict into a string when present
  if ('filters' in d.params) {
    d.params['filters'] = stringFromDict(d.params['filters']);
  }
  // If a p_form id is given, integrate the form submission in the ajax request
  let mode = d.mode;
  if (form) {
    let f = document.getElementById(form),
        action = f.action,
        saction = f.getAttribute('data-sub');
    mode = 'POST';
    /* Deduce the action from the form action, either via custom field
       "action-sub", already containing the correct action sub-path, or by
       extracting it from the "action" field. */
    if (saction) d.params['action'] = saction;
    else if (action != 'none'){
      let i = (action.indexOf('@') == -1)? 3: 4,
          parts = _rsplit(action, '/', i).slice(1);
      d.params['action'] = parts.join('*');
    }
    // Get the other params
    form2dict(f, d.params);
  }
  // Get p_params if given. Note that they override anything else.
  if (params) {
    if ('mode' in params) { mode = params['mode']; delete params['mode'] };
    if ('scrollTop' in params) {
      getNode(params['scrollTop']).scrollTop = 0;
      delete params['scrollTop'];
    }
    for (let key in params) d.params[key] = params[key];
  }
  let onGet = d.onGet || evalInnerScripts;
  askAjaxChunk(d.url, mode, d.params, hook, d.beforeSend, onGet, waiting,
               d.append);
}

function askBunch(hook, start, maxPerPage, scrollTop) {
  const params = {'start': start};
  if (maxPerPage) params['maxPerPage'] = maxPerPage;
  if (scrollTop) params['scrollTop'] = scrollTop;
  askAjax(hook, null, params);
}

function askBunchSorted(hook, sortKey, sortOrder) {
  let data = {'start': '0', 'sortKey': sortKey, 'sortOrder': sortOrder},
      adata = getNode(hook)['ajax'];
  // Refresh v_adata.params, being stored in the session storage
  adata.storeInSession();
  // Ajax-refresh the bunch
  askAjax(hook, null, data);
}

function askBunchFiltered(hook, filterKey, filterValue) {
  let value = filterValue;
  if (value === undefined) {
    // The value must be retrieved from a text field
    let filter = document.getElementById(`${hook}_${filterKey}`);
    // Get the filter value
    value = filter.value;
    if (value) {
      // Remove reserved chars and ensure it contains at least 3 chars
      value = encodeURIComponent(value.trim().replace(',','.').replace(':',''));
      if (value.length < 3) {
        filter.style.background = wrongTextInput;
        return;
      }
    }
  }
  // Add this (key,value) pair to filters
  let data = getNode(hook)['ajax'];
  data.params['filters'][filterKey] = value || '';
  // Refresh v_adata.params, being stored in the session storage
  data.storeInSession();
  // Ajax-refresh the bunch
  askAjax(hook, null, {'start': '0'});
}

function askBunchMove(hook, start, id, move){
  let moveTo = move;
  if (typeof move == 'object'){
    // Get the new index from an input field
    let inputId = move.id;
    inputId = inputId.substr(0, inputId.length-4) + '_v';
    let input = document.getElementById(inputId);
    if (isNaN(input.value)) {
      input.style.background = wrongTextInput;
      return;
    }
    moveTo = 'index_' + input.value;
  }
  let data = {'start': start, 'action': 'moveObject', 'tiedId': id,
              'move': moveTo};
  askAjax(hook, null, data);
}

function askBunchSortRef(hook, start, sortKey, reverse) {
  let data = {'start': start, 'action': 'sort', 'sortKey': sortKey,
              'reverse': reverse};
  askAjax(hook, null, data);
}

function askBunchSwitchColset(hook, colset) {
  askAjax(hook, null, {'colset': colset});
}

function askBunchSwitchSearch(hook, name, searchName) {
  let params = {'start': '0'}, key = name + '_view';
  params[key] = searchName;
  askAjax(hook, null, params);
}

function clickOn(node) {
  if (!node) return;
  // If node is a form, disable all form buttons
  if (node.tagName == 'FORM') {
    let part=null;
    // Disable butttons
    for (let i=0; i < node.elements.length; i++) {
      part = node.elements[i];
      if (part.type == 'button') clickOn(part);
    }
    // Disable "clickable" links
    let links = node.getElementsByTagName('a');
    for (let i=0; i < links.length; i++) {
      part = links[i];
      if (part.className == 'clickable') clickOn(part);
    }
    return;
  }
  // Disable any click on p_node to be protected against double-click
  let cn = node.className,
      anim = (cn && (cn.search('buttonIcon') != -1))? 'waiting': 'blinkT',
      acn = `unclickable ${anim}`,
      ncn = (cn)? `${acn} ${cn}`: acn;
  node.className = ncn;
}

function clickPrev(event) {
  /* Simulate a click on p_event.target's neightbour: p_event.target is just a
     companion button. */
  const prev = event.target.previousSibling;
  // Don't do it if v_prev has already been protected against multi-clics
  if (prev.className && prev.className.search('unclickable') != -1) return;
  // Simulate the click
  if (prev.onclick) prev.onclick(event);
  prev.click();
}

function gotoTied(objectUrl, field, numberWidget, total, popup) {
  // Check that the number is correct
  try {
    let number = parseInt(numberWidget.value);
    if (!isNaN(number)) {
      if ((number >= 1) && (number <= total)) {
        goto(`${objectUrl}/${field}/gotoTied?number=${number}&popup=${popup}`,
             true);
      }
      else numberWidget.style.background = wrongTextInput; }
    else numberWidget.style.background = wrongTextInput; }
  catch (err) { numberWidget.style.background = wrongTextInput; }
}

function askField(hook, url, layout, customParams, showChanges, className,mode){
  // Sends an Ajax request for getting the content of any field
  let fieldName = hook.split('_').pop(),
      // layout may define a host layout
      layouts = layout.split(':'),
      params = {'layout': layouts[0], 'showChanges': showChanges || 'False'};
  if (layouts.length > 1) params['hostLayout'] = layouts[1];
  if (customParams){for (let key in customParams) params[key]=customParams[key]}
  url = `${url}/${fieldName}/pxRender`;
  mode = mode || 'GET';
  askAjaxChunk(url, mode, params, hook, null, evalInnerScripts);
}

function switchMode(img) {
  askAjax('searchResults', null, {'resultMode': img.name});
}

function askTimeoutField(hook, params) {
  // Ask a custom field possibly tied to a timeout and having specific params
  let node = findNode(this, hook),
      data = node['ajax'];
  if ('timeoutId' in node) clearTimeout(node['timeoutId']);
  if (params) {
    // Complete parameters with those specified on the Ajax node
    if (data.params) {for (let key in data.params) params[key]=data.params[key]}
  }
  else params = data.params;
  askField(hook, data.url, 'view', params);
}

function setTimeoutField(hook, fun, interval){
  // Set a timeout that will call p_fun, containing a call to m_askTimeoutField
  let node = findNode(this, hook);
  node['timeoutId'] = setTimeout(fun, interval);
}

function clearTimeoutField(hook){
  // Stop the timeout corresponding to p_hook
  let node = findNode(this, hook);
  if ('timeoutId' in node) clearTimeout(node['timeoutId']);
}

function doInlineSave(id, name, url, layout, ask, content, language, cancel){
  /* Ajax-saves p_content of field named p_name (or only the part corresponding
     to p_language if the field is multilingual) on object whose id is
     p_id and whose URL is p_url. After saving it, display the field on
     p_layout. Ask a confirmation before doing it if p_ask is true. */
  let doIt = true;
  if (ask) doIt = confirm(save_confirm);
  let params = {'action': 'storeFromAjax', 'layout': layout};
  if (language) params['languageOnly'] = language;
  let hook = id + '_' + name;
  if (!doIt || cancel) params['cancel'] = 'True';
  else { params['fieldContent'] = encodeURIComponent(content) }
  askAjaxChunk(url + '/' + name + '/pxRender', 'POST', params, hook, null,
               evalInnerScripts);
}

// Gets the value to send to the server for ajax-storing it
function getFieldValue(tag) {
  /* When p_tag is a checkbox, we do not get its value from the companion's
     hidden field, because, at the time this function is called, the "click"
     event that updates this value may not have been triggered yet. */
  if (tag.name.endsWith('_visible')) return (tag.checked)? 'True': 'False';
  /* When p_tag is a hidden textarea, take the value from the preceding, poor,
     div tag. */
  else if (tag.tagName == 'TEXTAREA' && tag.style.display == 'none') {
    return tag.previousSibling.innerHTML;
  }
  else return tag.value;
}

// Triggered by some event, it calls doInlineSave when relevant
function performInlineSave(event) {
  let tag = event.target, cancel=false;
  if (tag.tagName == 'IMG') {
    // Get the original tag
    let parts = tag.id.split('_'),
        name = parts[0];
    cancel = parts[1] == 'cancel';
    tag = document.getElementById(name);
  }
  let obj = tag.obj;
  if (obj.done) return;
  if ((event.type == 'keydown') && (event.keyCode != 13)) return; // CR
  obj.done = true;
  doInlineSave(obj.id, obj.name, obj.url, obj.layout, false, getFieldValue(tag),
               null, cancel);
}

function prepareForAjaxSave(id, objectId, objectUrl, layout, name) {
  // Prepare widget whose ID is p_id for ajax-saving its content
  let tag = getNode(id);
  if (!tag) {
    // A widget made of several input fields (radio or checkboxes)
    let tags = document.getElementsByName(id);
    for (let i=0; i<tags.length; i++)
      prepareForAjaxSave(tags[i].id, objectId, objectUrl, layout, id);
    return;
  }
  // Determine the tag type
  let cr = ['checkbox', 'radio'],
      checkable = cr.includes(tag.type),
      isText = tag.type == 'textarea';
  tag.focus();
  // For input, non-text fields, select all content
  if (!checkable && !isText) tag.select();
  /* Store information on this node. Key "done" is used to avoid saving twice
     (saving is attached to events keydown and blur, see below). */
  tag.obj = {id: objectId, url: objectUrl, done: false, name:name || id,
             layout: layout};
  /* If "save" and "cancel" buttons are there, configure them with the
     appropriate event listeners. Else, configure the tag itself. */
  let save = document.getElementById(id + '_save');
  if (save) {
    let cancel = document.getElementById(id + '_cancel');
    save.addEventListener('click', performInlineSave);
    cancel.addEventListener('click', performInlineSave);
  }
  else {
    tag.addEventListener('keydown', performInlineSave);
    if (checkable) tag.addEventListener('change', performInlineSave);
  }
}

// Used by checkbox widgets for having radio-button-like behaviour
function toggleCheckbox(cb) {
  cb.nextSibling.value = (cb.checked)? 'True': 'False';
}

// Toggle opacity of all elements having p_nodeType within p_node
function toggleOpacity(node, nodeType, css){
  let sNode, className, elements = node.getElementsByTagName(nodeType);
  for (let i=0; i<elements.length; i++){
    sNode = elements[i];
    className = sNode.className || '';
    // If a p_css class is specified, only toggle elements having it
    if (!css || className.includes(css)) {
      // Switch node's opacity (0 to 1 or 1 to 0)
      if (sNode.style.opacity == 0) sNode.style.opacity = 1;
      else sNode.style.opacity = 0;
    }
  }
}
// Shorthand for toggling clickable images' visibility 
function itoggle(img) {toggleOpacity(img, 'img', 'calicon');}

// JS implementation of Python ''.rsplit
function _rsplit(s, delimiter, limit) {
  let elems = s.split(delimiter),
      exc = elems.length - limit;
  if (exc <= 0) return elems;
  // Merge back first elements to get p_limit elements
  let head = '', r = [];
  for (let i=0; i < elems.length; i++) {
    if (exc > 0) { head += elems[i] + delimiter; exc -= 1 }
    else { if (exc == 0) { r.push(head + elems[i]); exc -= 1 }
           else r.push(elems[i]) }
  }
  return r;
}

function splitUnit(value) {
  /* Returns a tuple that extracts, from p_value, the number and its unit;
     ie: splitUnit("30em") returns [30, 'em']. */
  if (Number.isInteger(value)) return [value, 'px']; // The implicit unit
  let number = '', unit = '';
  for (const c of value) {
    if (!isNaN(c) || c == '.') number += c;
    else unit += c;
  }
  return [parseFloat(number), unit];
}

function getCbDataFromCbName(name) {
  /* Returns a 2-tuple (nodeId, cbType) allowing to find checkboxes-related
     data from the p_name of a given checkbox. cbType can be "objs" or "poss".

     p_name may have several forms:
     - for a search in a popup:      <objId>_<refName>_popup_objs
     - for a ref:                    <objId>_<refName>_<cbType>
     - for a search outside a popup: <searchName>_objs
  */
  let parts = name.split('_'), cbType=parts.pop(), id=parts.join('_');
  return [id, cbType];
}

// (Un)checks a checkbox corresponding to a linked object
function toggleCb(checkbox) {
  let name = checkbox.getAttribute('name'),
      parts = getCbDataFromCbName(name),
      hook = parts[0],
      cbType = parts[1],
      // Get the DOM node storing checkbox-related data
      node = document.getElementById(hook),
      // Get the array storing checkbox statuses ~{i_iid: i_insertOrder}~
      statuses = node['_appy_' + cbType + '_cbs'],
      // Get the array semantics
      semantics = node['_appy_' + cbType + '_sem'],
      id = checkbox.value;
  if (semantics == 'unchecked') {
    if (!checkbox.checked) statuses[id] = Object.keys(statuses).length;
    else {if (id in statuses) delete statuses[id]};
  }
  else { // semantics is 'checked'
    if (checkbox.checked) statuses[id] = Object.keys(statuses).length;
    else {if (id in statuses) delete statuses[id]};
  }
}

function findNode(node, id) {
  /* When coming back from the iframe popup, we are still in the context of the
     iframe, which can cause problems for finding nodes. This case can be
     detected by checking node.window. */
  let container = (node.window)? node.window.document: window.parent.document;
  return container.getElementById(id);
}

// Initialise checkboxes of a Ref or Search
function initCbs(id) {
  let parts = getCbDataFromCbName(id),
      hook = parts[0],
      cbType = parts[1],
      // Get the DOM node storing checkbox-related data
      node = getNode(hook, true),
      // Get the array storing checkbox statuses
      statuses = node['_appy_' + cbType + '_cbs'],
      // Get the array semantics
      semantics = node['_appy_' + cbType + '_sem'],
      value = semantics != 'unchecked',
      // Update visible checkboxes
      checkboxes = getElementsHavingName('input', id, true);
  for (let i=0; i < checkboxes.length; i++) {
    if (checkboxes[i].value in statuses) checkboxes[i].checked = value;
    else checkboxes[i].checked = !value;
  }
}

// Toggle all checkboxes of a Ref or Search
function toggleAllCbs(id) {
  let parts = getCbDataFromCbName(id),
      hook = parts[0],
      cbType = parts[1],
      // Get the DOM node storing checkbox-related data
      node = document.getElementById(hook),
      // Empty the array storing checkbox statuses
      statuses = node['_appy_' + cbType + '_cbs'];
  for (let key in statuses) delete statuses[key];
  // Switch the array semantics
  let semAttr = '_appy_' + cbType + '_sem';
  if (node[semAttr] == 'unchecked') node[semAttr] = 'checked';
  else node[semAttr] = 'unchecked';
  // Update the visible checkboxes
  initCbs(id);
}

// Toggle all checkboxes of a Ref or Select rendered on "edit" as checkboxes
function toggleCheckboxes(cb) {
  let name=cb.id.substring(0, cb.id.length-4),
      checkboxes = getElementsHavingName('input', name, true);
  for (let i=0; i < checkboxes.length; i++) {
    checkboxes[i].checked = cb.checked;
  }
}

// Shows/hides a dropdown menu
function toggleDropdown(container, forced, type){
  const dropdown = container.getElementsByClassName('dropdown')[0];
  let val = null, display = type || 'block';
  if (forced) val = forced;
  else val = (dropdown.style.display != display)? display: 'none';
  dropdown.style.display = val;
  if (val != 'none') dropdown.classList.add('fadedIn');
}

function showDropdown(container) {
  const dropdown = container.getElementsByClassName('dropdown')[0];
  dropdown.style.display = 'block';
  dropdown.classList.add('fadedIn');
}

function closeDropdown(container) {
  container.getElementsByClassName('dropdown')[0].style.display = 'none';
}

// Functions used for master/slave relationships between widgets
function getSlaveInfo(slave, infoType) {
  // Returns the appropriate info about slavery, depending on p_infoType
  let masterInfo, cssClasses = slave.className.split(' ');
  // Find the CSS class containing master-related info
  for (let j=0; j < cssClasses.length; j++) {
    if (cssClasses[j].indexOf('slave*') == 0) {
      // Extract, from this CSS class, master name or master values
      masterInfo = cssClasses[j].split('*');
      if (infoType == 'masterName') return masterInfo[1];
      else return masterInfo.slice(2); 
    }
  }
}

function getMasterValues(master) {
  // Returns the list of values that p_master currently has
  let r=null;
  if (master.type == 'checkbox') {
    let value = master.value;
    if (value == 'on') {
      // A single checkbox from a Boolean field
      r = master.checked + '';
      r = r.charAt(0).toUpperCase() + r.substr(1);
      r = [r];
    }
    else {
      // A value from a Select field with render == 'checkbox'
      r = [];
      // "master" is one among several checkboxes. Get them all.
      let checkboxes = document.getElementsByName(master.name);
      for (let i=0; i<checkboxes.length; i++) {
        if (checkboxes[i].checked) r.push(checkboxes[i].value);
      }
    }
  }
  else if (master.type == 'radio') {
    /* Get the selected value among all radio buttons of the group (p_master is
       the first one from this group) */
    let radios = document.getElementsByName(master.name);
    r = [];
    for (let i=0; i < radios.length; i++) {
      if (radios[i].checked) {
        r.push(radios[i].value);
        break;
      }
    }
  }
  else if (master.tagName == 'INPUT') {
    r = master.value;
    if ((r.charAt(0) == '(') || (r.charAt(0) == '[')) {
      // There are multiple values, split it
      let values = r.substring(1, r.length-1).split(',');
      r = [];
      let v;
      for (let i=0; i < values.length; i++){
        v = values[i].replace(' ', '');
        r.push(v.substring(1, v.length-1));
      }
    }
    else r = [r]; // A single value
  }
  else { // SELECT widget
    r = [];
    for (let i=0; i < master.options.length; i++) {
      if (master.options[i].selected) r.push(master.options[i].value);
    }
  }
  return r;
}

function getSlaves(master) {
  // Gets all the slaves of master
  let allSlaves = getElementsHavingName('table', 'slave'),
      r = [],
      masterName = master.attributes['name'].value;
  // Remove leading 'w_' if the master is in a search screen
  if (masterName.indexOf('w_') == 0) masterName = masterName.slice(2);
  if (masterName.endsWith('_visible')) {
    masterName = masterName.replace('_visible', '_hidden');
  }
  let cssClasses, slavePrefix = `slave*${masterName}*`;
  for (let i=0; i < allSlaves.length; i++){
    cssClasses = allSlaves[i].className.split(' ');
    for (let j=0; j < cssClasses.length; j++) {
      if (cssClasses[j].indexOf(slavePrefix) == 0) {
        r.push(allSlaves[i]);
        break;
      }
    }
  }
  return r;
}

// Retrieve form values and validation errors in an array
function getFormData() {
  // Get the Appy or search form
  let forms = document.forms;
  if ((!('appyForm' in forms)) && (!('search' in forms))) return;
  let r = {}, elem=null, name=null, ignore=null,
      f = forms['appyForm'] || forms['search'];
  for (let i=0; i < f.elements.length; i++) {
    elem = f.elements[i];
    name = elem.name;
    if ((name == 'action') || (name == 'referer')) continue;
    if (name.startsWith('w_')) name = name.substr(2);
    // Get v_elem's value if it must not be ignored
    ignore = (elem.type == 'checkbox' || elem.type == 'radio') && !elem.checked;
    if (!ignore) r[name] = elem.value;
  }
  // Then, add error-related info when present
  if (!errors) return r;
  for (let key in errors) r[key + '_error'] = errors[key];
  return r
}

function updateSlaves(master, slave, objectUrl, layoutType, className, ajax){
  /* Given the value(s) in a master field, we must update slave's visibility or
     value(s). If p_slave is given, it updates only this slave. Else, it updates
     all slaves of p_master. */
  let slaves = (slave)? [slave]: getSlaves(master),
      masterValues = getMasterValues(master),
      slaveryValues;
  for (const slave of slaves) {
    slaveryValues = getSlaveInfo(slave, 'masterValues', master.id);
    if (slaveryValues[0] != '+') {
      // Update slaves visibility depending on master values
      let showSlave = false;
      for (let j=0; j < slaveryValues.length; j++) {
        for (let k=0; k < masterValues.length; k++) {
          if (slaveryValues[j] == masterValues[k]) showSlave = true;
        }
      }
      // Is this slave also a master ?
      let subMaster;
      if (!slave) {
        let innerId = slave.id.split('_').pop(),
            innerField = document.getElementById(innerId);
        // Inner-field may be absent (ie, in the case of a group)
        if (innerField && (innerField.className == ('master_' + innerId))) {
          subMaster = innerField;
        }
      }
      // Show or hide this slave
      if (showSlave) {
        // Show the slave
        slave.style.display = '';
        if (subMaster) {
          // Recompute its own slave's visibility
          updateSlaves(subMaster, null, objectUrl, layoutType, className);
        }
      }
      else {
        // Hide the slave
        slave.style.display = 'none';
        if (subMaster && (subMaster.style.display != 'none')) {
          // Hide its own slaves, too
          let subSlaves = getSlaves(subMaster);
          for (let l=0; l < subSlaves.length; l++) {
            subSlaves[l].style.display = 'none';
          }
        }
      }
    }
    else if (ajax) {
      /* Ajax requests are disabled when initializing slaves via m_initSlaves
         below. Update slaves' values depending on master values. */
      let slaveId = slave.id,
          slaveName = slaveId.split('_')[1],
          params = getFormData();
          if (slaveName in params) delete params[slaveName];
          masterName = master.id || master.name;
          if (masterName.startsWith('w_')) masterName = masterName.substr(2);
          params['_master_'] = masterName;
      if (className) params['className'] = className;
      askField(slaveId, objectUrl, layoutType, params, false, className,'POST');
    }
  }
}

function getMaster(name) {
  // Get the master node from its p_name
  let r = document.getElementById(name);
  // Checkboxes are found by name and not by ID
  if (!r) {
    r = document.getElementsByName(name);
    if (r.length > 0) {
      r = r[0]; // Take the first checkbox from the series
      if ((r.type != 'checkbox') && (r.type != 'radio')) r = null;
    }
    else r = null;
  }
  return r;
}

function initSlaves(objectUrl, layoutType) {
  /* When the current page is loaded, we must set the correct state for all
     slave fields. */
  let slaves = getElementsHavingName('table', 'slave'),
      i = slaves.length -1,
      masterName, master;
  while (i >= 0) {
    masterName = getSlaveInfo(slaves[i], 'masterName');
    master = getMaster(masterName);
    // If master is not here, we can't hide its slaves when appropriate
    if (master) updateSlaves(master,slaves[i],objectUrl,layoutType,null,false);
    i -= 1;
  }
}

function setBackCode(hook, id) {
  /* Set, on the iframe popup, info allowing to back from it by ajax-refreshing
     the initiator field having this p_id and being rendered in this p_hook. */
  let popup = getNode('iframePopup', true),
      code = `askField(':${hook}','${siteUrl}/${id}','edit',params,false)`;
  popup.backHook = hook;
  popup.backCode = code;
}

function backFromPopup(id) {
  // Close the iframe popup when required
  const close = readCookie('closePopup');
  if (close == 'no') return;
  // Reset the timer, the cookie and close the popup
  createCookie('closePopup', 'no');
  const popup = closePopup('iframePopup'),
        timer = popup.popupTimer;
  clearInterval(timer);
  if (close != 'yes') {
    // Load a specific URL in the main page
    window.parent.location = atob(close.slice(2,-1));
  }
  else {
    /* Ajax-refresh, on the main page, the node as defined in the popup, or
       execute a custom JS code if specified. */
    const nodeId = popup.backHook,
          backCode = popup.backCode,
          node = (nodeId)? getNode(`:${nodeId}`): null;
    if (node) {
      if (backCode) {
        /* Put p_id as parameter to pass to the back code, if it does not
           correspond to a temp object. */
        const params = (id < 1)? {}: {'selected':id, 'semantics':'checked'};
        eval(backCode);
      }
      else askAjax(`:${nodeId}`);
    }
    else window.parent.location = window.parent.location;
  }
}

function setChecked(f, checkHook) {
  f.checkedIds.value = '';
  f.checkedSem.value = '';
  // Retrieve, on form p_f, the status of checkboxes from p_checkHook
  if (checkHook) {
    // Collect selected objects possibly defined in this hook
    let node = document.getElementById(checkHook);
    if (node && node.hasOwnProperty('_appy_objs_cbs')) {
      f.checkedIds.value = stringFromDict(node['_appy_objs_cbs'], true);
      f.checkedSem.value = node['_appy_objs_sem'];
    }
  }
}

function submitForm(formId, msg, showComment, back, checkHook, visible,
                    yesText, noText) {
  let f = document.getElementById(formId);
  // Initialise the status of checkboxes when appropriate
  if (checkHook) setChecked(f, checkHook);
  if (!msg) {
    /* Submit the form and either refresh the entire page (back is null)
       or ajax-refresh a given part only (p_back corresponds to the id of the
       DOM node to be refreshed. */
    if (back) { askAjax(back, formId); }
    else {
      f.submit();
      if (!visible) clickOn(f);
    }
  }
  else {
    // Ask a confirmation to the user before proceeding
    if (back) {
      let js = "askAjax('" + back + "', '" + formId + "');";
      askConfirm('form-script', formId + '+' + js, msg, showComment,
                 null, null, null, null, visible, yesText, noText); }
    else askConfirm('form', formId, msg, showComment,
                    null, null, null, null, visible, yesText, noText);
  }
}

function onDeleteObject(iid, back, text) {
  let actionType, action;
  if (back) {
    actionType = 'script';
    action = "askAjax('" +back+ "',null,{'action':'" +iid+ '*' + "remove'});";
  }
  else {
    actionType = 'url';
    action = siteUrl + '/' + iid + '/remove';
  }
  askConfirm(actionType, action, text);
}

function onLink(action, url, fieldName, targetId, hook, start, semantics,
                linkList) {
  let params = {'linkAction': action, 'targetId': targetId};
  if (hook && !linkList) params[`${hook}_start`] = start;
  if (semantics) params['semantics'] = semantics;
  if ((action == 'unlink') && !linkList) {
    params['action'] = 'onLink';
    askAjax(hook, null, params);
  }
  else post(`${url}/${fieldName}/onLink`, params);
}

function onLinkMany(action, url, id, start) {
  let parts = getCbDataFromCbName(id),
      hook = parts[0],
      cbType = parts[1],
      // Get the DOM node corresponding to the Ref
      node = document.getElementById(hook),
      // Get the ids of (un-)checked objects
      statuses = node[`_appy_${cbType}_cbs`],
      ids = stringFromDict(statuses, true),
      // Get the array semantics
      semantics = node[`_appy_${cbType}_sem`];
  // Show an error message if no element is selected
  if ((semantics == 'checked') && (len(statuses) == 0)) {
    openPopup('alertPopup', no_elem_selected);
    return;
  }
  // Ask for a confirmation
  const q=quote, elems=hook.split('_'), fieldName=elems.pop(),
        act=`${action}_many`,
        expr=`onLink(${q(act)},${q(url)},${q(fieldName)},${q(ids)},${q(id)},` +
             `${q(start)},${q(semantics)})`;
  askConfirm('script', expr, action_confirm);
}

function onAdd(direction, addForm, objectId) {
  // p_direction can be "before" or "after"
  let f = document.getElementById(addForm);
  f.insert.value = `${direction}.${objectId}`;
  f.submit();
}

function stringFromDict(d, keysOnly, sortByValue) {
  /* Gets a comma-separated string form dict p_d. If p_keysOnly is True, only
     keys are dumped. Else, "key:value" pairs are included. */
  let elem, r = [], v;
  for (let k in d) {
    if (keysOnly) elem = k;
    else {
      v = d[k];
      if (Array.isArray(v)) v = v.join('::');
      elem = `${k}:${v}`;
    }
    r.push(elem);
  }
  if (sortByValue) {
    // Sort the result by using p_d's values as sort key
    r.sort(function cmp(a,b) { return (d[a] > d[b])? 1:-1 });
  }
  return r.join();
}

function updateFileNameStorer(field, storerId) {
  // Get the storer
  let storer = document.getElementById(storerId);
  if (!storer || storer.value) return;
  // Remove file path and extension
  let name = field.value;
  name = name.substr(name.lastIndexOf('\\')+1);
  let i = name.lastIndexOf('.');
  if (i != -1) name = name.substring(0, i);
  storer.value = name;
}

function onUnlockPage(objectUrl, page) {
  const code = `post('${objectUrl}/unlock', {'page':'${page}'})`;
  askConfirm('script', code, action_confirm);
}

function createCookie(name, value, days) {
  let expires = '';
  if (days) {
    let date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    expires = `; expires=${date.toGMTString()}`;
  }
  let v = encodeURIComponent(value);
  document.cookie = `${name}=${v}${expires}; path=/; SameSite=${sameSite}`;
}

function readCookie(name) {
  let nameEQ = name + "=",
      ca = document.cookie.split(';'), c;
  for (let i=0; i < ca.length; i++) {
    c = ca[i];
    while (c.charAt(0)==' ') { c = c.substring(1,c.length); }
    if (c.indexOf(nameEQ) == 0) {
      return decodeURIComponent(c.substring(nameEQ.length,c.length));
    }
  }
  return null;
}

function deleteCookie(name) {
  let expires = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = name + "=; " + expires;
}

function switchImage(img, nameA, nameB) {
  // If p_img is named nameA, its name is switched to nameB and vice versa
  let path = img.src.split('/'),
      last = path.length-1,
      name = path[last],
      future = (name == nameA)? nameB: nameA;
  path[last] = future;
  img.src = path.join('/');
}

function changeImage(img, name) {
  // Changes p_img.src to new image p_name, keeping the same image path
  let path = img.src.split('/');
  path[path.length-1] = name;
  img.src = path.join('/');
  // Return the path to the image
  path.pop();
  return path.join('/');
}

function toggleCookie(cookieId,display,defaultValue,expandIcon,collapseIcon) {
  // What is the state of this boolean (expanded/collapsed) cookie ?
  let state = readCookie(cookieId);
  if ((state != 'collapsed') && (state != 'expanded')) {
    // No cookie yet, create it
    createCookie(cookieId, defaultValue);
    state = defaultValue;
  }
  // The hook is the part of the HTML document that needs to be shown or hidden
  let hook = document.getElementById(cookieId),
      displayValue = 'none',
      newState = 'collapsed',
      image = expandIcon + '.svg';
  if (state == 'collapsed') {
    // Show the HTML zone
    displayValue = display;
    image = collapseIcon + '.svg';
    newState = 'expanded';
  }
  // Update the corresponding HTML element
  hook.style.display = displayValue;
  let img = document.getElementById(cookieId + '_img');
  if (img) changeImage(img, image);
  // Inverse the cookie value
  createCookie(cookieId, newState);
  // For the "appyPortlet" cookie only: change the e-burger(s) visibility
  if (cookieId == 'appyPortlet') {
    let burgers = document.getElementsByClassName('eburger');
    if (burgers.length == 0) return;
    displayValue = (newState == 'collapsed')? 'block': 'none';
    for (let i=0; i<burgers.length; i++) {
      burgers[i].style.display = displayValue;
    }
  }
}

// Set the mask preventing clicking behind the iframe
function setMask() {
  let mask = document.getElementById('iframeMask');
  mask.style.opacity = 0.7;
  mask.style.zIndex = 99;
}

// Functions for opening and closing a popup
function openPopup(popupId, msg, width, height, css, back, commentLabel) {
  // Put the message into the popup
  if (msg) {
    let msgHook = (popupId == 'alertPopup')? 'appyAlertText': 'appyConfirmText',
        confirmElem = document.getElementById(msgHook);
    confirmElem.innerHTML = msg;
  }
  // Set the comment label if defined
  if (commentLabel) {
    let labelHook = document.getElementById('appyCommentLabel');
    if (labelHook) labelHook.innerHTML = commentLabel;
  }
  // Get the popup
  let popup = document.getElementById(popupId),
      frame = popupId == 'iframePopup', // Is it the "iframe" popup ?
      mobile = window.matchMedia(queryMobile).matches, // Mobile device ?
      winW = window.innerWidth, winH = window.innerHeight,
      deltaX = (mobile)? 40: 300, deltaY = (mobile)? 40: 100,
      w = width, h = height;
  // Define height and width
  if (!w || mobile) { w = (frame)? winW - deltaX: null }
  if (!h || mobile) { h = (frame)? winH - deltaY: null }
  /* If width or height is negative, it represents a margin w.r.t the windows'
     inner dimension. */
  if (w && w < 0) w = winW + w;
  if (h && h < 0) h = winH + h;
  // Set popup width and height, expressed in pixels
  if (w) popup.style.width = `${w}px`;
  if (h) popup.style.height = `${h}px`;
  if (frame) {
    // Set the enclosed iframe dimensions and show the mask
    const iframe = document.getElementById('appyIFrame');
    iframe.style.width = `${w-20}px`;
    iframe.style.height = `${h-20}px`;
    if (!mobile) {
      // (Re)position the popup at the center of the screen
      if (popup.style.top) {
        popup.style.top = `${(Math.abs(winH-h)/2.5).toFixed()}px` }
      if (popup.style.left) {
        popup.style.left = `${(Math.abs(winW-w)/2.5).toFixed()}px` }
      // Enable the mask
      setMask();
    }
    popup.backHook = back;
  }
  // Apply the CSS class to the popup
  popup.className = (css)? 'popup ' + css: 'popup';
  // Show the popup
  popup.style.display = 'block';
}

function closePopup(popupId, clean, tryCancel) {
  // Get the popup
  let container = (popupId == 'iframePopup') ?
                  window.parent.document: window.document,
      popup = container.getElementById(popupId);
  // Close the popup
  popup.style.display = 'none';
  // Clean field "clean" if specified
  if (clean) {
    let elem = popup.getElementsByTagName('form')[0].elements[clean];
    if (elem) elem.value = '';
  }
  if (popupId == 'iframePopup') {
    // Try to click on a cancel button if found
    let canceled = false, icontent=null, iframe=null;
    if (tryCancel) {
      iframe = popup.getElementsByTagName('iframe')[0];
      // "contentDocument" may be null if the iframe points to an external site
      icontent = iframe.contentDocument;
      let cancels = (icontent)? icontent.getElementsByName('cancel'): [],
          cancel = (cancels.length > 0)? cancels[0]: null;
      if (cancel && (cancel.tagName == 'A')) {
        cancel.click();
        canceled = true;
      }
    }
    if (!canceled) {
      /* Leave the form silently if we are on an edit page. If the iframe
         pointed to a page from an external site, this action will be blocked by
         the browser. */
      if (icontent) iframe.contentWindow.onbeforeunload = null;
    }
    if (icontent) icontent.removeChild(icontent.documentElement);
    // Hide the mask
    let imask = getNode(':iframeMask');
    imask.style.opacity = 0;
    imask.style.zIndex = 0;
  }
  return popup;
}

function updateAppyMessage(message) {
  // Must the message be fleeting or not ?
  let fleeting = message && message[0] == '*',
      content = (fleeting)? message.substring(1): message,
      zone = getNode(':appyMessageContent').parentNode;
  // Restarting the fader has the effect of cloning the v_zone
  zone = zone.fader.stop(fleeting);
  // Fill the message zone with the message to display
  getNode(':appyMessageContent').innerHTML = content;
  zone.style.display = 'block';
}

// Function triggered when an action needs to be confirmed by the user
function askConfirm(actionType, action, msg, showComment, popupWidth,
                    commentLabel, comment, commentRows, visible,
                    yesText, noText) {
  /* Store the actionType (send a form, call an URL or call a script) and the
     related action, and shows the confirm popup. If the user confirms, we
     will perform the action. If p_showComment is true, an input field allowing
     to enter a comment will be shown in the popup. */
  let confirmForm = document.getElementById('confirmActionForm');
  confirmForm.actionType.value = actionType;
  confirmForm.action.value = action;
  confirmForm.visible.value = visible;
  if (!msg) msg = action_confirm;
  if (!commentLabel) commentLabel = workflow_comment;
  let commentArea = document.getElementById('commentArea');
  if (showComment) commentArea.style.display = 'block';
  else commentArea.style.display = 'none';
  // Initialise the text area
  let area = document.getElementById('popupComment');
  if (comment) {
    area.value = comment.replace(/<br\/>/g, '\n').replace(/&apos;/g, "'");
  }
  else area.value = '';
  area.rows = (commentRows)? commentRows: 3;
  // Change the texts for buttons "Yes" and "No", when requested
  confirmForm.yesBtn.value = yesText || yes;
  confirmForm.noBtn.value = noText || no;
  openPopup('confirmActionPopup', msg, popupWidth, null,null,null,commentLabel);
}

// Get the comment possibly entered by the user on the confirm popup
function getConfirmComment(f) {
  let cfield = f.popupComment, r=null, field=null;
  if (cfield.value) {
    r = cfield.value || '';
  }
  else { // Collect the content of possible additional fields in p_f
    r = {};
    let empty = true;
    for (const field of f.elements) {
      if (field.type == 'text') {
        r[field.name] = field.value || '';
        empty = false;
      }
    }
    r = (empty)? null: JSON.stringify(r);
  }
  cfield.value = '';
  return r;
}

// Function triggered when an action confirmed by the user must be performed
function doConfirm() {
  // The user confirmed: perform the required action
  closePopup('confirmActionPopup');
  let f = document.getElementById('confirmActionForm'),
      actionType = f.actionType.value,
      action = f.action.value,
      visible = f.visible.value == 'true',
      // Get the entered comment and clean it on the confirm form
      comment = getConfirmComment(f),
      elems=null;
  // Tip: for subsequent "eval" statements, "comment" is in the context
  if (actionType == 'form') {
    /* Submit the form whose id is in "action", and transmit him the comment
       from the popup when relevant. */
    f = document.getElementById(action);
    if (comment) f.popupComment.value = comment;
    f.submit();
    if (!visible) clickOn(f);
  }
  else if (actionType == 'url') { goto(action) } // Go to some URL
  else if (actionType == 'script') { eval(action) } // Exec some JS code
  else if (actionType == 'form+script') {
    elems = action.split('+');
    f = document.getElementById(elems[0]);
    // Submit the form in elems[0] and execute the JS code in elems[1]
    if (comment) f.popupComment.value = comment;
    f.submit();
    if (!visible) clickOn(f);
    eval(elems[1]);
  }
  else if (actionType == 'form-script') {
    /* Similar to form+script, but the form must not be submitted. It will
       probably be used by the JS code, so the comment must be transfered. */
    elems = action.split('+');
    f = document.getElementById(elems[0]);
    if (comment) f.popupComment.value = comment;
    eval(elems[1]);
  }
}

// Finally post the edit form after the user confirmation
function postConfirmedEditForm(data) {
  let f = document.getElementById('appyForm');
  f.confirmed.value = 'True';
  if (data) f.confirmedData.value = data;
  submitAppyForm('save', 'main', 'view');
}

// Function that shows or hides a tab. p_action is 'show' or 'hide'.
function manageTab(tabId, action) {
  // Manage the tab content (show it or hide it)
  let show = action == 'show',
      content = document.getElementById('tabcontent_' + tabId);
  content.style.display = (show)? 'table-row': 'none';
  // Manage the tab itself (show as selected or unselected)
  let tab = document.getElementById('tab_' + tabId);
  tab.className = (show)? 'tabCur': 'tab';
}

// Function used for displaying/hiding content of a tab
function showTab(tabId) {
  // 1st, show the tab to show
  manageTab(tabId, 'show');
  // Compute the number of tabs
  let idParts = tabId.split('_');
  // Store the currently selected tab in a cookie
  createCookie('tab_' + idParts[0], tabId);
  // Then, hide the other tabs
  let tabs = document.getElementById('tabs_' + idParts[0]),
      tds = tabs.getElementsByTagName('td'), elem;
  for (let i=0; i<tds.length; i++) {
    elem = tds[i];
    if (elem.id != ('tab_' + tabId)) {
      manageTab(elem.id.substring(4), 'hide');
    }
  }
}

// Function that initializes the state of a tab
function initTab(tabsId, defaultValue, forceDefault) {
  if (forceDefault) {
    // Reset the cookie and use the default value
    createCookie(tabsId, defaultValue);
  }
  let selectedTabId = readCookie(tabsId);
  if (!selectedTabId) { showTab(defaultValue) }
  else {
    /* Ensure the selected tab exists (it could be absent because of field
       visibility settings) */
    let selectedTab = document.getElementById('tab_' + selectedTabId);
    if (selectedTab) { showTab(selectedTabId) }
    else { showTab(defaultValue) }
  }
}

function onSelectDate(cal) {
  let p = cal.params,
      update = (cal.dateClicked || p.electric);
  if (update && p.inputField) {
    let fieldName = cal.params.inputField.id,
        // Update day
        dayValue = cal.date.getDate() + '';
    if (dayValue.length == 1) dayValue = '0' + dayValue;
    let dayField = document.getElementById(fieldName + '_day');
    if (dayField) dayField.value = dayValue;
    // Update month
    let monthValue = (cal.date.getMonth() + 1) + '';
    if (monthValue.length == 1) monthValue = '0' + monthValue;
    document.getElementById(fieldName + '_month').value = monthValue;
    // Update year
    let year = document.getElementById(fieldName + '_year');
    if (!year) {
      // On the search screen, the 'from year' field has a special name
      let yearId = 'w_' + fieldName.split('_')[0];
      year = document.getElementById(yearId);
    }
    year.value = cal.date.getFullYear() + '';
  }
  if (update && p.singleClick && cal.dateClicked) {
    cal.callCloseHandler();
  }
}

function onSelectObjects(popupId, initiatorId, objectUrl, mode, onav,
                         sortKey, sortOrder, filters){
  /* Objects have been selected in a popup, to be linked via a Ref with
     link='popup'. Get them. */
  let node = document.getElementById(popupId),
      uids = stringFromDict(node['_appy_objs_cbs'], true, true),
      semantics = node['_appy_objs_sem'];
  // Show an error message if no element is selected
  if ((semantics == 'checked') && (!uids)) {
    openPopup('alertPopup', no_elem_selected);
    return;
  }
  // Close the popup
  closePopup('iframePopup');
  /* When refreshing the Ref field we will need to pass all those parameters,
     for replaying the popup query. */
  let params = {'selected': uids, 'semantics': semantics,
                'sortKey': sortKey || '', 'sortOrder': sortOrder,
                'filters': filters || ''};
  if (onav) params['nav'] = onav;
  if (mode == 'repl') {
    /* Link the selected objects (and unlink the potentially already linked
       ones) and refresh the Ref edit widget. */
    askField(':'+initiatorId, objectUrl, 'edit', params, false);
  }
  else {
    // Link the selected objects and refresh the Ref view widget
    params['action'] = 'onSelectFromPopup';
    askField(':'+initiatorId, objectUrl, 'view', params, false);
  }
}

function onSelectObject(checkboxId, initiatorId, id, ckNum, onav) {
  // An object has been selected in a popup
  let checkbox = document.getElementById(checkboxId);
  if (ckNum) {
    // The object has been selected from a popup opened by ckeditor
    let imageUrl = `${siteUrl}/${checkbox.value}/file/download`;
    window.opener.CKEDITOR.tools.callFunction(ckNum, imageUrl);
    window.close();
  }
  else {
    /* The object has been selected from a Ref with link="popup[Ref]", in a
       popup displaying search results or objects from another Ref. A single
       object has been clicked. If multiple objects can be selected, simply
       update the corresponding checkbox status. Else, close the popup and
       return the selected object. */
    let checkbox = document.getElementById(checkboxId),
        visible = checkbox.parentNode.className != 'hide';
    // If the td is visible, simply click the checkbox
    if (visible) checkbox.click();
    else {
      /* Close the popup and directly refresh the initiator field with the
         selected object. */
      closePopup('iframePopup');
      let params = {'selected': checkbox.value, 'semantics': 'checked'};
      if (onav) params['nav'] = onav;
      askField(`:${initiatorId}`, `${siteUrl}/${id}`, 'edit', params, false);
    }
  }
}

function onSelectTemplateObject(checkboxId, formName, insert) {
  // Get the form for creating instances of p_className
  let addForm = window.parent.document.forms[formName];
  addForm.template_.value = document.getElementById(checkboxId).value;
  addForm.insert.value = insert;
  closePopup('iframePopup');
  addForm.submit();
}

// Sets the focus on the correct element in some page
function initFocus(pageId){
  const elem = document.getElementById(`${pageId}_title`);
  if (elem) elem.focus();
}

// Functions for making popups draggable
function dragStart(event) {
  // Create a "drag" object to remember the current popup position
  let drag = new Object(),
      popup = event.target,
      popupRect = popup.getBoundingClientRect();
  if (popup.id != 'iframePopup') return;
  // Initialise the popup with absolute positioning
  popup.style.transform = 'none';
  popup.style.position = 'fixed';
  popup.style.top = popupRect.top + 'px';
  popup.style.left = popupRect.left + 'px';
  drag.top = popupRect.top;
  drag.left = popupRect.left;
  // Also remember where the user clicked
  drag.x = event.clientX;
  drag.y = event.clientY;
  drag.enabled = true;
  // Store the drag object in the popup
  popup['drag'] = drag;
}

function dragStop(event) {
  let drag = event.target['drag'];
  if (drag) drag.enabled = false;
}

function dragIt(event) {
  let popup = event.target,
      drag = popup['drag'];
  if (!drag || !drag.enabled) return;
  // Compute the delta with the initial position
  let deltaX = event.clientX - drag.x,
      deltaY = event.clientY - drag.y;
  // Move the popup
  popup.style.left = drag.left + deltaX + 'px';
  popup.style.top = drag.top + deltaY + 'px';
  event.preventDefault();
}

function dragPropose(event) { event.target.style.cursor = 'move' }
