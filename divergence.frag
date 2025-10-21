#version 300 es
precision highp float;
out vec4 outColor;

uniform sampler2D u_velocity;
uniform vec2 u_resolution;

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float dx = 1.0/u_resolution.x;
    float dy = 1.0/u_resolution.y;

    float left = texture(u_velocity, uv - vec2(dx,0)).x;
    float right = texture(u_velocity, uv + vec2(dx,0)).x;
    float down = texture(u_velocity, uv - vec2(0,dy)).y;
    float up = texture(u_velocity, uv + vec2(0,dy)).y;

    float div = (right - left + up - down) * 0.5;
    outColor = vec4(div,0.0,0.0,1.0);
}
