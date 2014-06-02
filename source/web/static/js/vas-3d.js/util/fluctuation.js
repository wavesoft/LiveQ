
define(["three", "vas-3d/util/metaballs"], 

	function(THREE, Metaballs) {

		/**
		 * Create the Fluctuation class
		 */

		var Fluctuation = function( radius, blobs, speed, detail, isolevel ) {

			this.isolevel = isolevel || 0.5;
			this.radius = radius || 4;
			this.blobs = blobs || 3;
			this.speed = speed || 1;
			this.detail = detail || 20;
			this.metaballBounds = 3;

			// Initialize mesh components
			this.geometry = new THREE.Geometry();
			this.material = new THREE.MeshLambertMaterial( {color: 0xffffff, side:THREE.DoubleSide} );

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

			// Set scale according to radius
			this.phase = 0;
			this.scale.set(
				this.radius/this.metaballBounds,
				this.radius/this.metaballBounds,
				this.radius/this.metaballBounds
			);

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

		}

		/**
		 * Update fluctuation mesh 
		 */
		Fluctuation.prototype.update = function( timeDelta ) {

			// Update blob metaball states
			var r = this.metaballBounds/2;
			this.phase += this.speed*timeDelta/1000;
			for (var i=0; i<this.blobs; i++) {
				var blob = this.blobStates[i];
				console.log(i, blob);

				// Calculate position in plane
				blob.v.set(
					Math.cos(this.phase*blob.ps) * r,
					Math.sin(this.phase*blob.ps) * r,
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