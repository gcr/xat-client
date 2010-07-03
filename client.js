// Xat client
var XatClient = require('./xatstream').XatClient,
    sys = require('sys');


var client = new XatClient('174.36.242.42', '100867422', 'gcr_bot', '235', 'http://google.com');
client.addListener('connected', function() {
    sys.puts("Connected");
  });
client.addListener('unknownElement', function(obj, element, attrs) {
    sys.puts("Unknown element " + element + " " + sys.inspect(attrs));
  });
client.addListener('incomingBuffer', function(obj, buffer) {
    sys.puts(buffer.toString("binary", 0, buffer.length-1).replace(/\x00/g, "\n") + "\n");
    //sys.puts(sys.inspect(buffer) + "\n");
  });
client.addListener('join', function() {
    sys.puts("Joining...");
  });
