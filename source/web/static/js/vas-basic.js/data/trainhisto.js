define(

	// Dependencies
	["d3"], 

	/**
	 * This class provides a helper to generate training histogram information
	 *
 	 * @exports vas-basic/data/trainhisto
	 */
	function(d3) {

		/**
		 * Return gaussian distribution value at the given x position
		 */
		function gaussian(x, config) {

		}

		/**
		 * The default tunable body class
		 */
		var TrainHisto = function(config) {
			var cfg = config || {};

			// Horizontal binning
			if (cfg.xmax == undefined) cfg.xmax = 100;
			if (cfg.xmin == undefined) cfg.xmin = 0;
			if (cfg.bins == undefined) cfg.bins = 10;

			// Error mappping
			if (cfg.errmax == undefined) cfg.errmax = 0.5;
			if (cfg.errmin == undefined) cfg.errmin = 0.05;
			if (cfg.errstep == undefined) cfg.errstep = (cfg.errmax - cfg.errmin) / cfg.bins;
			if (cfg.errfluct == undefined) cfg.errfluct = 0.05;

			// Generator
			if (cfg.genDeviation == undefined) cfg.genDeviation = 0.4;
			if (cfg.genMean == undefined) cfg.genMean = Math.log( (Math.random()*0.8 + 0.1)*(cfg.xmax - cfg.xmin) );
			if (cfg.generator == undefined) cfg.generator = d3.random.logNormal( cfg.genMean, cfg.genDeviation ); // d3.random.bates(Math.random() * 20);
			if (cfg.samples == undefined) cfg.samples = 10000;
			if (cfg.fuzziness == undefined) cfg.fuzziness = 1000;

			// Setup axis
			this.x = d3.scale.linear()
				.domain([cfg.xmin, cfg.xmax])
				.range([cfg.xmin, cfg.xmax]);

			// Predefine fluctuation values
			this.flucValues = [];
			for (var i=0; i<cfg.bins; i++) {
				this.flucValues.push( Math.random() * cfg.errfluct );
			}

			// Generate a series of values
			this.values = d3.range(cfg.samples).map(cfg.generator);

			// Apply fuzziness
			for (var i=0; i<cfg.fuzziness; i++) {
				this.values[i] = (Math.random() * (cfg.xmax - cfg.xmin)) + cfg.xmin;
			}

			// Collect statistical data
			this.vmax = 0;
			this.vsum = 0;
			this.variance = 0;
			this.vcount = cfg.samples;
			var histogram = d3.layout.histogram()
				.bins(this.x.ticks(cfg.bins))( this.values );
			for (var i=0; i<cfg.bins; i++) {
				this.vsum += histogram[i].y;
				this.variance += histogram[i].y * histogram[i].y;
				if (histogram[i].y > this.vmax)
					this.vmax = histogram[i].y;
			}
			this.vmean = this.vsum / cfg.bins;

			this.cfg = cfg;

		}

		/**
		 * Get bin definition
		 */
		TrainHisto.prototype.bins = function() {

			var ticks = this.x.ticks(this.cfg.bins),
				bins = [];
			for (var i=0; i<ticks.length-1; i++) {

				var binw = ((this.cfg.xmax - this.cfg.xmin) / this.cfg.bins) * 0.4;

				bins.push([
						0,0,0,
						this.x(ticks[i]), binw, binw
					]);
			}

			return bins;

		}

		/**
		 * Generate a new sample
		 */
		TrainHisto.prototype.gen = function( portion, errScale, errMin, errMax ) {

			// Pick portion
			if (portion == undefined) portion = 1.0;
			if (errMin == undefined) errMin = this.cfg.errmin;
			if (errMax == undefined) errMax = this.cfg.errmax;
			if (errScale == undefined) errScale = 1;

			// Calculate error scaler
			var baseError = (errMax - errMin) * (1.0 - portion) + errMin;

			// Generate a histogram with a subset of the values
			var histogram = d3.layout.histogram()
				.bins(this.x.ticks(this.cfg.bins))
				( this.values.slice( parseInt( (1.0-portion)*this.values.length ) ) );

			// Create the dataset
			var data = [], err = this.cfg.errmax;
			for (var i=0; i<this.cfg.bins; i++) {

				var v = histogram[i].y,
					err = (histogram[i].length * (1 - histogram[i].length / this.vcount )) /2;

				data.push([
						histogram[i].y / this.vmax,
						err * errScale / this.vmax,
						err * errScale / this.vmax,
					]);
				err -= this.cfg.errstep;
			}

			return data;

		}

		/**
		 * Get the chi-squared fit for the given bins
		 */
		TrainHisto.prototype.chi2 = function( portion, errScale, errScaleRef, uncertainty ) {

			// Generate the two bin sets
			var binRef = this.gen( 1.0, errScaleRef ),
				binSim = this.gen(portion, errScale);

			// Prepare chi2 per bin and average
			var perBin = [];

			// Put default value to uncertainty
			if (!uncertainty) uncertainty=0.05;

			// Handle bins
			for (var i=0; i<binRef.length; i++) {

				//
				// compute one element of test statistics:
				//                     (Theory - Data)^2
				// X = --------------------------------------------------------
				//      Sigma_data^2 + Sigma_theory^2 + (uncertainty*Theory)^2
				//
				var theory = binSim[i][0],
					data = binRef[i][0],
					sTheory, sData;

				if (theory > data) {
					sTheory = binSim[i][2]   // yErrMinus
					sData = binRef[i][1] // yErrPlus
				} else {
					sTheory = binSim[i][1]   // yErrMinus
					sData = binRef[i][2] // yErrPlus
				}

				// Calculate nomin & denom 
				var nomin = (theory-data)*(theory-data),
					denom = sData*sData + sTheory*sTheory + (uncertainty*theory)*(uncertainty*theory);

				// Ensure we don't divide by 0
				if (denom == 0) {
					perBin.push(0);
					continue;
				}

				// Calculate bin Chi2
				var X = nomin/denom;
				perBin.push(X);

			}

			// Collect the values from all the bins
			var avg = 0;
			for (var i=0; i<perBin.length; i++) {
				avg += perBin[i];
			}

			// Calculate average
			avg /= perBin.length;

			// Return average
			return avg;

		}

		// Return the class definition
		return TrainHisto;

	}

);