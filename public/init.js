var NuitBlanche = (function() {

  var d = document,
  
  rnd = Math.random,
  floor = Math.floor,
  width = window.innerWidth,
  height = window.innerHeight,

  halfx = window.innerWidth / 2,
  halfy = window.innerHeight / 2,

  container,

  camera,
  scene,
  renderer,
  group,

  area,
  planets,
  
  tick,
  goal,
  
  boom,

  mousex = 0,
  mousey = 0,

  intro = document.getElementsByClassName('intro'),
  
  socket = io.connect('http://' + window.location.host + '/');

  function randNum(min,max) {
    return rnd() * (max - min + 1) + min;
  }

  function init() {

    container = d.createElement('div');
    container.setAttribute('class','container');

    d.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.z = 1000;
    
    scene = new THREE.Scene();
    
    area = 200;
    boom = false;

    planets = [];
    tick = 0;
    goal = 140;

    group = new THREE.Object3D();
    scene.add(group);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.domElement.setAttribute('class','planets');
    container.appendChild(renderer.domElement);

    console.log('universe (re)initiated');

    bindEvents();
  }

  function bindEvents() {
    [
      { e: 'mousemove', fn: onMouseMove },
      { e: 'keyup', fn: onKeyUp },
      { e: 'click', fn: explode },
      { targ: window, e: 'resize', fn: onWindowResize }
    ].forEach(function(i) {
      var targ = i.targ || d;
      targ.addEventListener( i.e, i.fn, false );
    });
  }

  function onKeyUp(e) {
    if(e.keyCode === 32) {
      explode();
    }
  }

  function onMouseMove(e) {
    mousex = e.clientX - halfx;
    mousey = e.clientY - halfy;
  }

  function onWindowResize() {
    halfx = window.innerWidth / 2;
    halfy = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onTouchStart(event) {
    if(event.touches.length === 1) {
      event.preventDefault();
      mousex = event.touches[0].pageX - halfx;
      mousey = event.touches[0].pageY - halfy;
    }
  }

  function onTouchMove(event) {
    if(event.touches.length === 1) {
      event.preventDefault();
      mousex = event.touches[0].pageX - halfx;
      mousey = event.touches[0].pageY - halfy;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    
    render();
  }

  function render() {
    camera.position.x += (mousex - camera.position.x) * 0.05;
    camera.position.y += (- mousey - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    group.rotation.x += 0.001;
    group.rotation.y += 0.002;
    group.rotation.z += 0.003;

    planets.forEach(function(e,i) {
      e.expand();
    });

    if(boom) {
      countdown();
    }

    renderer.render(scene, camera);
  }

  function explode() {
    boom = true;
    planets.forEach(function(e) {
      e.update(60,0.4);
    });
  }

  function countdown() {
    tick++;
    if(tick >= goal) {
      container.parentNode.removeChild(container);
      boom = false;
      init();
    }
  }

  var Planet = function(group, texture) {

    var material = new THREE.MeshBasicMaterial( {map: texture} ), segments = 40;
    material.side = THREE.DoubleSide;

    this.planet = new THREE.Mesh( new THREE.PlaneGeometry( 400, 400, segments), material );

    this.planet.position.x = rnd() * area * 2 - area;
    this.planet.position.y = rnd() * area * 2 - area;
    this.planet.position.z = rnd() * area * 2 - area;

    group.add( this.planet );
  };
   
  Planet.prototype.expand = function() {

    this.planet.position.x += this.xd;
    this.planet.position.y += this.yd;
    this.planet.position.z += this.zd;

    this.planet.rotation.x += this.xrd;
    this.planet.rotation.z += this.zrd;
  };

  Planet.prototype.rotate = function() {

    /*** this is handy for rotating items in an orbit
  
    this.time += this.timeFactor;
    this.planet.rotation.x += this.xrd * 0.02;
    
    this.planet.position.x = (Math.sin(this.time * (Math.PI / 180)) * this.distance);
    this.planet.position.y = (Math.cos(this.time * (Math.PI / 180)) * this.distance);

    ***/

    this.planet.rotation.x += this.xrd * 0.02;
  };

  Planet.prototype.update = function(max_speed, max_rot) {

    this.max_speed = max_speed;
    this.max_rot = max_rot;

    this.xd = rnd() * this.max_speed * 2 - this.max_speed;
    this.yd = rnd() * this.max_speed * 2 - this.max_speed;
    this.zd = rnd() * this.max_speed * 2 - this.max_speed;

    this.xrd = rnd() * this.max_rot * 2 - this.max_rot;
    this.zrd = rnd() * this.max_rot * 2 - this.max_rot;
  };

  function addPlanet(url) {
    if(!boom) { // throttle the boom?
      var loader = new THREE.TextureLoader();
      loader.load(url, function(texture) {
        var planet = new Planet(group, texture);
        planet.update(0.4,0.02);
        planets.push(planet);
        socket.emit('delete', {'url': url});
      });
    }
  }

  socket.on('add planet', function(data) {
    // boom!
    Object(data.tweet.entities.hashtags).forEach( function(key) {
      if(!boom && key.text === 'boom') {
        explode();
        return;
      }
    });

    if(planets.length >= 30) {
      explode();
      return;
    }

    addPlanet(data.img);

    // remove .intro
    if(intro.length) {
      d.body.removeChild(intro[0]);
    }
  }).on('init', function(str) {
    console.log(str);
  });

  init();
  animate();
})();