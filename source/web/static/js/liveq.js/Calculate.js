define(

	// Dependencies
	[ 'liveq/HistogramData' ], 

	/**
	 * This class contains the math functions that are used to calculate
	 * various metrics on the histograms.
	 *
 	 * @exports liveq/Calculate
	 */
	function( HistogramData ) {

		/**
		 * This namespace contains the math functions that are used to calculate
		 * various metrics on the histograms.
		 *
		 * @namespace
		 */
		var Calculate = { };

		/**
		 * Calculate the Per-bin Chi2 value between the given histograms
		 *
		 * @param {LiveQ.HistogramData} histoTheory - First histogram
		 * @param {LiveQ.HistogramData} histoData - Second histogram
		 * @params {float} uncertainty - The blanket uncertainty of the theory data (default 5%)
		 * @returns {Array} The chi-squared error for per bin
		 */
		Calculate.chi2Bins = function(histoTheory, histoData, uncertainty) {

			// Ensure equal bins
			if (histoData.bins != histoTheory.bins) 
				return null;

			// Prepare chi2 per bin and average
			var perBin = [];

			// Put default value to uncertainty
			if (!uncertainty) uncertainty=0.05;

			// Handle bins
			for (var i=0; i<histoTheory.bins; i++) {

				// Require same bins filled. If data is filled and MC is not filled,
				// we do not know what the chi2 of that bin is. Return error.
				// (b.isEmpty() && !r.isEmpty()) return -1;
				if ((histoTheory.values[i][0] == 0) && (histoData.values[i][0] == 0)) {
					perBin.push(0);
					return null;
				}

				// Skip empty bins (if data is empty but theory is filled, it's ok. We
				// are allowed to plot theory outside where there is data, we just 
				// cannot calculate a chi2 there).
				if ((histoTheory.values[i][0] == 0) || (histoData.values[i][0] == 0)) {
					perBin.push(0);
					continue;
				}

				//
				// compute one element of test statistics:
				//                     (Theory - Data)^2
				// X = --------------------------------------------------------
				//      Sigma_data^2 + Sigma_theory^2 + (uncertainty*Theory)^2
				//
				var theory = histoTheory.values[i][0],
					data = histoData.values[i][0],
					sTheory, sData;

				if (theory > data) {
					sTheory = histoTheory.values[i][2]   // yErrMinus
					sData = histoData.values[i][1] // yErrPlus
				} else {
					sTheory = histoTheory.values[i][1]   // yErrMinus
					sData = histoData.values[i][2] // yErrPlus
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

			// Calculate averages
			return perBin;

		}

		/**
		 * Calculate the overall Chi2 value between the given histograms
		 *
		 * @param {LiveQ.HistogramData} histoTheory - First histogram
		 * @param {LiveQ.HistogramData} histoData - Second histogram
		 * @params {float} uncertainty - The blanket uncertainty of the theory data (default 5%)
		 * @returns {float} The average chi-square error for all the bins
		 */
		Calculate.chi2 = function(histoTheory, histoData, uncertainty) {
			var perBin = Calculate.chi2Bins(histoTheory, histoData, uncertainty),
				avg = 0;

			// Collect the values from all the bins
			for (var i=0; i<perBin.length; i++) {
				avg += perBin[i];
			}

			// Calculate average
			avg /= perBin.length;

			// Return average
			return avg;

		}

		/**
		 * Calculate the overall Chi2 value between the given histograms, including
		 * the error estimate for the experimental error.
		 *
		 * @param {LiveQ.HistogramData} histoTheory - First histogram
		 * @param {LiveQ.HistogramData} histoData - Second histogram
		 * @params {float} uncertainty - The blanket uncertainty of the theory data (default 5%)
		 * @returns {Array} Returns an array with two values: The chi2-error and the chi2-error uncertainty
		 */
		Calculate.chi2WithError = function(histoTheory, histoData, uncertainty) {

			// For each bin:
			//   yN = yMC / yData
			//   eyDenomNhi = yDataUncertaintyHi/yData
			//   eyDenomNlo = yDataUncertaintyLo/yData
			//   eyStatLoN  = MC uncertainty / yData
			//   eyStatHiN  = MC uncertainty / yData
			// Compute chi2 with 5% blanket uncertainty
			// Chi2 is for central MC prediction (with current statistics)
			// Uncertainty on Chi2 is calculated from current MC stat uncertainty.
			// The +/- value used to compute the uncertainty on the chi2 value
			// is multiplied by sigChi2. A conservative default could be 1.645 sigma
			// (corresponding to 90% confidence). For the time being, 1 sigma is used,
			// since that is how people usually interpret a +/- uncertainty.
			// This number could in principle be made user-modifiable.

			// Ensure equal bins
			if (histoData.bins != histoTheory.bins) 
				return null;

			// Prepare chi2 per bin and average
			var sumChi2th5 = 0,
				sumSigma2chi2th5 = 0,
				nPointsChi2 = 0;

			// Put default value to uncertainty
			if (!uncertainty) uncertainty=0.05;

			// Handle bins
			for (var i=0; i<histoTheory.bins; i++) {
				// Values are an array of: [y, y+, y-, x, x+, x-]

				var sigChi2 = 1.0,
					yMC = histoTheory.values[i][0],
					yData = histoData.values[i][0],
					yDataUncertaintyHi = histoData.values[i][1],
					yDataUncertaintyLo = histoData.values[i][2],
					yN = 0;

				// Make sure yData is not zero
				if (yData == 0) {
					console.warn("yData=0 on bin #",i," between: ", histoTheory, histoData);
				} else {
					yN = yMC/yData;
				}

				// Calcuate yN
				var eyDenomNhi = yDataUncertaintyHi / yData,
					eyDenomNlo = yDataUncertaintyLo / yData,
					eyStatLoN  = uncertainty / yData,
					eyStatHiN  = uncertainty / yData;

				// Calculate per-bin values
				if (yN != 0.0) {
					nPointsChi2++;

					var chi2th5 = ( yN > 1.0 )
						? Math.pow(yN - 1.0,2.)/(Math.pow(eyDenomNhi,2.)+Math.pow(0.05*yN,2.))
						: Math.pow(yN - 1.0,2.)/(Math.pow(eyDenomNlo,2.)+Math.pow(0.05*yN,2.));

					var sigma2chi2th5 = ( yN > 1.0 )
						? chi2th5 * 4.*Math.pow(sigChi2*eyStatLoN,2.) / (Math.pow(eyDenomNhi,2.)+Math.pow(0.05,2.))
						: chi2th5 * 4.*Math.pow(sigChi2*eyStatHiN,2.) / (Math.pow(eyDenomNlo,2.)+Math.pow(0.05,2.));

					sumChi2th5       += chi2th5;
					sumSigma2chi2th5 += sigma2chi2th5;
				}

			}

			// Average
			var chi2 = sumChi2th5/nPointsChi2;
			var chi2err = Math.sqrt(sumSigma2chi2th5)/nPointsChi2;

			// Return Chi2 and Chi2-Error
			return [chi2, chi2err];
		}


		/**
		 * Calculate a ratio histogram values between the theoretical an data histogram
		 *
		 * @param {LiveQ.HistogramData} histoTheory - First histogram
		 * @param {LiveQ.HistogramData} histoData - Second histogram (reference)
		 */
		Calculate.calculateRatioHistogram = function(histoTheory, histoData) {

			// If either empty, return empty histogram
			if (histoTheory.empty || histoData.empty) 
				return new HistogramData();

			// Go through the values and calculate the ratio
			var values = [];
			for (var i=0; i<histoTheory.values.length; i++) {

				// Values are an array of: [y, y+, y-, x, x+, x-]
				var b = histoTheory.values[i],
					r = histoData.values[i],
					x = 0, xErrPlus = 0, xErrMinus = 0,
					y = 0, yErrPlus = 0, yErrMinus = 0;

				if (!b[0] || !r[0]) continue; // skip empty bins

				// Calculate values
				x = b[3]; y = b[0] / r[0];
				yErrPlus = Math.abs( b[1] / r[0] );
				yErrMinus = Math.abs( b[2] / r[0] );
				xErrPlus = 0; xErrMinus = 0;

				// Store values
				values.push([
					y, yErrPlus, yErrMinus,
					x, xErrPlus, xErrMinus
				]);

			}

			// Create a new HistogramData
			var histo = new HistogramData(histoTheory.bins, histoTheory.id);
			histo.values = values;
			histo.empty = false;
			return histo;

		}


		// Return calculation namespace
		return Calculate

	}

);
