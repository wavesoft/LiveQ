

define(

	/**
	 * Dependencies
	 */
	["jquery", "core/config", "core/registry", "core/base/component", "core/db", "core/ui", "core/user" ],

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/tuning_screen
	 */
	function($, config, R, Component, DB, UI, User, LiveQCore) {

		/**
		 * Registration scren
		 */
		var RegisterScreen = function(hostDOM) {
			Component.call(this, hostDOM);

			// 
			hostDOM.addClass("register");
			/*
			$('<div class="side-left"></div>').appendTo(this.hostDOM);
			var panel = $('<div class="side-right"></div>').appendTo(this.hostDOM);
			*/
			var panel = $('<div class="panel"></div>').appendTo(this.hostDOM);

			// Setup the registration form
			$('<h1>Register</h1>').appendTo(panel);
			$('<p>Thanks for your interest in the Virtual Atom Smasher game. We are going to need some information from you in order to prepare your profile.</p>').appendTo(panel);

			$('<div class="row">')
				.append($('<label for="f-username">User name:</label>'))
				.append(this.fUsername = $('<input type="text" id="f-username" />'))
				.append($('<div class="details">This is the name under everone will see you.</div>'))
				.appendTo(panel);

			$('<div class="row">')
				.append($('<label for="f-password1">Password:</label>'))
				.append(this.fPassword1 = $('<input type="password" id="f-password1" />'))
				.appendTo(panel);

			$('<div class="row">')
				.append($('<label for="f-password2">Password (Repeat):</label>'))
				.append(this.fPassword2 = $('<input type="password" id="f-password2" />'))
				.append($('<div class="details">This is your account password. Be careful not to forget it!</div>'))
				.appendTo(panel);

			$('<div class="row">')
				.append($('<label for="f-avatar">Avatar:</label>'))
				.append(this.fAvatarList = $('<div class="input avatar-list"></div>'))
				.append($('<div class="details">Pick your favourite avatar.</div>'))
				.appendTo(panel);

			// Populate the avatars table
			var avatars = ['model-1.png', 'model-2.png', 'model-3.png', 'model-4.png', 'model-5.png',
						   'model-6.png', 'model-7.png'];
			for (var i=0; i<avatars.length; i++) {
				var item = $('<div class="item" style="background-image: url(static/img/avatars/'+avatars[i]+')"></div>').appendTo(this.fAvatarList);
				item.click(function() {
					this.fAvatarList.find(".item").removeClass("selected");
					this.addClass("selected");
				});
			}

		}
		RegisterScreen.prototype = Object.create( Component.prototype );


		// Register screen component on the registry
		R.registerComponent( 'screen.register', RegisterScreen, 1 );

	}

);