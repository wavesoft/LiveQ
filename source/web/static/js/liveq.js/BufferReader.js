
define(
	
	// Dependencies
	[],

	/**
	 * This class contains the math functions that are used to read 
	 * data from a javascript ArrayBuffer in a structured way.
	 *
 	 * @exports liveq/BufferReader
	 */
	function() {

		/**
		 * A helper class, used for keeping track the current reading position
		 * of the input buffer.
		 *
		 * @param {ArrayBuffer} buffer - The input array buffer
		 * @class
		 */
		var BufferReader = function( buffer ) {

			// Store buffer
			this.buffer = buffer;

			// Reset read position
			this.position = 0;

		}

		/**
		 * Fetch a single 8-bit long unsigned integer.
		 * This function will automatic increment the reader position by 1.
		 * @returns {int}
		 */
		BufferReader.prototype.getUint8 = function() {

			// Create buffer
			var buf = new Uint8Array( this.buffer, this.position, 1 );
			// Forward position
			this.position += 1;
			// Return buffer
			return buf[0];

		}

		/**
		 * Fetch a single 16-bit long unsigned integer.
		 * This function will automatic increment the reader position by 2.
		 * @returns {int}
		 */
		BufferReader.prototype.getUint16 = function() {

			// Create buffer
			var buf = new Uint16Array( this.buffer, this.position, 1 );
			// Forward position
			this.position += 2;
			// Return buffer
			return buf[0];

		}

		/**
		 * Fetch a single 32-bit long unsigned integer.
		 * This function will automatic increment the reader position by 4.
		 * @returns {long}
		 */
		BufferReader.prototype.getUint32 = function() {

			// Create buffer
			var buf = new Uint32Array( this.buffer, this.position, 1 );
			// Forward position
			this.position += 4;
			// Return buffer
			return buf[0];

		}


		/**
		 * Fetch a Uint8Array from the current position, up to the
		 * specified length.
		 *
		 * This function will automatic increment the reader position by the specified length
		 *
		 * @param {int} length - The size of the Uint8Array to return (in elements)
		 * @returns {Uint8Array}
		 */
		BufferReader.prototype.getUint8Array = function( length ) {

			// Create buffer
			var buf = new Uint8Array( this.buffer, this.position, length );
			// Forward position
			this.position += length;
			// Return buffer
			return buf;

		}

		/**
		 * Fetch a Uint16Array from the current position, up to the
		 * specified length.
		 *
		 * This function will automatic increment the reader position by the specified length
		 *
		 * @param {int} length - The size of the Uint16Array to return (in elements)
		 * @returns {Uint16Array}
		 */
		BufferReader.prototype.getUint16Array = function( length ) {

			// Create buffer
			var buf = new Uint16Array( this.buffer, this.position, length );
			// Forward position
			this.position += length*2;
			// Return buffer
			return buf;

		}

		/**
		 * Fetch a Uint32Array from the current position, up to the
		 * specified length.
		 *
		 * @param {int} length - The size of the Uint32Array to return (in elements)
		 * @returns {Uint32Array}
		 */
		BufferReader.prototype.getUint32Array = function( length ) {

			// Create buffer
			var buf = new Uint32Array( this.buffer, this.position, length );
			// Forward position
			this.position += length*4;
			// Return buffer
			return buf;

		}
		/**
		 * Fetch a Float32Array from the current position, up to the
		 * specified length.
		 *
		 * @param {int} length - The size of the Float32Array to return (in elements)
		 * @returns {Float32Array}
		 */
		BufferReader.prototype.getFloat32Array = function( length ) {

			// Create buffer
			var buf = new Float32Array( this.buffer, this.position, length );
			// Forward position
			this.position += length*4;
			// Return buffer
			return buf;

		}

		/**
		 * Fetch a Float64Array from the current position, up to the
		 * specified length.
		 *
		 * @param {int} length - The size of the Float64Array to return (in elements)
		 * @returns {Float64Array}
		 */
		BufferReader.prototype.getFloat64Array = function( length ) {

			// Create buffer
			var buf = new Float64Array( this.buffer, this.position, length );
			// Forward position
			this.position += length*8;
			// Return buffer
			return buf;

		}

		/**
		 * Fetch a string from the current position, up to the length specified in the buffer.
		 *
		 * Note: This function will automatically align the position to 64-bits.
		 *
		 * @returns {string}
		 */
		BufferReader.prototype.getString = function() {

			// Get string length
			var strLen = this.getUint16();	// The real length of the string

			// Calculate pad sie
			var padSize = (strLen+2) % 8;
			if (padSize > 0) { 
				padSize = 8-padSize; 
			} else {
				padSize = 0;
			}

			// Read the string buffer
			var strBuffer = this.getUint8Array( strLen );

			// Forward the offset
			this.position += padSize;

			// Re-compose ASCII buffer
			var text = "";
			for (var i=0; i<strLen; i++) {
				text += String.fromCharCode( strBuffer[i] );
			}

			// Return text string
			return text;

		}

		/**
		 * Fetch a data URL from the current position, up to the length specified in the buffer.
		 *
		 * Note: This function will automatically align the position to 64-bits.
		 *
		 * @param {string} mime - The MIME-Type of the data URL
		 * @returns {string}
		 */
		BufferReader.prototype.getData = function(mime) {

			// Get string length
			var strLen = this.getUint32();	// The real length of the string

			// Calculate pad sie
			var padSize = (strLen+4) % 8;
			if (padSize > 0) { 
				padSize = 8-padSize; 
			} else {
				padSize = 0;
			}

			// Read the string buffer
			var dataBuffer = this.getUint8Array( strLen );

			// Forward the offset
			this.position += padSize;

			// Re-compose ASCII buffer
			var text = "";
			for (var i=0; i<strLen; i++) {
				text += String.fromCharCode( dataBuffer[i] );
			}

			// Return text string
			return "data:"+mime+";base64,"+btoa(text);

		}

		/**
		 * Fetch a string from the current position, up to the length specified in the buffer
		 * and parse the result as a JSON object.
		 *
		 * Note: This function will automatically align the position to 64-bits.
		 *
		 * @returns {string}
		 */
		BufferReader.prototype.getJSON = function() {

			// Get string
			var jsonString = this.getString();
			if (!jsonString) return false;

			// Parse json
			return JSON.parse(jsonString);

		}

		// Return buffer reader
		return BufferReader;


});