const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl2');
canvas.width = innerWidth;
canvas.height = innerHeight;

if (!gl) {
  alert("WebGL2 not supported");
}

// === Helper functions ===
function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram(vsSource, fsSource) {
  const program = gl.createProgram();
  const vs = compileShader(gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
  }
  return program;
}

// === Shaders ===
const vertexShader = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;
out vec4 outColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// Noise function for terrain/water/clouds
float rand(vec2 p){return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p);vec2 f=fract(p);
  float a=rand(i);
  float b=rand(i+vec2(1.,0.));
  float c=rand(i+vec2(0.,1.));
  float d=rand(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 6.0;
  
  // Terrain line
  float terrain = noise(vec2(p.x, 0.0)) * 0.2 + 0.4;

  vec3 col;
  if (uv.y < terrain) {
    // Land
    col = mix(vec3(0.1,0.5,0.1), vec3(0.4,0.25,0.1), uv.y*3.0);
  } else if (uv.y < terrain + 0.05) {
    // Water surface shimmer
    float wave = sin(p.x*5.0 + u_time*3.0)*0.02;
    col = mix(vec3(0.0,0.3,0.5), vec3(0.1,0.5,0.8), uv.y + wave);
  } else {
    // Sky with clouds
    float clouds = noise(vec2(p.x*1.5, p.y*1.5 + u_time*0.1));
    float sky = smoothstep(0.4, 1.0, uv.y);
    col = mix(vec3(0.5,0.7,0.9), vec3(1.0), smoothstep(0.5,0.8,clouds));
  }

  // Lightning flashes
  float lightning = step(0.995, rand(vec2(u_time, uv.x))) * smoothstep(0.0, 0.5, uv.y);
  if (lightning > 0.0) {
    col += vec3(1.0,1.0,1.0)*lightning;
  }

  // Mouse-controlled warm air effect (updraft)
  float dist = distance(uv, u_mouse / u_resolution);
  col += vec3(0.4,0.2,0.1)*(0.2 / (dist*20.0+0.01));

  outColor = vec4(col, 1.0);
}
`;

// === Setup ===
const program = createProgram(vertexShader, fragmentShader);
const pos = gl.getAttribLocation(program, 'a_position');
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1, 1, -1, -1, 1,
  -1, 1, 1, -1, 1, 1,
]), gl.STATIC_DRAW);

gl.useProgram(program);
gl.enableVertexAttribArray(pos);
gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

const timeLoc = gl.getUniformLocation(program, 'u_time');
const resLoc = gl.getUniformLocation(program, 'u_resolution');
const mouseLoc = gl.getUniformLocation(program, 'u_mouse');

let mouse = [0, 0];
canvas.addEventListener('mousemove', e => {
  mouse = [e.clientX, canvas.height - e.clientY];
});
canvas.addEventListener('touchmove', e => {
  const t = e.touches[0];
  mouse = [t.clientX, canvas.height - t.clientY];
});

let start = performance.now();

function render() {
  const t = (performance.now() - start) / 1000;
  gl.uniform1f(timeLoc, t);
  gl.uniform2f(resLoc, canvas.width, canvas.height);
  gl.uniform2f(mouseLoc, mouse[0], mouse[1]);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}

render();
