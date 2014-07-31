define(

	["jquery", "jquery-ui", "fabric", "tweenjs", "core/db", "vas-editor/runtime/hotspots"],

	function($, $ui, fabric, createjs, DB, Hotspots) {

		var lastID = 0;
		
		/**
		 * 
		 */
		var EditableHotspots = function(hostDOM, propertiesDOM) {
			Hotspots.call(this, hostDOM);
			this.propertiesDOM = propertiesDOM;

			window.hs = this;

			this.draggingElm = null;
			this.dragIndex = -1;
			this.dragX = 0;
			this.dragY = 0;
			this.dragSrcX = 0;
			this.dragSrcY = 0;
			this.focusedElement = null;

			// Hotspot element configuration
			this.hsConfig = [];

			// Discard on mouseup
			this.hostDOM.mouseup((function(e) {
				this.draggingElm = null;
			}).bind(this));

			// Handle dragging
			this.hostDOM.mousemove((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.dragMove( e.pageX, e.pageY );
			}).bind(this));

			//
			// Prepare hotspots UI
			//

			this.propertiesDOM.append($('<div class="header"><span class="glyphicon glyphicon-hand-up"></span> Hotspot List</div>'))
			
			// Prepare items list
			this.elmList = $('<ul class="items"></ul>');
			this.propertiesDOM.append(this.elmList);

			// Prepare form host
			var fHost = $('<div class="container"></div>'),
				fForm = $('<form></form>');
				fHost.append(fForm);
				this.propertiesDOM.append(fForm);

			// Prepare edit form
			var row = $('<div class="row"></div>'),
				lLeft = $('<label for="hs-name"></label>'),
				cLeft = $('<div class="col-xs-4"></div>'),
				cRight = $('<div class="col-xs-8"></div>');
				cLeft.append(lLeft);
				row.append(cLeft);
				row.append(cRight);
				fForm.append(row);

			lLeft.text("Name:");
			this.txtLabel = $('<input id="hs-name" type="text" class="form-control input-sm" value="" />');
			cRight.append(this.txtLabel);

			var row = $('<div class="row"></div>'),
				lLeft = $('<label for="hs-short"></label>'),
				cLeft = $('<div class="col-xs-4"></div>'),
				cRight = $('<div class="col-xs-8"></div>');
				cLeft.append(lLeft);
				row.append(cLeft);
				row.append(cRight);
				fForm.append(row);

			lLeft.text("Label:");
			this.txtShort = $('<input id="hs-short" type="text" class="form-control input-sm" value="" />');
			cRight.append(this.txtShort);

			var row = $('<div class="row"></div>'),
				lLeft = $('<label for="hs-book"></label>'),
				cLeft = $('<div class="col-xs-4"></div>'),
				cRight = $('<div class="col-xs-8"></div>');
				cLeft.append(lLeft);
				row.append(cLeft);
				row.append(cRight);
				fForm.append(row);

			lLeft.text("Book ID:");
			this.txtBook = $('<input id="hs-book" type="text" class="form-control input-sm" value="" />');
			cRight.append(this.txtBook);

			// Prepare buttons
			var btnHost = $('<div class="btn-host"></div>');
			this.btnAdd = $('<button class="btn btn-success btn-sm"><span class="glyphicon glyphicon-plus"></span> Add</button>');
			this.btnRemove = $('<button class="btn btn-danger btn-sm"><span class="glyphicon glyphicon-remove"></span></button>');
			this.btnSave = $('<button class="btn btn-default btn-sm pull-right"><span class="glyphicon glyphicon-floppy-disk"></span> Save Changes</button>');
			btnHost.append( this.btnAdd );
			btnHost.append( this.btnRemove );
			btnHost.append( this.btnSave );
			this.propertiesDOM.append( btnHost );

			// Handle button events
			this.btnAdd.click((function(e) {

				// Do some tests
				if (!this.txtLabel.val()) {
					alert("Please specify a name for this hotspot!");
					return;
				}
				if (!this.txtShort.val()) {
					alert("Please specify a short label for this hotspot!");
					return;
				}

				// Add hotspot
				this.addHotspot({
					'x': 50, 'y': 50,
					'label': this.txtLabel.val(),
					'short': this.txtShort.val(),
					'book': this.txtBook.val()
				});

				// Clear fields
				this.txtLabel.val("");
				this.txtShort.val("");
				this.txtBook.val("");

			}).bind(this));
			this.btnRemove.click((function(e) {

				// Validate
				if (this.dragIndex>=0) {

					// Delete items from DOM
					this.hsConfig[this.dragIndex]._listElement.remove();
					this.hotspotElms[this.dragIndex].remove();

					// Remove item configuration
					this.hsConfig.splice(this.dragIndex,1);
					this.hotspotElms.splice(this.dragIndex,1);

					// Unfocus
					this.focusItem(-1);

				}

			}).bind(this));
			this.btnSave.click((function(e) {

				// Validate
				if (this.dragIndex>=0) {

					// Update config
					this.hsConfig[this.dragIndex].label = this.txtLabel.val();
					this.hsConfig[this.dragIndex].short = this.txtShort.val();
					this.hsConfig[this.dragIndex].book = this.txtBook.val();

					// Update List Item
					this.updateLI( this.dragIndex );

					console.log("Update #",this.dragIndex,":",this.hsConfig[this.dragIndex]);

				}

			}).bind(this));

			// Initialize sortables
			$( this.elmList ).sortable({
				'update': (function(e,ui) {

					// Re-order elements based on their y-position
					var orderConfig = [],
						orderElements = [],
						seq = $( this.elmList ).sortable( "toArray" );

					// Use IDs from sortables in order to sort the config
					for (var i=0; i<seq.length; i++) {
						for (var j=0; j<this.hsConfig.length; j++) {
							if (this.hsConfig[j]._id == seq[i]) {
								orderConfig.push(this.hsConfig[j]);
								orderElements.push(this.hotspotElms[j]);
							}
						}
					}

					// Update
					this.hotspotElms = orderElements;
					this.hsConfig = orderConfig;

				}).bind(this)
			});

		}

		// Subclass from Hotspots
		EditableHotspots.prototype = Object.create( Hotspots.prototype );

		/**
		 * Select item
		 */
		EditableHotspots.prototype.focusItem = function( elm ) {

			// Mark item as focused
			for (var i=0; i<this.hsConfig.length; i++) {
				if (i == elm) {
					this.hsConfig[i]._listElement.addClass("active");
				} else {
					this.hsConfig[i]._listElement.removeClass("active");
				}
			}

			// Populate text fields
			if (elm<0){
				this.txtShort.val( "" );
				this.txtLabel.val( "" );
				this.txtBook.val( "" );
			} else {
				this.txtShort.val( this.hsConfig[elm].short );
				this.txtLabel.val( this.hsConfig[elm].label );
				this.txtBook.val( this.hsConfig[elm].book );
			}

		}

		/**
		 * Start dragging an element
		 */
		EditableHotspots.prototype.setActive = function( active ) {
			if (active) {
				this.hostDOM.removeClass("disabled");
			} else {
				this.hostDOM.addClass("disabled");
			}
		}

		/**
		 * Start dragging an element
		 */
		EditableHotspots.prototype.startDrag = function( elm, x, y ) {
			this.draggingElm = elm;
			this.dragSrcX = parseInt( $(elm).css("left") );
			this.dragSrcY = parseInt( $(elm).css("top") );
			this.dragX = x;
			this.dragY = y;
		}

		/**
		 * Handle mouse movement for dragging
		 */
		EditableHotspots.prototype.dragMove = function( x, y ) {
			// Move element bbeing dragged
			if (this.draggingElm != null) {
				var w = $(this.draggingElm).width(),
					h = $(this.draggingElm).height(),
					l = this.dragSrcX + (x - this.dragX),
					t = this.dragSrcY + (y - this.dragY);

				// Update position
				this.draggingElm.css({
					'left': l,
					'top': t
				});

				// Update x/y position
				this.hsConfig[this.dragIndex].x = l+w/2;
				this.hsConfig[this.dragIndex].y = t+h/2;

				console.log("Update #",this.dragIndex,":",this.hsConfig[this.dragIndex]);

			}
		}


		/**
		 * Update entry element
		 */
		EditableHotspots.prototype.updateLI = function( at ) {
			var cfg = this.hsConfig[at];

			// Update label
			cfg._listElement.find(".s-label").text(cfg.label);
			cfg._listElement.find(".s-short").text(cfg.short);

		}

		/**
		 * Override addHotspot in order to handle additional information
		 */
		EditableHotspots.prototype.addHotspot = function( config ) {
			var elm = Hotspots.prototype.addHotspot.call( this, config );

			// Default move cursor
			elm.css({'cursor': 'move'});

			// Setup dragging
			elm.mousedown((function(e) {
				e.preventDefault();
				e.stopPropagation();

				this.dragIndex = -1;
				for (var i=0; i<this.hotspotElms.length; i++) {
					if (elm.is(this.hotspotElms[i])) {
						this.dragIndex = i;
						this.focusItem( i );
						break;
					}
				}

				var ofs = $(elm).offset();
				this.startDrag(elm, e.pageX, e.pageY);
			}).bind(this));

			// Add item reflection
			var listItem = $('<li><span class="glyphicon glyphicon-move"></span> <span class="s-label">'+config.label+'</span> <span class="s-short">'+config.short+'</span></li>');
			this.elmList.append(listItem);
			config._listElement = listItem;
			listItem.mousedown((function(e) {
				for (var i=0; i<this.hotspotElms.length; i++) {
					if (elm.is(this.hotspotElms[i])) {
						this.focusItem( i );
						break;
					}
				}
			}).bind(this));

			// Create an ID for sorted items mapping
			var id = 'sort-elm-' + (++lastID);
			config._id = id;
			listItem.attr('id', id);

			// Update sortable
			$( this.elmList ).sortable('refresh');

			// Store hotspot config
			this.hsConfig.push(config);

			return elm;
		}

		/**
		 * Export to JSON
		 */
		EditableHotspots.prototype.toJSON = function() {
			var ans = [],
				relevantProps = ['x','y','label','short','book'];

			// Collect relevant properties from the configuration
			for (var i=0; i<this.hsConfig.length; i++) {

				// Collect only relevant properties
				var p = {};
				for (var j=0; j<relevantProps.length; j++) {
					p[relevantProps[j]] = this.hsConfig[i][relevantProps[j]];
				}

				// Collect
				ans.push(p);

			}

			// Return them
			return ans;
		}

		// Return hotspots overlay class
		return EditableHotspots;

	}

)