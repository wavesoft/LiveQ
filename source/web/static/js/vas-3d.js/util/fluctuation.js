
define(["three", "vas-3d/util/metaballs"], 

	function(THREE, Metaballs) {

		/**
		 * Create the Fluctuation class
		 */

		var Fluctuation = function( config ) {

			var cfg = config || {};
			this.isolevel = cfg.isolevel || 0.5;
			this.radius = cfg.radius || 4;
			this.blobs = cfg.blobs || 3;
			this.detail = cfg.detail || 20;
			this.metaballBounds = 3;
			this.color = cfg.color || 0xffff00;
			this.transparent = cfg.transparent || true;

			// Initialize mesh components
			this.geometry = new THREE.Geometry();
			this.material = new THREE.MeshPhongMaterial({
				color: this.color, 
				side: THREE.BackSide, 
				transparent: this.transparent, 
				opacity: 1
			});

			// Initializ metaballs
			this.metaballs = new Metaballs( 
				-this.metaballBounds, this.metaballBounds, this.isolevel, this.detail 
			);

			// Put the metaball blobs
			this.blobStates = [];
			for (var i=0; i<this.blobs; i++) {
				var blob = {
					'v': new THREE.Vector3(0,0,0),
					'q': new THREE.Quaternion( // A random quaternion for 3D rotation
							Math.random(),
							Math.random(),
							Math.random(),
							Math.random()
						).normalize(),
					'ps': Math.max(Math.random(), 0.5)   // Phase shift
				};
				this.metaballs.addBall( blob.v );
				this.blobStates.push(blob);
			}

			// Initialize fluctuation object
			THREE.Object3D.call( this );

		}

		Fluctuation.prototype = Object.create( THREE.Object3D.prototype );

		/**
		 * Regenerate geometry
		 */
		Fluctuation.prototype.regenerate = function() {

			// Remove mesh
			if (this.mesh != null)
				this.remove( this.mesh );

			// Update metaballs
			this.metaballs.updateValues();
			this.geometry = this.metaballs.getGeometry();

			// Regen mesh
			this.mesh = new THREE.Mesh( this.geometry, this.material );
			this.add(this.mesh);

			// Set scale according to radius
			this.mesh.scale.set(
				this.radius/this.metaballBounds,
				this.radius/this.metaballBounds,
				this.radius/this.metaballBounds
			);

		}

		/**
		 * Update fluctuation mesh by setting the position
		 * of the metaballs in the specified phase.
		 */
		Fluctuation.prototype.setPhase = function( phase ) {

			// Update blob metaball states
			var r = this.metaballBounds/2;
			for (var i=0; i<this.blobs; i++) {
				var blob = this.blobStates[i];

				// Calculate position in plane
				blob.v.set(
					Math.cos(phase*blob.ps) * r,
					Math.sin(phase*blob.ps) * r,
					0
				);

				// Apply quaternion to rotate the plane
				// in arbitrary location in space
				blob.v.applyQuaternion(blob.q);

			}

			// Regenerate mesh
			this.regenerate();

		}

		/**
		 * Change fluctuation opacity
		 */
		Fluctuation.prototype.setOpacity = function( opacity ) {
			this.material.opacity = opacity;
		}


		// Return the fluctiation mesh
		return Fluctuation;

	}

);