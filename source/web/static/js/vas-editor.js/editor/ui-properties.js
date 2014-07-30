define(

	["jquery", "vas-editor/runtime/timeline", "vas-editor/editor/ui-timeline" ],

	function($, Timeline, TimelineUI) {

		// Local property for creating unique IDs
		var widgetID = 0;

		/**
		 * Interface component for editing the properties of an object
		 */
		var PropertiesUI = function( hostDOM ) {
			this.hostDOM = $(hostDOM);

			this.headerElm = $('<div class="header">&lt;No Selection&gt;</div>');
			this.bodyElm = $('<div class="properties"></div>');
			this.hostDOM.append( this.headerElm );
			this.hostDOM.append( this.bodyElm );

			this.lastPropValues = { };
			this.propMonitor = [ ];
			this.updateCallback = null;

			this.propertyClasses = [
				{
					classType 	: Timeline.Element,
					name		: '<span class="glyphicon glyphicon-picture"></span> Scene Object',
					properties  : [
						{
							prop: 'visible',
							name: 'Visible',
							type: 'bool'
						},
						{
							prop: 'angle',
							name: 'Angle',
							type: 'int'
						},
						{
							prop: 'left',
							name: 'Left',
							type: 'int'
						},
						{
							prop: 'top',
							name: 'Top',
							type: 'int'
						},
						{
							prop: 'scaleX',
							name: 'X-Scale',
							type: 'int'
						},
						{
							prop: 'scaleY',
							name: 'Y-Scale',
							type: 'int'
						},
						{
							prop: 'opacity',
							name: 'Opacity',
							type: 'int'
						},
						{
							prop: 'progression',
							name: 'Progression',
							type: 'int'
						},
						{
							prop: 'strokeWidth',
							name: 'Stroke Width',
							type: 'int'
						},
						{
							prop: 'stroke',
							name: 'Stroke',
							type: 'col'
						},
					]
				},
				{
					classType	: TimelineUI.TweenPropertiesWrapper,
					name 		: '<span class="glyphicon glyphicon-random"></span> Tween',
					properties 	: [
						{
							prop: 'easing',
							name: 'Easing',
							type: 'opt',
							vals: [
								"backIn",
								"backInOut",
								"backOut",
								"bounceIn",
								"bounceInOut",
								"bounceOut",
								"circIn",
								"circInOut",
								"circOut",
								"cubicIn",
								"cubicInOut",
								"cubicOut",
								"elasticIn",
								"elasticInOut",
								"elasticOut",
								"linear",
								"none",
								"quadIn",
								"quadInOut",
								"quadOut",
								"quartIn",
								"quartInOut",
								"quartOut",
								"quintIn",
								"quintInOut",
								"quintOut",
								"sineIn",
								"sineInOut",
								"sineOut"
							]
						},
						{
							prop: 'duration',
							name: 'Duration',
							type: 'int'
						},
						{
							prop: 'elm',
							name: 'Show Properties',
							type: 'sel'
						}
					]
				},
				{
					classType 	: TimelineUI.KeyframeWrapper,
					name		: '<span class="glyphicon glyphicon-screenshot"></span> Keyframe',
					properties  : [
						{
							prop: 'position',
							name: 'Position',
							type: 'int'
						},
						{
							prop: 'elm',
							name: 'Show Properties',
							type: 'sel'
						}
					]
				}
			];

			// Start the property monitor timer
			this.propMonitorTimer = setInterval((function() {
				for (var i=0; i<this.propMonitor.length; i++) {
					var monInfo = this.propMonitor[i],
						v = monInfo.o[ monInfo.p.prop ];

					// On change trigger callback
					if (v != this.lastPropValues[ monInfo.p.name ]) {
						if (monInfo.cb) monInfo.cb( v );
						this.lastPropValues[ monInfo.p.name ] = v;
					}

				}
			}).bind(this), 250);

		}


		/**
		 * Display/Manage the properties of the specified object
		 */
		PropertiesUI.prototype.show = function( obj, updateCallback ) {
			window.o = obj;

			// Reset
			this.lastPropValues = { };
			this.propMonitor = [];
			this.bodyElm.empty();

			// If specified 'true', the callback remains the same
			if (updateCallback !== true)
				this.updateCallback = updateCallback;

			// Show option
			if (!obj) {
				this.headerElm.text('<No Selection>');
				return;
			}

			// Pick property configuration according to class
			for (var i=0; i<this.propertyClasses.length; i++) {
				if (obj instanceof this.propertyClasses[i].classType) {
					var propInfo = this.propertyClasses[i];

					this.headerElm.html( propInfo.name );
					for (var j=0; j<propInfo.properties.length; j++) {
						var prop = propInfo.properties[j], elm;

						if (prop.type == 'int') {
							this.bodyElm.append( this.createTextWidget( obj, prop, true ) );
						} else if (prop.type == 'string') {
							this.bodyElm.append( this.createTextWidget( obj, prop ) );
						} else if (prop.type == 'col') {
							this.bodyElm.append( this.createColorWidget( obj, prop ) );
						} else if (prop.type == 'opt') {
							this.bodyElm.append( this.createOptionsWidget( obj, prop ) );
						} else if (prop.type == 'sel') {
							this.bodyElm.append( this.createButtonWidget( obj, prop ) );
						} else if (prop.type == 'bool') {
							this.bodyElm.append( this.createBooleanWidget( obj, prop ) );
						}

					}

				}
			}

		}

		/**
		 * Wrap widget label/input element into a group item
		 */
		PropertiesUI.prototype.wrapWidgets = function( title, elmInput ) {
			var elmID = 'widget-' + (++widgetID),
				elmGroup = $('<div class="row"></div>'),
				elmLabelDiv = $('<div class="col-xs-4"></div>'),
				elmInputDiv = $('<div class="col-xs-8"></div>')
				elmLabel = $('<label for="'+elmID+'">'+title+'</label>');

			// Assign ID
			elmInput.attr('id', elmID);

			// Nest elements appropriately
			elmLabelDiv.append( elmLabel );
			elmInputDiv.append( elmInput );
			elmGroup.append( elmLabelDiv );
			elmGroup.append( elmInputDiv );

			// Return element group
			return elmGroup;
		}

		/**
		 * Monitor property change
		 */
		PropertiesUI.prototype.monitorChange = function( obj, propInfo, callback ) {
			this.lastPropValues[ propInfo.name ] = obj[ propInfo.prop ];
			this.propMonitor.push({ 'p': propInfo, 'o': obj, 'cb': callback });
			callback( obj[ propInfo.prop ] );
		}

		/**
		 * Create button widget
		 */
		PropertiesUI.prototype.createButtonWidget = function( obj, propInfo ) {
			var btnInput = $('<button class="btn btn-sm btn-primary">'+propInfo.name+'</button>');
			btnInput.click((function() {
				this.show( obj[ propInfo.prop ], true );
			}).bind(this));
			return this.wrapWidgets( "", btnInput );
		}

		/**
		 * Crate a boolean widget
		 */
		PropertiesUI.prototype.createBooleanWidget = function( obj, propInfo ) {
			var boolInput = $('<input type="checkbox">');

			boolInput.change((function(e) {

				// Apply
				if (boolInput.is(":checked")) {
					obj[ propInfo.prop ] = true;
				} else {
					obj[ propInfo.prop ] = false;
				}

				// Fire the change callback
				if (this.updateCallback)
					this.updateCallback();

			}).bind(this));

			this.monitorChange( obj, propInfo, function(v) {
				boolInput.attr("checked", !!v);
			});

			return this.wrapWidgets( propInfo.name, boolInput );
		}

		/**
		 * Create options widget
		 */
		PropertiesUI.prototype.createOptionsWidget = function( obj, propInfo ) {
			var selInput = $('<select class="form-control input-sm"></select>');
			for (var i=0; i<propInfo.vals.length; i++) {
				var e = $('<option></option>');
				e.attr("value", propInfo.vals[i]);
				e.text(propInfo.vals[i]);
				selInput.append(e);
			}

			selInput.change((function() {

				// Apply
				obj[ propInfo.prop ] = selInput.val();

				// Fire the change callback
				if (this.updateCallback)
					this.updateCallback();

			}).bind(this));

			this.monitorChange( obj, propInfo, function(v) {
				selInput.val( v );
			});

			return this.wrapWidgets( propInfo.name, selInput );

		}

		/**
		 * Create a new color property widget
		 */
		PropertiesUI.prototype.createColorWidget = function( obj, propInfo ) {
			var elmCP = $('<div class="cp-small"></div>'),
				elmInput = $('<input type="text" class="form-control input-sm" />');
				elmWrap = $('<div></div>');

			var lockUpdate = true,
				cp = new ColorPicker(
				elmCP[0],
				(function(hex, hsv, rgb) {
					if (lockUpdate) return;

					// Apply
					obj[ propInfo.prop ] = hex;
					console.log(hex, obj[ propInfo.prop ], propInfo.prop);

					// Update text
					elmInput.val( hex );

					// Fire the change callback
					if (this.updateCallback)
						this.updateCallback();

				}).bind(this)
			);

			console.log(window.cp = cp);
			this.monitorChange( obj, propInfo, function(v) {
				cp.setHex( v );
				elmInput.val( v );
			});

			elmInput.blur((function(e) {

				// Apply
				var v = elmInput.val();
				obj[ propInfo.prop ] = v;
				cp.setHex( v );

				// Fire the change callback
				if (this.updateCallback)
					this.updateCallback();

			}).bind(this));

			lockUpdate = true;
			elmWrap.append(elmInput);
			elmWrap.append(elmCP);
			return this.wrapWidgets( propInfo.name, elmWrap );
		}

		/**
		 * Create a new text property widget
		 */
		PropertiesUI.prototype.createTextWidget = function( obj, propInfo, numeric ) {
			var intInput = $('<input type="text" class="form-control input-sm" />');

			this.monitorChange( obj, propInfo, function(v) {
				intInput.val( v );
			});

			intInput.keydown((function(e) {
				if (e.keyCode == 13) {
					e.preventDefault();
					e.stopPropagation();

					// Select all text
					intInput[0].setSelectionRange(0, intInput[0].value.length)

					// Apply
					if (numeric) {
						obj[ propInfo.prop ] = Number(intInput.val());
					} else {
						obj[ propInfo.prop ] = intInput.val();
					}

					// Fire the change callback
					if (this.updateCallback)
						this.updateCallback();

				}
			}).bind(this));

			intInput.blur((function(e) {

				// Apply
				if (numeric) {
					obj[ propInfo.prop ] = Number(intInput.val());
				} else {
					obj[ propInfo.prop ] = intInput.val();
				}

				// Fire the change callback
				if (this.updateCallback)
					this.updateCallback();

			}).bind(this));

			return this.wrapWidgets( propInfo.name, intInput );
		}

		/**
		 * Regenerate timeline using the editable objects
		 */

		return PropertiesUI;

	}

);