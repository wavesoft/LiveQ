
define(

	// Requirements
	["core/registry", "core/components", "core/ui"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/nav_mini
	 */
	function(R,C,UI) {

		var ICON_HOME = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAAwAAAAMADO7oxXAAAAAmJLR0QA/4ePzL8AAASiSURBVFjD7VdtTFNXGC4tTr4MrSTb1C0yKLDtz3QzZIEFlyybEWTOSZQ5R4cM3YC5/dhNRJchDFGUAWNTYjPqpKx82Mm4VCgOEaIhQPmsqCBlsIwJMRBGOz609Jzdc+4BLtyGWwj7x3nyPu193of3aU57Lq1ItLpW1+pa0qr0NhwyKCo3/i/Dtc6NCZNmG7DB8ZHbUVrxCo/XeXVprMAKH1ufTFvhE1tnrm7dCo6/Hjh4bwpMgT/u71bEhT00oed/NelfWpHhJc6348Ys43Dcdo32CXaRiEQxm+p/GwfjcGS4NrKY2apKeVuaMcuY1ZFZu0vptMTxZeuNBWZggSNjSaelPjPqHhfVsdEJMzBPt2SXeZoaLNACkeufx6mvLGl8xba+u6NgFHR1hyrcPbmdYKfEt/p6ca9haBg9svhyn8PDCyU3Px00D8NhQOt830BbIxLpg1suNp+veI11RD1XSw8D5GCKcPx+B8dflRnyh8AQGDB/ky7zRUrRU3WJDycZDQ5YauKLnZEW7pp3/O8JpDHAHOdYQPmr9+4MgAHY8SA02l2KA59uLkUKLoYb869iPUR8/O37fayG+DPhgF8kVbGmsX7QD7TXfENc8Culg+72IIULo7FsC/sX0c9X62ZUwS0qkd66ZLL1wm7LibMyOVIKnPUJ3f/2QhPohfO5a7QiSo1P9Huuyq8fTCKtplL9zGI7v7XZ2AW6YENPaIwb3oJiWZ0aKQzssa3mQrEH8m0XH9vR2o+01p7S1+0Ovywpj2kf6wSdoLDSbzu7NdotDXeQshjqG7UB5FO1ubwCKR2W8sNqyYLxGun1vDZbO2yxJGawW6MSlymaR9shA7Aow6ZHpXtV+ASHuf2Y1DrZDttsVcpC7r2q5OW6dgM0gBpT6CfuMvxWe1TkGmwGwKhQgJnHJqsuvcAFH0DxVztv/Yk6NxvUL8zd53+tB/Xg5yq/N13x1hS++HsjUpaCqhrNZrJV3lo9Ui6qAmbuTJcO6jup72R+6HmuU/HeG4/qYB0gJcSzV9UDRTvYebvdMk/qOyO/8JwJ2Obk9awL2bPC8GrrDcgAkBJizlX1VFoIOyVAvH6Dq5vdT9MVSg+Wj7jPBU9yEaWDGICUEM+7OnxUMEBDlUIMQEqI513FCgeoqStg+YgRDrhMaSAGIEVY2RF9OiIhIj4ifv/R5DzNxGx3nuuQcICKyocYgBTmnMaNgWtnj7+/JPlAvo10Oa58+LFwwE+UCvCxJ9Z93r/zU855rfZ8CuEAJaWEGIAU5rAgno8mXY5LCT8SDsilLgA+wnm34Fzanu+gcMB5KgdiAFKYd/ECztOky3HlwA+FA36gsiAGIIWZH5BDky7HlQUPCAd8T52DGIAU5jBeQDZNuhzXOfiBcEAWdQbwwQ/IpO35IoUDso+kQYRTgC2WQ3kBGTTb5brS4Puxwu+Bf+rUt5ABIIWZH3CWJl2OK3Vsa6ADX7vOJJ8EC7GTF5BOL/QkTysy1jnyq2Hfmtgjya0pgylDc3iH98rS1dx+ymBS87snPDc5/NV3g1Tu4yefgVzu5bnQEST1l885fOUe3mvXrP6KXdb6D5CDZ2hqP2zJAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDEwLTAyLTExVDEyOjUwOjE4LTA2OjAwp3AJqwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAwOS0xMC0yMlQyMzozNzoxMC0wNTowMAJwBy8AAAAASUVORK5CYII=";

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var NavMini = function( hostDOM ) {
			C.Nav.call(this, hostDOM);

			// Put the home icon
			var btnHome = $('<a href="javascript:;"><img src="'+ICON_HOME+'" alt="Home" /></a>')
			hostDOM.append(btnHome);

			// When clicked, goto home
			hostDOM.click((function() {

				// Fire the changeScreen event
				this.trigger("changeScreen", "screen.home");

			}).bind(this));

		}
		NavMini.prototype = Object.create( C.Nav.prototype );

		/**
		 * Hide mini-nav when we are on home
		 */
		NavMini.prototype.onPageWillChange = function(from, to) {
			if ((to == "screen.home") || (to == "screen.progress")) {
				this.hostElement.fadeOut();
			} else {
				this.hostElement.fadeIn();
			}
		}

		// Register home screen
		R.registerComponent( "nav.mini", NavMini, 1 );

	}

);