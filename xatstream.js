// Parses xat streams.
//
var net = require('net'),
    sys = require('sys');

var XatClient = exports.XatClient = function(host, channel, username, avatar, hpage) {
  var stream = this.stream = net.createConnection(10037, host);
  var self = this;
  var state = "negotiating";
  this.stream.addListener('connect', function() {
      stream.write("<y m=\"1\" />\x00");

      self.emit("connected", this);
    });
  this.stream.addListener('data', function(data) {
      self.incomingBuffer(data);
    });
};

XatClient.prototype.incomingBuffer = function(buffer) {
  // Process this buffer
  sys.puts(buffer.toString("binary", 0, buffer.length));

  this.emit("incomingBuffer", this);
};
