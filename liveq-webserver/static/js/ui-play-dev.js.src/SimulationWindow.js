
/**
 * Separate with commas the thousands
 */
function commaThousands(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Simulation window is where the simulation status comes
 */
LiveQ.Play.SimulationWindow = function(host) {

	// Setup progress gauge
	this.gProgress = new JustGage({
		id: "run-g-progress", 
		value: 0,
		min: 0,
		max: 100,
		title: "Progress",
		levelColorsGradient: false,
		label: ""
	});


}
