define(

	["jquery", "vas-editor/runtime/timeline" ],

	function($, Timeline) {

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

						if ((prop.type == 'int') || (prop.type == 'string')) {
							this.bodyElm.append( this.createTextWidget( obj, prop ) );
						} else if (prop.type == 'col') {
							this.bodyElm.append( this.createColorWidget( obj, prop ) );
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
		 * Create a new color property widget
		 */
		PropertiesUI.prototype.createColorWidget = function( obj, propInfo ) {
			var elmCP = $('<div class="cp-small"></div>'),
				elmInput = $('<input type="text" class="form-control input-sm" />');
				elmWrap = $('<div></div>');

			var cp = new ColorPicker(
				elmCP[0],
				(function(hex, hsv, rgb) {

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
				var v = intInput.val();
				obj[ propInfo.prop ] = v;
				cp.setHex( v );

				// Fire the change callback
				if (this.updateCallback)
					this.updateCallback();

			}).bind(this));

			elmWrap.append(elmInput);
			elmWrap.append(elmCP);
			return this.wrapWidgets( propInfo.name, elmWrap );
		}

		/**
		 * Create a new text property widget
		 */
		PropertiesUI.prototype.createTextWidget = function( obj, propInfo ) {
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
					obj[ propInfo.prop ] = intInput.val();

					// Fire the change callback
					if (this.updateCallback)
						this.updateCallback();

				}
			}).bind(this));

			intInput.blur((function(e) {

				// Apply
				obj[ propInfo.prop ] = intInput.val();

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