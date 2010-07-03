NodeJS XAT client
=================

Hello! Here's my nodejs XAT client. Not much is supported yet.

I'm considering either turning this into a commandline xat chat room program
(think [irssi](http://www.irssi.org/)) or just turning it into an IRC gateway
(think [bitlbee](http://www.bitlbee.org/main.php/news.r.html))

To use this:
------------

Required steps:

* Open up the xat you want to connect to in firebug or your browser's
  implementation of "View Source"
* Find the flash `<object>`'s `<param>` string. In there will be something like
  `id=2222222222&...` -- the 222222222 is your channel number in this case.
* Edit client.js and change `CHANNEL` to 2222222 (or whatever it was)
* Run it with `node client.js`
* Watch things break

Optional steps:

* After watching things break, fork the project
* Fix those things that broke and commit
* Send me a pull request
