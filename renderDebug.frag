#version 300 es
precision highp float;
out vec4 outColor;

uniform float u_time;
uniform vec2 u_resolution;

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float val = fract(uv.x*10.0 + uv.y*10.0 + u_time*0.1);
    outColor = vec4(val,1.0-val,sin(u_time)*0.5+0.5,1.0);
}
