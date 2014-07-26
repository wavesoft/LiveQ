
define(

	// Requirements
	["core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/home_screen
	 */
	function(config,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var HomeScreen = function( hostDOM ) {
			var self = this;
			C.HomeScreen.call(this, hostDOM);
			hostDOM.addClass("home");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.home", this.backdropDOM);

			// Create foreground DOM
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// Prepare the home menu floater
			this.menuFloater = $('<div class="home-menu"></div>');
			this.foregroundDOM.append(this.menuFloater);

			// Prepare some buttons
			this.menuFloater.append( $('<div class="text-center"><img src="static/img/logo.png" alt="Logo" /><h1>Virtual Atom Smasher</h1><p class="subtitle">Alpha Game Interface</p></div>') );
			this.menuFloater.append(
					$('<a href="#" class="btn btn-default">Explainations Screen</a>')
					.click(function() {
						self.trigger("changeScreen", "screen.explain");
					})
				);
			this.menuFloater.append(
					$('<a href="#" class="btn btn-default">Tuning Screen</a>')
					.click(function() {
						self.trigger("playLevel", 1);
					})
				);
			this.menuFloater.append(
					$('<a href="#" class="btn btn-default">Running Screen</a>')
					.click(function() {
						self.trigger("changeScreen", "screen.running");
					})
				);


			// Prepare topic host
			/*
			this.elmTopicHost = $('<div class="topic-host"></div>');
			this.foregroundDOM.append( this.elmTopicHost );

			var t1 = this.prepareTopic({ 
					'info': {
						'icon': 'static/img/level-icons/remnants.png'
					}, 
					'tasks': [1,2,3,4,5,6,7] 
				}),
				t2 = this.prepareTopic({ 'tasks': [1,2,3,4] });

			t1.addClass('active');
			this.elmTopicHost.append(t1);
			t2.addClass('next');
			this.elmTopicHost.append(t2);
			*/
			

		}
		HomeScreen.prototype = Object.create( C.HomeScreen.prototype );


		/**
		 * Create a topic element
		 */
		/*
		HomeScreen.prototype.prepareTopic = function(data) {
			var elmTopic = $('<div class="topic"></div>'),
				elmHeader = $('<div class="header"></div>'),
				elmTiles = $('<div class="tiles"></div>'),
				elmIcon = $('<div class="icon"></div>');

			// Nest elements
			elmTopic.append( elmHeader );
			elmTopic.append( elmTiles );
			elmTopic.append( elmIcon );

			// Setup elements
			if (data['info'] != undefined) {
				if (data['info']['name']) elmHeader.append($('<h1>'+data['info']['name']+'</h1>'));
				if (data['info']['desc']) elmHeader.append($('<p>'+data['info']['desc']+'</p>'));
				if (data['info']['icon']) elmIcon.css({ 'background-image': data['info']['icon'] });
			}

			// Prepare tasks
			for (var i=0; i<data['tasks'].length; i++) {
				var elmTile = $('<div class="tile"></div>'),
					elmLabel = $('<div class="label"></div>'),
					elmLock = $('<div class="lock"></div>');

				elmTile.append( elmLabel );
				elmTile.append( elmLock );
				elmTiles.append( elmTile );
			}

			return elmTopic;
		}
		*/

		/**
		 * Re-align menu on position
		 */
		HomeScreen.prototype.onResize = function(w,h) {
			var fw = this.menuFloater.width(),
				fh = this.menuFloater.height();

			// Re-center 
			this.menuFloater.css({
				'left': (w-fw)/2,
				'top': (h-fh)/2,
			});
		}

		// Register home screen
		R.registerComponent( "screen.home", HomeScreen, 1 );

	}

);