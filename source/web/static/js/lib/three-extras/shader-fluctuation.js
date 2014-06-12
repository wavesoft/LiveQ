
define(["three"], 

	/**
	 * Extend THREE namespace with FluctuationShader
	 */
	function(THREE) {

		/**
		 * This shader is used for rendering particle fluctuations in the 3D View of VAS.
		 *
		 * @author Ioannis Charalampidis
		 */

		THREE.FluctuationShader = {

			defines: {

				"PI": "3.14159265"

			},

			uniforms: {

				// Color to use for the particle haze
				"tSkin" 		: { type: "t", value: null },
				"scale"			: { type: "v2", value: new THREE.Vector2( 1.0, 1.0 ) },
				"rotation"		: { type: "f", 	value: 0.0 },
				"flucMinDiam"	: { type: "f", 	value: 0.5 },
				"flucMaxDiam"	: { type: "f", 	value: 1.0 },

				// Requested position of the partices and their phase differentiator
				// The vector contains the following information: ( angle(x), radius(y), scale(z), speed(w) )
				"vP1"		: { type: "v4", value: new THREE.Vector4( 0.0, 0.25, 1.0, 0.11548 ) },
				"vP2"		: { type: "v4", value: new THREE.Vector4( 1.8, 0.20, 1.0, -0.04357 ) },
				"vP3"		: { type: "v4", value: new THREE.Vector4( 4.0, 0.15, 1.0, 0.59512 ) },
				"vP4"		: { type: "v4", value: new THREE.Vector4( 5.0, 0.22, 1.0, -0.14778 ) },
				"vP5"		: { type: "v4", value: new THREE.Vector4( 6.0, 0.05, 1.0, 0.33154 ) },

				// Time scale for the animation
				"fTime"		: { type: "f", value: 0.0 },
				"fOpacity"	: { type: "f", value: 1.0 }

			},

			vertexShader: [

				'uniform float rotation;',
				'uniform vec2 scale;',
				"varying vec2 vUv;",

				"void main() {",

					"vUv = uv;",

					'vec4 finalPosition;',

					'finalPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );',
					'finalPosition.xy += position.xy * scale;',
					'finalPosition = projectionMatrix * finalPosition;',

					'gl_Position = finalPosition;',

				"}"

			].join("\n"),

			fragmentShader: [

				"uniform vec4 vP1;",
				"uniform vec4 vP2;",
				"uniform vec4 vP3;",
				"uniform vec4 vP4;",
				"uniform vec4 vP5;",

				"uniform float flucMinDiam;",
				"uniform float flucMaxDiam;",

				"uniform float fTime;",
				"uniform float fOpacity;",
				"uniform sampler2D tSkin;",

				"varying vec2 vUv;",

				// Bounding box texel extraction
				"#define tPart01(t) 	 		mix( vec2(0.0,0.0), vec2(0.5,0.5), t )",
				"#define tPart02(t) 	 		mix( vec2(0.5,0.0), vec2(1.0,0.5), t )",
				"#define tBack01(t) 	 		mix( vec2(0.0,0.5), vec2(0.5,1.0), t )",
				"#define tBack02(t) 	 		mix( vec2(0.5,0.5), vec2(1.0,1.0), t )",
				"#define tRotate(t,a)	   	   (mat2( vec2(cos(a), -sin(a)), vec2(sin(a), cos(a)) ) * (t - vec2(0.5,0.5) )) + vec2(0.5,0.5)",

				// Function to check if the texel is within a circle contained
				// in our bounding box
				"#define circleMask(x)	 		distance( x, vec2(0.5,0.5) ) <= 0.5",

				// Blending helpers
				"#define blend_Screen(c1,c2)	(1.0-((1.0-c1.rgb)*(1.0-c2.rgb)))",
				"#define blend_Add(c1,c2)		min(c1.rgb + c2.rgb, 1.0)",
				"#define blend_Multiply(c1,c2)	c1.rgb * c2.rgb",

				// Blending to texelColor
				"#define glc_AlphaBlend(c)		texelColor = mix(texelColor, c, c.a)",
				"#define glc_MultiplyBlend(c)	texelColor = mix(texelColor, vec4(blend_Multiply( texelColor, c), 1.0), c.a)",
				"#define glc_ScreenBlend(c)		texelColor = mix(texelColor, vec4(  blend_Screen( texelColor, c), 1.0), c.a)",
				"#define glc_AddBlend(c)		texelColor = mix(texelColor, vec4(     blend_Add( texelColor, c), 1.0), c.a)",

				"void main() {",

					// Get the current center of all components
					"vec2 comSize = vec2( 0.5, 0.5 );",
					"vec2 comCenter = vec2( 0.5, 0.5 );",
					"vec2 p1Size = comSize * vP1.z * ((sin(fTime*vP1.w*4.0+1.570796325)+1.0)/2.0+0.5);",
					"vec2 p1Edge = vec2( cos(vP1.x + fTime*vP1.w)*vP1.y, sin(vP1.x + fTime*vP1.w)*vP1.y ) + comCenter - p1Size/2.0;",
					"vec2 p2Size = comSize * vP2.z * ((sin(fTime*vP2.w*4.0+1.570796325)+1.0)/2.0+0.5);",
					"vec2 p2Edge = vec2( cos(vP2.x + fTime*vP2.w)*vP2.y, sin(vP2.x + fTime*vP2.w)*vP2.y ) + comCenter - p2Size/2.0;", // + comCenter - comSize/2.0;",
					"vec2 p3Size = comSize * vP3.z * ((sin(fTime*vP3.w*4.0+4.712388975)+1.0)/2.0+0.5);",
					"vec2 p3Edge = vec2( cos(vP3.x + fTime*vP3.w)*vP3.y, sin(vP3.x + fTime*vP3.w)*vP3.y ) + comCenter - p3Size/2.0;",
					"vec2 p4Size = comSize * vP4.z * ((sin(fTime*vP4.w*4.0+4.712388975)+1.0)/2.0+0.5);",
					"vec2 p4Edge = vec2( cos(vP4.x + fTime*vP4.w)*vP4.y, sin(vP4.x + fTime*vP4.w)*vP4.y ) + comCenter - p4Size/2.0;",
					"vec2 p5Size = comSize * vP5.z * ((sin(fTime*vP5.w*4.0+4.712388975)+1.0)/2.0+0.5);",
					"vec2 p5Edge = vec2( cos(vP5.x + fTime*vP5.w)*vP5.y, sin(vP5.x + fTime*vP5.w)*vP5.y ) + comCenter - p5Size/2.0;",

					// Blend them
					"vec4 texel1 = vec4( 0.0, 0.0, 0.0, 0.0 );",
					"if ( all(greaterThanEqual(vUv,p1Edge)) && all(lessThanEqual(vUv,p1Edge+p1Size)) ) {",
						"texel1 = texture2D( tSkin, tPart01( (vUv-p1Edge)/p1Size ) );",
					"}",
					"vec4 texel2 = vec4( 0.0, 0.0, 0.0, 0.0 );",
					"if ( all(greaterThanEqual(vUv,p2Edge)) && all(lessThanEqual(vUv,p2Edge+p2Size)) ) {",
						"texel2 = texture2D( tSkin, tPart02( (vUv-p2Edge)/p2Size ) );",
					"}",
					"vec4 texel3 = vec4( 0.0, 0.0, 0.0, 0.0 );",
					"if ( all(greaterThanEqual(vUv,p3Edge)) && all(lessThanEqual(vUv,p3Edge+p3Size)) ) {",
						"texel3 = texture2D( tSkin, tPart01( (vUv-p3Edge)/p3Size ) );",
					"}",
					"vec4 texel4 = vec4( 0.0, 0.0, 0.0, 0.0 );",
					"if ( all(greaterThanEqual(vUv,p4Edge)) && all(lessThanEqual(vUv,p4Edge+p5Size)) ) {",
						"texel4 = texture2D( tSkin, tPart02( (vUv-p4Edge)/p5Size ) );",
					"}",
					"vec4 texel5 = vec4( 0.0, 0.0, 0.0, 0.0 );",
					"if ( all(greaterThanEqual(vUv,p5Edge)) && all(lessThanEqual(vUv,p5Edge+p5Size)) ) {",
						"texel5 = texture2D( tSkin, tPart01( (vUv-p5Edge)/p5Size ) );",
					"}",

					// Calculate the two blending backgrounds
					// Back1)
					"vec2 backPos = tRotate( vUv, fTime*0.04 );",
					"vec4 texelColor = vec4( 1.0, 1.0, 1.0, 0.0 );",
					"if (circleMask(backPos))",
						"glc_AlphaBlend( texture2D( tSkin, tBack01( backPos ) ) );",
						//"gl_FragColor = texture2D( tSkin, tBack02( backPos ) );",
					//"else",

					// Back2)
					"backPos = tRotate( vUv, -fTime*0.03 );",
					"if (circleMask(backPos))",
						"glc_AlphaBlend( texture2D( tSkin, tBack01( backPos ) ) );",

					//"gl_FragColor.a = gl_FragColor.a  * (((sin(fTime*2.0)+1.0)/2.0)*0.2 + 0.8);",

					// Overlay particle texels
					"glc_ScreenBlend( texel1 );",
					"glc_ScreenBlend( texel2 );",
					"glc_ScreenBlend( texel3 );",
					"glc_ScreenBlend( texel4 );",
					"glc_ScreenBlend( texel5 );",

					// Apply global opacity
					"if (fOpacity*texelColor.a < 0.05) discard;",
					"gl_FragColor = vec4( vec3(1.0,1.0,1.0)*texelColor.xyz, texelColor.a * fOpacity );", // "mix( gl_FragColor, texelColor, fOpacity);",
					
				"}"

			].join("\n")

		};

	}

);