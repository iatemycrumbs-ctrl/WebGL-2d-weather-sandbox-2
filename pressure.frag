#version 300 es
precision highp float;
out vec4 outColor;

uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_resolution;

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float dx = 1.0/u_resolution.x;
    float dy = 1.0/u_resolution.y;

    float left = texture(u_pressure, uv - vec2(dx,0)).x;
    float right = texture(u_pressure, uv + vec2(dx,0)).x;
    float down = texture(u_pressure, uv - vec2(0,dy)).x;
    float up = texture(u_pressure, uv + vec2(0,dy)).x;

    float div = texture(u_divergence, uv).x;
    float p = (left + right + down + up - div)/4.0;
    outColor = vec4(p,0.0,0.0,1.0);
}
