var NuitBlanche = (function() {

  var d = document,
  
  rnd = Math.random,
  floor = Math.floor,
  width = window.innerWidth,
  height = window.innerHeight,

  halfx = window.innerWidth / 2,
  halfy = window.innerHeight / 2,

  container,
  stars = [],
  camera,
  scene,
  renderer,
  group,
  program,
  area,
  planets,
  tick,
  goal,
  boom,

  mousex = 0,
  mousey = 0,

  warpZ = 12,
  units = 100,
  cycle = 0,
  Z = 0.1,

  intro = document.getElementsByClassName('intro'),
  
  socket = io.connect('http://' + window.location.host + '/'),
  starsCanvas = d.createElement('canvas');

  starsCanvas.setAttribute('class','stars');
  starsCanvas.setAttribute('width', width);
  starsCanvas.setAttribute('height', height);

  d.body.appendChild(starsCanvas);

  var G=starsCanvas.getContext("2d");
  G.globalAlpha=0.25;

  function randNum(min,max) {
    return rnd() * (max - min + 1) + min;
  }

  function init() {

    (function createStars() {
      for (var i = 0, n; i < units; i++)
      {
        n = {};
        resetstar(n);
        stars.push(n);
      }
    })();

    container = d.createElement('div');
    container.setAttribute('class','container');

    d.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.z = 1000;
    scene = new THREE.Scene();
    var PI2 = Math.PI * 2;
    
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

  function resetstar(a)
  {
     a.x = (rnd() * width - (width * 0.5)) * warpZ;
     a.y = (rnd() * height - (height * 0.5)) * warpZ;
     a.z = warpZ;
     a.px = 0;
     a.py = 0;
  }

  // star rendering anim function
  function rf()
  {
    // clear background
    G.fillStyle = "#000";
    G.fillRect(0, 0, width, height);

    // mouse position to head towards
    var cx = (width / 2),
        cy = (height / 2);
     
    // update all stars
    var sat = floor(Z * 500);       // Z range 0.01 -> 0.5
    if (sat > 100) sat = 100;
    for (var i=0; i<units; i++) {
      var n = stars[i],            // the star
        xx = n.x / n.z,          // star position
        yy = n.y / n.z,
        e = (1.0 / n.z + 1) * 2;   // size i.e. z
        
      if (n.px !== 0) {
        // hsl colour from a sine wave
        G.strokeStyle = '#FFF';
        G.lineWidth = e;
        G.beginPath();
        G.moveTo(xx + cx, yy + cy);
        G.lineTo(n.px + cx, n.py + cy);
        G.stroke();
      }
        
      // update star position values with new settings
      n.px = xx;
      n.py = yy;
      n.z -= Z;
        
      // reset when star is out of the view field
      if (n.z < Z || n.px > width || n.py > height) {
        // reset star
        resetstar(n);
      }
    }
     
    // colour cycle sinewave rotation
    cycle += 0.01;
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
    rf();
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

    var sphere_material = new THREE.MeshBasicMaterial({map: texture}), segments = 40;

    this.w = randNum(100,180);

    this.planet = new THREE.Mesh(new THREE.SphereGeometry(this.w, segments, segments),sphere_material);

    this.planet.position.x = rnd() * area * 2 - area;
    this.planet.position.y = rnd() * area * 2 - area;
    this.planet.position.z = rnd() * area * 2 - area;

    group.add(this.planet);
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

    if( planets.length >= 30) {
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