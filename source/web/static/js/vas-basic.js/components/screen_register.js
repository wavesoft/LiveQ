

define(

	/**
	 * Dependencies
	 */
	["jquery", "core/config", "core/registry", "core/base/components", "core/db", "core/ui", "core/user" ],

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/tuning_screen
	 */
	function($, config, R, C, DB, UI, User, LiveQCore) {

		/**
		 * Registration scren
		 */
		var RegisterScreen = function(hostDOM) {
			C.RegisterScreen.call(this, hostDOM);

			// 
			hostDOM.addClass("register");
			/*
			$('<div class="side-left"></div>').appendTo(this.hostDOM);
			var panel = $('<div class="side-right"></div>').appendTo(this.hostDOM);
			*/
			var panel = this.ePanel = $('<div class="side-full panel"></div>').appendTo(this.hostDOM);

			// Setup the registration form
			$('<h1>Register</h1>').appendTo(panel);
			$('<p>Thanks for your interest in the Virtual Atom Smasher game. We are going to need some information from you in order to prepare your profile.</p>').appendTo(panel);

			this.eAlert = $('<div class="alert"></div>').appendTo(panel).hide();

			// FIELD: Username
			$('<div class="row"></div>')
				.append($('<label for="f-username">User name:</label>'))
				.append(this.fUsername = $('<input type="text" id="f-username" />'))
				.append($('<div class="details">The username to use for logging into the game.</div>'))
				.appendTo(panel);

			// FIELD: Display name
			$('<div class="row"></div>')
				.append($('<label for="f-displayname">Display name:</label>'))
				.append(this.fDisplayName = $('<input type="text" id="f-displayname" />'))
				.append($('<div class="details">How everone will see you.</div>'))
				.appendTo(panel);

			// FIELD: E-Mail address
			$('<div class="row"></div>')
				.append($('<label for="f-email">E-Mail:</label>'))
				.append(this.fEmail = $('<input type="text" id="f-email" />'))
				.append($('<div class="details">We will use this e-mail address to send you notifications regarding in-game events.</div>'))
				.appendTo(panel);

			// FIELD: Password
			$('<div class="row"></div>')
				.append($('<label for="f-password1">Password:</label>'))
				.append(this.fPassword1 = $('<input type="password" id="f-password1" />'))
				.appendTo(panel);
			$('<div class="row"></div>')
				.append($('<label for="f-password2">Password (Repeat):</label>'))
				.append(this.fPassword2 = $('<input type="password" id="f-password2" />'))
				.append($('<div class="details">This is your account password. Be careful not to forget it!</div>'))
				.appendTo(panel);

			// FIELD: Birth date
			$('<div class="row"></div>')
				.append($('<label for="f-birth-month">Birth Date:</label>'))
				.append(this.fBirthDay = $('<select id="f-birth-month" />'))
				.append(this.fBirthMonth = $('<select id="f-birth-month" />'))
				.append(this.fBirthYear = $('<select id="f-birth-month" />'))
				.append($('<div class="details">This is the name under everone will see you.</div>'))
				.appendTo(panel);

			// Populate birthdate grid
			for (var i=1; i<=31; i++) {
				$('<option value="'+i+'">'+i+'</option>').appendTo(this.fBirthDay);
			}

			$('<option value="1">January</option>').appendTo(this.fBirthMonth);
			$('<option value="2">February</option>').appendTo(this.fBirthMonth);
			$('<option value="3">March</option>').appendTo(this.fBirthMonth);
			$('<option value="4">April</option>').appendTo(this.fBirthMonth);
			$('<option value="5">May</option>').appendTo(this.fBirthMonth);
			$('<option value="6">June</option>').appendTo(this.fBirthMonth);
			$('<option value="7">July</option>').appendTo(this.fBirthMonth);
			$('<option value="8">August</option>').appendTo(this.fBirthMonth);
			$('<option value="9">September</option>').appendTo(this.fBirthMonth);
			$('<option value="10">October</option>').appendTo(this.fBirthMonth);
			$('<option value="11">November</option>').appendTo(this.fBirthMonth);
			$('<option value="12">December</option>').appendTo(this.fBirthMonth);

			var y = new Date().getFullYear();
			for (var i=y-100; i<=y; i++) {
				var s = $('<option value="'+i+'">'+i+'</option>').appendTo(this.fBirthYear);
				if (i == y-20) s.attr("selected","selected");
			}

			// FIELD: Gender

			$('<div class="row"></div>')
				.append($('<label for="f-gender">I am a:</label>'))
				.append(this.fGender = $('<select id="f-gender" />'))
				.append($('<div class="details">In order to customize the messages for you.</div>'))
				.appendTo(panel);

			$('<option value="guy">Guy</option>').appendTo(this.fGender);
			$('<option value="girl">Girl</option>').appendTo(this.fGender);
			$('<option value="man">Man</option>').appendTo(this.fGender);
			$('<option value="woman">Woman</option>').appendTo(this.fGender);
			$('<option value="unknown">Won\'t tell</option>').appendTo(this.fGender);

			// FIELD: Avatar

			$('<div class="row"></div>')
				.append($('<label for="f-avatar">Avatar:</label>'))
				.append(this.fAvatarList = $('<div class="input avatar-list"></div>'))
				.append($('<div class="details">Pick your favourite avatar.</div>'))
				.appendTo(panel);

			// Populate the avatars table
			var self = this,
				avatars = ['model-1.png', 'model-2.png', 'model-3.png', 'model-4.png', 
				           'model-5.png', 'model-6.png', 'model-7.png'];
			for (var i=0; i<avatars.length; i++) {
				var item = $('<div class="item" style="background-image: url(static/img/avatars/'+avatars[i]+')"></div>')
								.data("avatar", avatars[i])
								.appendTo(this.fAvatarList);
				item.click(function() {
					self.fAvatarList.find(".item").removeClass("selected");
					$(this).addClass("selected");
				});
				if (i == 0) item.addClass("selected");
			}

			// FIELD: Accept to be a research patrtner

			$('<div class="row"></div>')
				.append($('<label for="f-research">Count me in:</label>'))
				.append(this.fResearch = $('<input id="f-research" type="checkbox" checked="checked" value="1" />'))
				.append($('<div class="details">Check the box above if you allow CERN and it\'s partners to collect anonymous information regarding your game experience in order to improve future versions of Virtual Atom Smasher.</div>'))
				.appendTo(panel);

			$('<div class="row"></div>')
				.append(
					$('<div class="input"></div>')
					.append(this.btnRegister = $('<button class="btn-shaded btn-blue btn-lg">Register</button>'))
					.append(this.btnCancel = $('<button class="btn-shaded btn-teal btn-lg">Cancel</button>'))
				)
				.appendTo(panel);

			this.btnCancel.click((function() {
				this.trigger('cancel');
			}).bind(this));
			this.btnRegister.click((function() {
				var profile = this.compileProfile();
				if (!profile) return;
				console.log(profile);
				this.trigger('register', profile);
			}).bind(this));

		}
		RegisterScreen.prototype = Object.create( C.RegisterScreen.prototype );

		/**
		 * Collect all the fields into a profile object
		 */
		RegisterScreen.prototype.onRegistrationError = function(text) {
			this.ePanel.scrollTop(0);
			this.eAlert.html(text);
			this.eAlert.fadeIn();
		}

		/**
		 * Mark particular field as invalid
		 */
		RegisterScreen.prototype.markInvalid = function(field) {
			field.addClass("invalid");
			field.focus();
		}

		/**
		 * Collect all the fields into a profile object
		 */
		RegisterScreen.prototype.compileProfile = function() {
			var profile = {};

			// Reset state
			this.ePanel.find(".invalid").removeClass("invalid");
			this.eAlert.hide();

			// Get obvious fields
			profile.username = this.fUsername.val();
			profile.email = this.fEmail.val();
			profile.gender = this.fGender.val();
			profile.research = this.fResearch.is(":checked");
			profile.displayName = this.fDisplayName.val();

			// Validate e-mail
			var rx_mail = /^\w[-._\w]*\w@\w[-._\w]*\w\.\w{2,3}$/;
			if (!profile.email.match(rx_mail)) {
				this.markInvalid(this.fEmail);
				this.onRegistrationError("The e-mail address is not valid!");
				return null;
			}

			// Validate password
			profile.password = this.fPassword1.val();
			if (this.fPassword2.val() != profile.password) {
				this.markInvalid(this.fPassword2);
				this.onRegistrationError("The passwords do not match!");
				return null;
			}

			// Pick avatar
			profile.avatar = this.fAvatarList.find(".selected").data("avatar");

			// Compile birth date in UNIX timestamp
			profile.birthdate = Date.parse(this.fBirthYear.val() + "-" + this.fBirthMonth.val() + "-" + this.fBirthDay.val()) / 1000;

			return profile;
		};

		// Register screen component on the registry
		R.registerComponent( 'screen.register', RegisterScreen, 1 );

	}

);