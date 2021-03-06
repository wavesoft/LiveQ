
/**
 * Controlling class for the tunables pane
 *
 * This class requires the liveq-ui.css class and is tightly bound
 * to the values of it. If you change anything there you must change
 * the css definition for the class here.
 *
 * @param {string} host - The selector class for the element to use as host 
 * 
 */
LiveQ.UI.Tunables = function( host ) {
  this.host = $(host);
  this.parameters = {};
  this.groups = {};
  this.highlightTimer = null;

  // Parameters that must be synchronized with CSS
  this.css = {
    'tunables-sm': 64,
    'tunables-xl': 128,
    'tunables-pad': 5,
    'tunables-sep': 10,
    'animation-ms': 200
  };

  // Reorder on window resize
  var self = this;
  $(window).resize(function() {
    self.reorder();
  });

}

/**
 * Reorder expanded and non-expanded elements
 */
LiveQ.UI.Tunables.prototype.reorder = function() {
  var y=0, x=0, w=this.host.width(), self=this,
      elements = this.host.find(".tune");

  // Prepare element groups
  var groups = { };

  // First walk over the expanded elements, which
  // are independant of group
  elements.each(function(i,e) {

    // Stack expanded elements
    if ($(e).hasClass("expand")) {
      $(e).css({
        "left": 0,
        "top": y
      });
      $(e).attr('data-top', y);
      y += self.css['tunables-xl'] + self.css['tunables-pad'];
    }

  });

  // Separator
  if (y > 0)
    y += self.css['tunables-sep'];

  // Then walk over non-expanded
  elements.each(function(i,e) {
    if (!$(e).hasClass("expand")) {
      $(e).css({
        "left": x,
        "top": y
      });
      $(e).attr('data-top', y);
      x += self.css['tunables-sm'] + self.css['tunables-pad'];
      if ((x+self.css['tunables-sm']) >= w) {
        y += self.css['tunables-sm'] + self.css['tunables-pad'];
        x = 0;
      }
    }
  });

  // Add last element height to calculate element height
  if (x != 0) {
    y += self.css['tunables-sm'] + self.css['tunables-pad'];
  }

  // Update the height of the host
  $(this.host).css("height", y);

}

/**
 * Prepare controller element for the given config.
 *
 * This function creates a controller div (with bound events) and returns it.
 *
 * @param {Object} config - The configuration node for this tunable
 */
LiveQ.UI.Tunables.prototype.createController = function( config ) {
  var self = this,
      elm = $('<div class="tune-ctl"></div>'),
      bPlus = $('<div class="b plus">+</div>'),
      bMinus = $('<div class="b minus">-</div>');

  // Append add/remove
  elm.append(bPlus);
  elm.append(bMinus);

  // Setup spinner
  var spinner = this.spinner = new LiveQ.UI.Spinner( config, function(newValue) {
    
    // Update value
    self.set( config.name, newValue );

  });

  // Bind events
  bPlus.click(function(e) {
    e.stopPropagation();
  });
  bPlus.mousedown(function(e) {
    e.stopPropagation();
    spinner.start(1);
  });
  bPlus.mouseup(function(e) {
    e.stopPropagation();
    spinner.stop();
  });

  bMinus.click(function(e) {
    e.stopPropagation();
  });
  bMinus.mousedown(function(e) {
    e.stopPropagation();
    spinner.start(-1);
  });
  bMinus.mouseup(function(e) {
    e.stopPropagation();
    spinner.stop();
  });


  return elm;
}

/**
 * Prepare description element for the given config
 *
 * @param {Object} config - The configuration node for this tunable
 */
LiveQ.UI.Tunables.prototype.createDescription = function( config ) {
  var elm = $('<div class="tune-desc small-body"><h1>' + config.title + '</h1>'+config.desc+'</div>'),
      btnMore = $('<a class="tune-desc-more" href="javascript:;"><span class="glyphicon glyphicon-question-sign"></span></a>');

  elm.append(btnMore);
  elm.click(function(e){ e.stopPropagation(); });
  btnMore.click(function(e) {
    LiveQ.UI.explainations.showPopup(
        '<span class="label label-default">' + config['short'] + '</span> ' + config['title'],
        'help?type=tunable&name=' + config['name'],
        config['url']
      );
  });
  return elm;
}

/**
 * Toggle visibilty of the given element
 *
 * @param {DOMElement} element - The element to bound click events upon
 * @param {Object} config - The configuration node for this tunable
 */
LiveQ.UI.Tunables.prototype.toggle = function( element, config ) {
  var elm = $(element), self = this;

  // Switching to EXPANDED
  if (!elm.hasClass("expand")) {
    var expanded = elm.parent().find("div.tune.expand");

    // Reorder to the last selection
    elm.detach();
    if (expanded.length == 0) {
      this.host.prepend(elm);
    } else {
      elm.insertAfter(expanded.last());          
    }

    // Create controller and description element
    var eCtl = this.createController(config),
        eDesc = this.createDescription(config);

    // Nest elements
    elm.append(eCtl);
    elm.append(eDesc);

    // Delay-apply the class and animation
    setTimeout(function() {
      elm.addClass("expand");
      self.reorder();

      // Scroll to top of the element
      //$('html,body').animate({
      //  scrollTop: self.host.offset().top + parseInt($(elm).attr("data-top"))
      //}, 250);

      // Fire expanded notification
      $(self).trigger('expand', config);

    }, 50);

  } else {
    var nonExpanded = elm.parent().find("div.tune:not(.expand)");

    // Reorder to the top of non-selected
    elm.detach();
    if (nonExpanded.length == 0) {
      this.host.append(elm);
    } else {
      elm.insertBefore(nonExpanded.first());          
    }

    // Delay-apply the class and animation
    setTimeout(function() {
      elm.removeClass("expand");
      self.reorder();

      // Dispose control & description after effect continues
      setTimeout(function() {
        elm.find(".tune-desc").first().detach();
        elm.find(".tune-ctl").first().detach();

        // Fire collapsed event upon completion
        $(self).trigger('collapse', config);

      }, self.css['animation-ms']);

    }, 50);

  }

}

/**
 * Set the value of the given parameter
 *
 * @param {string} parameter - The name of the parameter to update
 * @param {float} value - The value of the parameter
 */
LiveQ.UI.Tunables.prototype.set = function( parameter, value ) {
  var self = this;

  // Get parameter
  var parm = this.parameters[parameter];
  if (parm == undefined) return;

  // Update value to the config
  parm.value = parseFloat(value);
  if (parm.value < parm.min) parm.value = parm.min;
  if (parm.value > parm.max) parm.value = parm.max;

  // Update value to spinner
  this.spinner.value = value;

  // Update value to UI
  var elmVal = parm.element.find("div.value");
  elmVal.html(parm.value.toFixed(parm.dec));

  // Highlight effect
  elmVal.addClass("highlight");
  if (this.highlightTimer != null)
    clearTimeout(this.highlightTimer);
  this.highlightTimer = setTimeout(function() {
    elmVal.removeClass("highlight");
    self.highlightTimer = null;
  }, 250);

  // Let listeners know
  $(this).trigger('change', parm, parameter, value);

}

/**
 * Add a new elemen in the tunables
 */
LiveQ.UI.Tunables.prototype.add = function( config ) {

  // Prepare element
  var self = this,
      elm = $('<div class="tune"></div>'),
      hName = $('<h4>'+config.short+'</h4>'),
      hValue = $('<div class="value">'+config.value.toFixed(config.dec)+'</div>'),
      hInput = $('<input type="text"></div>');

  // Nest elements
  elm.append(hName);
  elm.append(hValue);
  elm.append(hInput);
  hInput.hide();

  // Ensure syntax of config group
  if (!config.group) config.group = "";

  // Register value
  config['element'] = elm;
  this.parameters[config.name] = config;
  this.groups[config.group] = config;

  // Register click handler
  var fireHover = true;
  elm.click(function() { self.toggle(this, config); });
  elm.mouseover(function(){ if (fireHover) { $(self).trigger('hover', config); fireHover = false; } });
  elm.mouseout(function(){ $(self).trigger('hout', config); fireHover = true; });

  // Edit on click
  hValue.click(function(e) {
    if (!elm.hasClass("expand")) return;
    e.stopPropagation();
    hValue.hide();
    hInput.show();
    hInput.focus();

    var value = String(config.value);
    hInput.attr("value", value);
    hInput[0].setSelectionRange(0, value.length);
  });
  hInput.blur(function() {
    hValue.show();
    hInput.hide();
    self.set( config.name, parseFloat(hInput.val()) );
  });
  hInput.click(function(e) {
    e.stopPropagation();
  });
  hInput.keypress(function(e) {
    if (e.keyCode == 13) {
      hValue.show();
      hInput.hide();
      self.set( config.name, parseFloat(hInput.val()) );
    }
  });

  // Append element on host
  this.host.append(elm);
  this.reorder();

}

/**
 * Return the key/value object with the values for all the parameters
 */
LiveQ.UI.Tunables.prototype.getParameters = function() {
  var ans = { };
  $.each(this.parameters, function (k,v) {
    ans[k] = v.value;
  });
  return ans;
}

/**
 * Mark the specified list of tunables 
 */
LiveQ.UI.Tunables.prototype.mark = function( list ) {

  // Remove mark from all elements
  this.host.find("div.tune.mark")
    .removeClass("mark");

  // Lookup config for the list
  for (var i=0; i<list.length; i++) {
    var config = this.parameters[list[i]];
    config.element.addClass("mark");
  }

}

/**
 * Return the DOM to corresponds to the tunable with
 * the given name
 */
LiveQ.UI.Tunables.prototype.getElement = function( tunable ) {
  var parm = this.parameters[parameter];
  if (!parm) return undefined;
  return parm['element'];
}