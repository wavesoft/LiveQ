
/**
 * LiveQ Namespace
 * @namespace
 */
var LiveQ = {

	/**
	 * The LiveQ Client Library Version
	 * @member {string}
	 */
	"version": "1.0",

	/**
	 * Function to set a cookie
	 */
	setCookie: function(name, value, days) {
	    var expires;
	    if (days) {
	        var date = new Date();
	        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
	        expires = "; expires=" + date.toGMTString();
	    }
	    else {
	        expires = "";
	    }
	    document.cookie = name + "=" + value + expires + "; path=/";
	},

	/**
	 * Function to read a cookie
	 */
	getCookie: function(c_name) {
	    if (document.cookie.length > 0) {
	        c_start = document.cookie.indexOf(c_name + "=");
	        if (c_start != -1) {
	            c_start = c_start + c_name.length + 1;
	            c_end = document.cookie.indexOf(";", c_start);
	            if (c_end == -1) {
	                c_end = document.cookie.length;
	            }
	            return unescape(document.cookie.substring(c_start, c_end));
	        }
	    }
	    return "";
	}

};
