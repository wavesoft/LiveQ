
define(["three"],

	function(THREE) {

		/**
		 * Feyman 
		 */
		var FeymanKink = function(diagram,x,y,z) {
			THREE.Vector3.call(this,x,y,z);
			this.diagram = diagram;
		}
		FeymanKink.prototype = Object.create( THREE.Vector3.prototype );

		/**
		 * Add an extra kink on the current link on the feyman diagram
		 */
		FeymanKink.prototype.addKink = function(type) {
			var kink = new FeymanKink(this.diagram, 0, 0, 0);
			this.diagram.lines.push({
				'type': type,
				'from': this,
				'to': kink,
			});
			return kink;
		}

		/**
		 * 
		 */
		var FeymanDiagram = function() {
			THREE.Object3D.call(this);
			this.lines = [];
			this.lineObject = null;
		}
		FeymanDiagram.prototype = Object.create( THREE.Object3D.prototype );

		/**
		 * Add a kink on the feyman diagram
		 */
		FeymanDiagram.prototype.addKink = function(type) {
			return new FeymanKink(this, 0, 0, 0);
		}

		/**
		 * Update the feyman diagram display
		 */
		FeymanDiagram.prototype.update = function() {

			// Remove previous object
			if (this.lineObject)
				this.remove( this.lineObject );

			// Build geometry
			var geometry = new THREE.Geometry();
			for (var i=0; i<this.lines.length; i++) {
				geometry.vertices.push( this.lines[i].from );
				geometry.vertices.push( this.lines[i].to );
			}

			// Prepare material
			var material = new THREE.LineBasicMaterial( { color: 0xff0000, linewidth: 1 } );

			// Build and place mesh
			this.lineObject = new THREE.Line( geometry, material, THREE.LinePieces );
			this.add( this.lineObject );

		}

		// Return feyman diagram class
		return FeymanDiagram;

	}

);