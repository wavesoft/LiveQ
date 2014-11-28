
define(

	// Requirements
	["jquery", "core/db", "core/ui", "core/config", "core/registry", "core/base/components", "core/apisocket"],

	/**
	 * Basic version of the team screen
	 *
	 * @exports basic/components/screem_team
	 */
	function($, DB, UI, config, R,C, API) {

		/**
		 * @class
		 * @classdesc The basic team screen
		 */
		var TeamScreen = function( hostDOM ) {
			C.TeamScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("team team-messages");

			// Team header
			this.eHeader = $('<h1><span class="highlight">Team</span> Messages</h1><div class="subtitle">Private messages and chatting within your team.</div>').appendTo(hostDOM);

			// Team list
			this.eListHost = $('<div class="table-list table-scroll table-lg"></div>').appendTo(hostDOM);
			this.eListTable = $('<table></table>').appendTo(this.eListHost);
			this.eListHeader = $('<thead><tr><th class="col-9">Name</th><th class="col-3">Options</th></tr></thead>').appendTo(this.eListTable);
			this.eListBody = $('<tbody></tbody>').appendTo(this.eListTable);

			for (var i=0; i<10; i++) {
				this.addMessage({
					'name'   : 'random-user-'+i,
					'status' : 'inactive',
					'contrib': 'Nada'
				});
			}

			// Team switch buttons
			this.btnUsers = $('<button class="p-users btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-user"></span><br />Team</button>').appendTo(hostDOM);
			this.btnMachines = $('<button class="p-machines btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-cog"></span><br />Machines</button>').appendTo(hostDOM);
			this.btnNotebook = $('<button class="p-notebook btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-edit"></span><br />Notebook</button>').appendTo(hostDOM);
			this.btnMessages = $('<button class="p-messages disabled btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-comment"></span><br />Messages</button>').appendTo(hostDOM);
			this.btnInvite = $('<button class="p-edge btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-plus"></span><br />Invite</button>').appendTo(hostDOM);
			this.btnUsers.click((function() {
				this.trigger("changeScreen", "screen.team.people", UI.Transitions.MOVE_LEFT);
			}).bind(this))
			this.btnMachines.click((function() {
				this.trigger("changeScreen", "screen.team.machines", UI.Transitions.MOVE_LEFT);
			}).bind(this))
			this.btnNotebook.click((function() {
				this.trigger("changeScreen", "screen.team.notebook", UI.Transitions.MOVE_RIGHT);
			}).bind(this))
			this.btnInvite.click((function() {
				this.trigger("invite");
			}).bind(this))

			// Prepare machine panel
			this.eControls = $('<div class="controls"></div>').appendTo(hostDOM);

		}
		TeamScreen.prototype = Object.create( C.TeamScreen.prototype );

		/**
		 * Add a person in the team screen
		 */
		TeamScreen.prototype.addMessage = function(person) {
			var row = $('<tr></tr>'),
				c1 = $('<td class="col-9"><span class="glyphicon glyphicon-comment"></span> ' + person['name'] + '</td>').appendTo(row),
				c2 = $('<td class="col-3 text-right"></td>').appendTo(row),
				b1 = $('<button class="btn-shaded btn-darkblue"><span class="glyphicon glyphicon-arrow-left"></span> Reply</button>').appendTo(c2),
				b2 = $('<button class="btn-shaded btn-red"><span class="glyphicon glyphicon-trash"></span></button>').appendTo(c2);

			// Select on click
			row.click((function() {
				this.eListBody.children("tr").removeClass("selected");
				row.addClass("selected");
			}).bind(this));

			// Populate fields
			this.eListBody.append(row);
		}

		// Register home screen
		R.registerComponent( "screen.team.messages", TeamScreen, 1 );

	}

);
