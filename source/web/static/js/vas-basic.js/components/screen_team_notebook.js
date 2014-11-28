
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
			hostDOM.addClass("team team-notebook");

			// Team header
			this.eHeader = $('<h1><span class="highlight">Team</span> Shared Notebook</h1><div class="subtitle">Shared notes with your teammates.</div>').appendTo(hostDOM);

			// Team list
			this.eListHost = $('<div class="table-list table-scroll table-lg"></div>').appendTo(hostDOM);
			this.eListTable = $('<table></table>').appendTo(this.eListHost);
			this.eListHeader = $('<thead><tr><th class="col-9">Notes</th><th class="col-3">Options</th></tr></thead>').appendTo(this.eListTable);
			this.eListBody = $('<tbody></tbody>').appendTo(this.eListTable);

			for (var i=0; i<10; i++) {
				this.addMachine({
					'name'   : 'random-user-'+i,
					'status' : 'inactive',
					'contrib': 'Nada'
				});
			}

			// Team switch buttons
			this.btnUsers = $('<button class="p-users btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-user"></span><br />Team</button>').appendTo(hostDOM);
			this.btnMachines = $('<button class="p-machines btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-cog"></span><br />Machines</button>').appendTo(hostDOM);
			this.btnNotebook = $('<button class="p-notebook disabled btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-edit"></span><br />Notebook</button>').appendTo(hostDOM);
			this.btnMessages = $('<button class="p-messages btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-comment"></span><br />Messages</button>').appendTo(hostDOM);
			this.btnInvite = $('<button class="p-edge btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-plus"></span><br />Invite</button>').appendTo(hostDOM);
			this.btnUsers.click((function() {
				this.trigger("changeScreen", "screen.team.people", UI.Transitions.MOVE_LEFT);
			}).bind(this))
			this.btnMachines.click((function() {
				this.trigger("changeScreen", "screen.team.machines", UI.Transitions.MOVE_LEFT);
			}).bind(this))
			this.btnMessages.click((function() {
				this.trigger("changeScreen", "screen.team.messages", UI.Transitions.MOVE_LEFT);
			}).bind(this))
			this.btnInvite.click((function() {
				this.trigger("invite");
			}).bind(this))

		}
		TeamScreen.prototype = Object.create( C.TeamScreen.prototype );

		/**
		 * Add a person in the team screen
		 */
		TeamScreen.prototype.addMachine = function(person) {
			var row = $('<tr></tr>'),
				c1 = $('<td class="col-9"><span class="glyphicon glyphicon-edit"></span> ' + person['name'] + '</td>').appendTo(row),
				c2 = $('<td class="col-3 text-right"></td>').appendTo(row),
				b1 = $('<button class="btn-shaded btn-darkblue"><span class="glyphicon glyphicon-edit"></span> Edit</button>').appendTo(c2);

			// Select on click
			row.click((function() {
				this.eListBody.children("tr").removeClass("selected");
				row.addClass("selected");
			}).bind(this));

			// Populate fields
			this.eListBody.append(row);
		}

		// Register home screen
		R.registerComponent( "screen.team.notebook", TeamScreen, 1 );

	}

);
