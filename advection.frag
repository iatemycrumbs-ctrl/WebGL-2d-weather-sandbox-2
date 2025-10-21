#version 300 es
precision highp float;
out vec4 outColor;

uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform float u_dt;
uniform vec2 u_resolution;

in vec2 v_uv;

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 vel = texture(u_velocity, uv).xy;
    vec2 prev = uv - vel * u_dt / u_resolution;
    outColor = texture(u_source, prev);
}
