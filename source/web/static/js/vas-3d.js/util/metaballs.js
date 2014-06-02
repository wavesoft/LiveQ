
define(["three", "vas-3d/util/marching-cubes-lookup"], 

	/**
	 * Metaballs utility class
	 *
	 * @exports vas-3d/util/metaballs
	 */
	function(THREE, MC) {

		// The Marching Cubes Algorithm draws an isosurface of a given value.
		// To use this for a Metaballs simulation, we need to:
		// (1) Initialize the domain - create a grid of size*size*size points in space
		// (2) Initialize the range  - a set of values, corresponding to each of the points, to zero.
		// (3) Add 1 to values array for points on boundary of the sphere;
		//       values should decrease to zero quickly for points away from sphere boundary.
		// (4) Repeat step (3) as desired
		// (5) Implement Marching Cubes algorithm with isovalue slightly less than 1.

		/**
		 * Metaballs Class
		 *
		 * @class
		 * @classdesc Metaballs class
		 */
		var Metaballs = function( axisMin, axisMax, isolevel, size ) {
			
			// Fetch and setup configuration
			this.axisMin = axisMin || -5;
			this.axisMax = axisMax || 5;
			this.isolevel = isolevel || 0.5;
			this.size = size || 30;

			// Setup parameters
			var size = this.size,
				size2 = size*size,
				size3 = size*size*size,
				axisMin = this.axisMin,
				axisMax = this.axisMax,
				axisRange = axisMax - axisMin;

			// generate the list of 3D points
			this.points = [];
			for (var k = 0; k < size; k++)
			 for (var j = 0; j < size; j++)
			  for (var i = 0; i < size; i++) {
				var x = axisMin + axisRange * i / (size - 1);
				var y = axisMin + axisRange * j / (size - 1);
				var z = axisMin + axisRange * k / (size - 1);
				this.points.push( new THREE.Vector3(x,y,z) );
			}

			// initialize values
			this.values = [];
			for (var i = 0; i < size3; i++) 
				this.values[i] = 0;

			// initialize ball storage
			this.balls = [];

		};

		/**
		 * Reset the metaball values
		 */
		Metaballs.prototype.reset = function() {
		    for (var i = 0; i < this.values.length; i++)
				this.values[i] = 0;
		}

		/**
		 * Add a metaball to the system
		 * @param {THREE.Vector2} center - The center of the metaball
		 */
		Metaballs.prototype.addBall = function( center ) {
			this.balls.push( center );
		}

		/**
		 * Update metaball values
		 */
		Metaballs.prototype.updateValues = function() {
			this.reset();
			for (var j=0; j<this.balls.length; j++) {
				var center = this.balls[j];
				for (var i = 0; i < this.values.length; i++) {
					var OneMinusD2 = 1.0 - center.distanceToSquared( this.points[i] );
					this.values[i] += Math.exp( -(OneMinusD2 * OneMinusD2) );
				}
			}
		}

		/**
		 * Generate metaball geometry
		 */
		Metaballs.prototype.getGeometry = function( ) {
			
			var size = this.size,
				size2 = size*size,
				size3 = size*size*size,
				isolevel = this.isolevel,
				uvIndex = 0;
			
			// Vertices may occur along edges of cube, when the values at the edge's endpoints
			//   straddle the isolevel value.
			// Actual position along edge weighted according to function values.
			var vlist = new Array(12);
			var vertexIndex = 0;

			// Reset geometry
			var geometry = new THREE.Geometry();
			
			for (var z = 0; z < size - 1; z++)
			for (var y = 0; y < size - 1; y++)
			for (var x = 0; x < size - 1; x++)
			{
				// index of base point, and also adjacent points on cube
				var p    = x + size * y + size2 * z,
					px   = p   + 1,
					py   = p   + size,
					pxy  = py  + 1,
					pz   = p   + size2,
					pxz  = px  + size2,
					pyz  = py  + size2,
					pxyz = pxy + size2;
				
				// store scalar values corresponding to vertices
				var value0 = this.values[ p    ],
					value1 = this.values[ px   ],
					value2 = this.values[ py   ],
					value3 = this.values[ pxy  ],
					value4 = this.values[ pz   ],
					value5 = this.values[ pxz  ],
					value6 = this.values[ pyz  ],
					value7 = this.values[ pxyz ];
				
				// place a "1" in bit positions corresponding to vertices whose
				//   isovalue is less than given constant.
				
				var cubeindex = 0;
				if ( value0 < isolevel ) cubeindex |= 1;
				if ( value1 < isolevel ) cubeindex |= 2;
				if ( value2 < isolevel ) cubeindex |= 8;
				if ( value3 < isolevel ) cubeindex |= 4;
				if ( value4 < isolevel ) cubeindex |= 16;
				if ( value5 < isolevel ) cubeindex |= 32;
				if ( value6 < isolevel ) cubeindex |= 128;
				if ( value7 < isolevel ) cubeindex |= 64;
				
				// bits = 12 bit number, indicates which edges are crossed by the isosurface
				var bits = MC.edgeTable[ cubeindex ];
				
				// if none are crossed, proceed to next iteration
				if ( bits === 0 ) continue;
				
				// check which edges are crossed, and estimate the point location
				//    using a weighted average of scalar values at edge endpoints.
				// store the vertex in an array for use later.
				var mu = 0.5; 
				
				// bottom of the cube
				if ( bits & 1 )
				{		
					mu = ( isolevel - value0 ) / ( value1 - value0 );
					vlist[0] = this.points[p].clone().lerp( this.points[px], mu );
				}
				if ( bits & 2 )
				{
					mu = ( isolevel - value1 ) / ( value3 - value1 );
					vlist[1] = this.points[px].clone().lerp( this.points[pxy], mu );
				}
				if ( bits & 4 )
				{
					mu = ( isolevel - value2 ) / ( value3 - value2 );
					vlist[2] = this.points[py].clone().lerp( this.points[pxy], mu );
				}
				if ( bits & 8 )
				{
					mu = ( isolevel - value0 ) / ( value2 - value0 );
					vlist[3] = this.points[p].clone().lerp( this.points[py], mu );
				}
				// top of the cube
				if ( bits & 16 )
				{
					mu = ( isolevel - value4 ) / ( value5 - value4 );
					vlist[4] = this.points[pz].clone().lerp( this.points[pxz], mu );
				}
				if ( bits & 32 )
				{
					mu = ( isolevel - value5 ) / ( value7 - value5 );
					vlist[5] = this.points[pxz].clone().lerp( this.points[pxyz], mu );
				}
				if ( bits & 64 )
				{
					mu = ( isolevel - value6 ) / ( value7 - value6 );
					vlist[6] = this.points[pyz].clone().lerp( this.points[pxyz], mu );
				}
				if ( bits & 128 )
				{
					mu = ( isolevel - value4 ) / ( value6 - value4 );
					vlist[7] = this.points[pz].clone().lerp( this.points[pyz], mu );
				}
				// vertical lines of the cube
				if ( bits & 256 )
				{
					mu = ( isolevel - value0 ) / ( value4 - value0 );
					vlist[8] = this.points[p].clone().lerp( this.points[pz], mu );
				}
				if ( bits & 512 )
				{
					mu = ( isolevel - value1 ) / ( value5 - value1 );
					vlist[9] = this.points[px].clone().lerp( this.points[pxz], mu );
				}
				if ( bits & 1024 )
				{
					mu = ( isolevel - value3 ) / ( value7 - value3 );
					vlist[10] = this.points[pxy].clone().lerp( this.points[pxyz], mu );
				}
				if ( bits & 2048 )
				{
					mu = ( isolevel - value2 ) / ( value6 - value2 );
					vlist[11] = this.points[py].clone().lerp( this.points[pyz], mu );
				}
				
				// construct triangles -- get correct vertices from triTable.
				var i = 0;
				cubeindex <<= 4;  // multiply by 16... 
				// "Re-purpose cubeindex into an offset into triTable." 
				//  since each row really isn't a row.
				 
				// the while loop should run at most 5 times,
				//   since the 16th entry in each row is a -1.
				while ( MC.triTable[ cubeindex + i ] != -1 ) 
				{
					var index1 = MC.triTable[cubeindex + i];
					var index2 = MC.triTable[cubeindex + i + 1];
					var index3 = MC.triTable[cubeindex + i + 2];
					
					// Add/update vertices one-by-one
					geometry.vertices.push( vlist[index1].clone() );
					geometry.vertices.push( vlist[index2].clone() );
					geometry.vertices.push( vlist[index3].clone() );

					// Add face
					geometry.faces.push(
						new THREE.Face3(vertexIndex, vertexIndex+1, vertexIndex+2)
					);

					// Add missing vertex UVs
					geometry.faceVertexUvs[uvIndex].push( [ 
						new THREE.Vector2(0,0), 
						new THREE.Vector2(0,1), 
						new THREE.Vector2(1,1) 
					]);

					vertexIndex += 3;
					i += 3;
				}
			}
			
			// Merge & compute vertex properties
			geometry.mergeVertices();
			geometry.computeFaceNormals();
			geometry.computeVertexNormals();

		 	// Also return the geometry
			return geometry;

		}


		return Metaballs;

	}

);