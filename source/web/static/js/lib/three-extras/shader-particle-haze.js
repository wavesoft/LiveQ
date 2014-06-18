
define(["three"], 

	/**
	 * Extend THREE namespace with ParticleHazeShader
	 */
	function(THREE) {

		/**
		 * This shader is used for rendering a fuzzy bi-noise mixup wich visualizes
		 * a particle in an uncertain position.
		 *
		 * @author Ioannis Charalampidis
		 */

		THREE.ParticleHazeShader = {

			uniforms: {

				"tNoise" 	: { type: "t", value: null },
				"tMask"  	: { type: "t", value: null },
				"tDiffuse" 	: { type: "t", value: null },
				"fTime"	 	: { type: "f", value: 0.0 },

				"color"  	: { type: "c", value: new THREE.Color(0xff0000) },
				"opacity" 	: { type: "f", value: 1.0 }

			},

			vertexShader: [

				"varying vec2 vUv;",

				"void main() {",

					"vUv = uv;",
					"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

				"}"

			].join("\n"),

			fragmentShader: [

				"uniform float opacity;",
				"uniform vec3 color;",
				"uniform sampler2D tNoise;",
				"uniform sampler2D tMask;",
				"uniform sampler2D tDiffuse;",
				"uniform float fTime;",
				"varying vec2 vUv;",

				"void main() {",

					// Interleaved patterns
					"vec4 n1 = texture2D( tNoise, mod( fTime + vUv, 1.0 ) );",
					"vec4 n2 = texture2D( tNoise, mod( vUv - fTime, 1.0 ) );",

					// Mask
					"vec4 n3 = texture2D( tMask, vUv);",

					// Calculate brightness of each color
					"float lum1 = (0.2126*n1.r) + (0.7152*n1.g) + (0.0722*n1.b);",
					"float lum2 = (0.2126*n2.r) + (0.7152*n2.g) + (0.0722*n2.b);",
					"float lum3 = (0.2126*n3.r) + (0.7152*n3.g) + (0.0722*n3.b);",

					// Diffuse color
					"vec4 c = texture2D( tDiffuse, vUv );",

					// Apply 
					"gl_FragColor = vec4( c.rgb * color, clamp(lum1+lum2, 0.0, 1.0)*lum3*opacity );",

				"}"

			].join("\n")

		};

	}

);