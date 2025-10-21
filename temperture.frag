#version 300 es
precision highp float;
out vec4 outColor;

uniform sampler2D u_temperature;
uniform vec2 u_mouse;
uniform float u_heat;
uniform vec2 u_resolution;
uniform float u_time;

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float temp = texture(u_temperature, uv).x;

    // Heat source from mouse
    float dist = distance(uv, u_mouse / u_resolution);
    float addHeat = exp(-dist*20.0)*u_heat;

    temp += addHeat * 0.5;
    temp *= 0.995; // cooling
    outColor = vec4(temp,0.0,0.0,1.0);
}
