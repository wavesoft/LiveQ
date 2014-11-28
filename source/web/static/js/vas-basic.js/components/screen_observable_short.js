
define(

	// Requirements
	["core/registry", "core/base/components", "core/db"],

	/**
	 * Basic version of the globe backdrop
	 *
	 * @exports basic/components/backdrop_globe
	 */
	function(R,C,DB) {

		/**
		 * @class
		 * @classdesc The basic globe screen
		 */
		var ObservableScreen = function( hostDOM ) {
			C.ObservableScreen.call(this, hostDOM);

			// Initial metrics
			this.diameter = 250;
			this.observables = [];

			// --------------------------------
			// Prepare the 3D globe widget
			// --------------------------------

			// Prepare globe DOM
			this.globeDOM = $('<div class="globe"></div>').appendTo(hostDOM);

			// Add globe background
			this.bgGlobe = $('<div class="bg-globe"></div>').appendTo(hostDOM);

			// Create globe
			this.globe = R.instanceComponent( "widget.globe3d", this.globeDOM );
			if (!this.globe) {
				console.warn("Unable to instantiate Glob3D widget");
			} else {
				this.forwardVisualEvents( this.globe );
				this.globe.onResize( this.diameter, this.diameter );
			}
			this.globe.setPaused(true);

			// ------------------------------------
			// Prepare the target zone
			// ------------------------------------

			var n = 10, s = 2*Math.PI/n, a = 0;
			for (var i=0; i<n; i++) {
				this.observables.push( this.createObservable(a, DB.cache['observables'][i]) );
				a += s;
			}


		}
		ObservableScreen.prototype = Object.create( C.ObservableScreen.prototype );

		/**
		 * Create an observable widget
		 */
		ObservableScreen.prototype.createObservable = function( angle, metadata ) {

			// Try to instantiate the observable component
			var e = R.instanceComponent("widget.observable.tuning", this.hostDOM );
			if (!e) {
				console.warn("Unable to instantiate an observable widget!");
				return undefined;
			}

			// Forward visual events
			this.forwardVisualEvents( e );

			// Set pivot configuration for doing this nice
			// circular distribution
			e.setRadialConfig( undefined, undefined, angle );

			// Event: Request for explanation
			e.on('explain', (function(book) {
				this.showBook( book );
			}).bind(this));
			// Event: Pin the observable on screen
			e.on('pin', (function(elm) {
				return function() {
					this.pinViewComponent.onHistogramPin( metadata['_id'], metadata );
					this.pinViewComponent.onHistogramUpdate( metadata['_id'], this.histogramData[metadata['_id']] );
					this.expandPinView();
				}
			})(e).bind(this));

			// Set metadata and value
			e.onMetaUpdate( metadata );
			e.onUpdate( undefined );

			return e;
		}

		/**
		 * Calculate metrics according to the minimum dimension given
		 */
		ObservableScreen.prototype.updateMetrics = function( minDistance, rectSize ) {

			// Calculate diameter
			if (minDistance < 400) {
				this.diameter = 80;
			} else if (minDistance < 600) {
				this.diameter = 180;
			} else {
				this.diameter = 250;
			}

			// Update globe
			this.globe.onResize( this.diameter-4, this.diameter-4 );
			this.globeDOM.css({
				'width': this.diameter,
				'height': this.diameter,
				// Border radius of the central element
				'borderRadius': this.diameter,
				'mozBorderRadius': this.diameter,
				'webkitBorderRadius': this.diameter,
				'mzBorderRadius': this.diameter,
			});

			// Calculate radial distances
			var tunableRadius = 24,
				radMin = this.diameter/2 + tunableRadius,
				radMax = rectSize/2 - tunableRadius;

			// Update radial config
			for (var i=0; i<this.observables.length; i++) {
				this.observables[i].setRadialConfig( radMin, radMax );
			}


		}

		/**
		 * Resize and re-center element
		 */
		ObservableScreen.prototype.onResize = function( width, height ) {
			this.width = width;
			this.height = height;

			// Align to the smallest rectangular dimention
			var w,h,l,r;
			if (width < height) {
				w = width; h = width;
				l = 0; t = (height - h)/2;
			} else {
				w = height; h = height;
				t = 0; l = (width - w)/2;
			}

			// Update metrics with the minimum distance
			this.updateMetrics(Math.min(width, height), w);

			// Resize the components taking place
			this.globeDOM.css({
				'left' : l+w/2-this.diameter/2, 
				'top'  : t+h/2-this.diameter/2
			});

			// Resuze the tunable elements
			for (var i=0; i<this.observables.length; i++) {
				this.observables[i].onMove(l, t);
				this.observables[i].onResize(w, h);
			}

			// Resize globe background
			this.bgGlobe.css({
				'left': l,
				'top': t,
				'width': w,
				'height': h,
				// Border-radius
				'borderRadius': w,
				'mozBorderRadius': w,
				'webkitBorderRadius': w,
				'mzBorderRadius': w				
			});


		}

		// Register home screen
		R.registerComponent( "screen.observable.short", ObservableScreen, 1 );

	}

);