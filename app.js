var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  io = require('socket.io').listen(server),
  twitter = require('ntwitter'),
  path = require('path'),
  request = require('request'),
  fs = require('fs'),
  sys = require('sys'),
  exec = require('child_process').exec,
  https = require('https'),
  conf = require('./config');

if(conf.twitter.consumer_key === '') {
  console.log('please fill out config.js first!');
  process.exit(1);
}

var i = 1,
  track = conf.track,
  img_path = conf.img_path,
  del = conf.del,
  t = new twitter(conf.twitter);

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public/img')));

app.get('/', function(req, res) {
  res.render('index');
});

function requestURL( url, data, img_name ) {

  request(url, function(error, response, body) {
    if(error) {
      console.log(error);
      console.log(url);
    }
    if(!error && response.statusCode === 200) {
      io.sockets.emit('add planet', {tweet: data, img: img_name});
    }
  }).pipe(fs.createWriteStream(img_path + img_name));
}

console.log(t);

t.stream('statuses/filter', {'track':track}, function(stream) {
  stream.on('data', function(data) {

    var jpg_name = i + '.jpg';
    var url;

    // promises, plz!

    if(data.entities.media && data.entities.media.length) {
      url = data.entities.media[0].media_url;
      requestURL(url, data, jpg_name);
    } else if(data.entities.urls && data.entities.urls.length) {
        if(data.entities.urls[0].expanded_url) {
          if(data.entities.urls[0].expanded_url.match(/instagram.com\/p/)) {
            url = 'http://' + data.entities.urls[0].display_url + 'media/?size=m';
            requestURL(url, data, jpg_name);
          }
        } else {
          // no twitter, no instagram
          // send plain tweet and/or video tweet
          url = data.user.profile_image_url.replace('_normal','');
          requestURL(url, data, jpg_name);
        }
    } else {

      // no twitter, no instagram
      // send plain tweet
      url = data.user.profile_image_url.replace('_normal','');
      requestURL(url, data, jpg_name);
    }
  });
});

io.sockets.on('connection', function (socket) {
  socket.emit('init','application (re)started');
  socket.on('delete', function(data) {
    i++;
    if(del) {
      fs.unlink(img_path + data.url, function() {
        console.log('image deleted');
      });
    }
  });
});

server.listen(conf.port);

console.log('app started on http://' + conf.host + ':' + conf.port);