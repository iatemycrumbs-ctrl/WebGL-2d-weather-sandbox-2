import { loadShader } from './shaders/loadShader.js'; // helper function to fetch GLSL

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl2');
canvas.width = innerWidth;
canvas.height = innerHeight;

if (!gl) alert('WebGL2 not supported');

let currentMode = 'realistic'; // 'realistic' or 'debug'
const modeText = document.getElementById('modeText');
document.getElementById('realisticBtn').onclick = () => { currentMode = 'realistic'; modeText.textContent = 'Realistic'; };
document.getElementById('debugBtn').onclick = () => { currentMode = 'debug'; modeText.textContent = 'Debug'; };

// --- Canvas resize ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}
window.addEventListener('resize', resize);
resize();

// --- Mouse / touch for heat / updraft ---
let mouse = [canvas.width/2, canvas.height/2];
let heat = 0.0;

canvas.addEventListener('mousemove', e => { 
    mouse = [e.clientX, canvas.height - e.clientY]; 
    heat = 1.0;
});
canvas.addEventListener('touchmove', e => { 
    const t = e.touches[0];
    mouse = [t.clientX, canvas.height - t.clientY]; 
    heat = 1.0;
});
canvas.addEventListener('mouseleave', ()=> heat = 0.0);

// --- Shader programs ---
const shaders = {
    vertex: await loadShader('./shaders/vertex.glsl'),
    advection: await loadShader('./shaders/advection.frag'),
    divergence: await loadShader('./shaders/divergence.frag'),
    pressure: await loadShader('./shaders/pressure.frag'),
    gradientSubtract: await loadShader('./shaders/gradientSubtract.frag'),
    temperature: await loadShader('./shaders/temperature.frag'),
    humidity: await loadShader('./shaders/humidity.frag'),
    charge: await loadShader('./shaders/charge.frag'),
    renderRealistic: await loadShader('./shaders/renderRealistic.frag'),
    renderDebug: await loadShader('./shaders/renderDebug.frag')
};

// --- Helper: compile shader ---
function compileShader(type, source){
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(s));
    return s;
}

function createProgram(vsSource, fsSource){
    const prog = gl.createProgram();
    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS))
        console.error(gl.getProgramInfoLog(prog));
    return prog;
}

// --- Full-screen quad ---
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 1,-1, -1,1,
    -1,1, 1,-1, 1,1
]), gl.STATIC_DRAW);

// --- Framebuffers / textures setup ---
// Note: for each field (velocity, temperature, humidity, charge, pressure)
// we create a double FBO (ping-pong) for simulation passes
const simWidth = 256;
const simHeight = 256;

function createDoubleFBO(w, h){
    const texA = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const fboA = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texA, 0);

    const texB = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const fboB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texB, 0);

    return {read: {tex: texA, fbo: fboA}, write: {tex: texB, fbo: fboB}, swap(){ const t=this.read; this.read=this.write; this.write=t; }};
}

// --- Simulation FBOs ---
const velocity = createDoubleFBO(simWidth, simHeight);
const temperature = createDoubleFBO(simWidth, simHeight);
const humidity = createDoubleFBO(simWidth, simHeight);
const charge = createDoubleFBO(simWidth, simHeight);
const pressure = createDoubleFBO(simWidth, simHeight);

// --- Load programs ---
const programs = {
    advection: createProgram(shaders.vertex, shaders.advection),
    divergence: createProgram(shaders.vertex, shaders.divergence),
    pressure: createProgram(shaders.vertex, shaders.pressure),
    gradientSubtract: createProgram(shaders.vertex, shaders.gradientSubtract),
    temperature: createProgram(shaders.vertex, shaders.temperature),
    humidity: createProgram(shaders.vertex, shaders.humidity),
    charge: createProgram(shaders.vertex, shaders.charge),
    renderRealistic: createProgram(shaders.vertex, shaders.renderRealistic),
    renderDebug: createProgram(shaders.vertex, shaders.renderDebug)
};

// --- Utility: draw full-screen quad with program ---
function drawQuad(prog, uniforms={}){
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    for(const name in uniforms){
        const loc = gl.getUniformLocation(prog,name);
        const val = uniforms[name];
        if(val.length===2) gl.uniform2fv(loc,val);
        else if(val.length===3) gl.uniform3fv(loc,val);
        else gl.uniform1f(loc,val);
    }
    gl.drawArrays(gl.TRIANGLES,0,6);
}

// --- Simulation loop ---
let start = performance.now();
function frame(){
    const t = (performance.now()-start)/1000;

    // --- Example: heat source applied to temperature ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, temperature.write.fbo);
    drawQuad(programs.temperature, {u_time: t, u_heat: heat, u_mouse: mouse, u_resolution: [simWidth,simHeight]});
    temperature.swap();

    // --- Advect velocity, temperature, humidity, charge (simplified here) ---
    // TODO: Add full advection, divergence, pressure solver, gradient subtraction passes

    // --- Render final ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if(currentMode==='realistic'){
        drawQuad(programs.renderRealistic, {u_time:t,u_resolution:[canvas.width,canvas.height],u_mouse:mouse});
    }else{
        drawQuad(programs.renderDebug, {u_time:t,u_resolution:[canvas.width,canvas.height],u_mouse:mouse});
    }

    requestAnimationFrame(frame);
    heat*=0.98;
}
frame();
