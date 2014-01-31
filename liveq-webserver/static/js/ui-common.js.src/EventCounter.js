
/**
 * 
 */
LiveQ.UI.EventCounter = function() {
  this.lastTime = 0;
  this.lastNevts = 0;
};

/**
 */
LiveQ.UI.EventCounter.prototype.update = function(nevts) {
  var now = new Date().getTime() / 1000;

}

/**
 */
LiveQ.UI.EventCounter.prototype.start = function(nevts) {
  var now = new Date().getTime() / 1000;
  this.lastTime = now;
  this.lastNevts = 0;
  this.step = 1;
}

/**
 */
LiveQ.UI.EventCounter.prototype.onUpdate = function(v) {

}
