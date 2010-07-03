// Xat client
var XatClient = require('./xat-client').XatClient,
    sys = require('sys'),
    XMLSocket = require('./flash-xmlsocket'),
    DEBUG = true;


var client = new XatClient('100867422', 'gcr_bot', '235', 'http://google.com');
client.addListener('connected', function() {
    sys.puts("Connected");
  });
client.addListener('unknownTag', function(element, attrs) {
    sys.puts("??  " + XMLSocket.stringifyTag(element, attrs) + "\n");
  });

client.addListener('join', function() {
    sys.puts("Joining...");
  });

if (DEBUG) {
  client.addListener('incomingTag', function(element, attrs) {
      sys.puts("--  " + XMLSocket.stringifyTag(element, attrs) + "\n");
    });
  client.addListener("idle", function() {
      sys.puts("We were idled; reconnecting...");
    });
}

client.connect();
