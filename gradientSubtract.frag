#version 300 es
precision highp float;
out vec4 outColor;

uniform sampler2D u_velocity;
uniform sampler2D u_pressure;
uniform vec2 u_resolution;

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float dx = 1.0/u_resolution.x;
    float dy = 1.0/u_resolution.y;

    float left = texture(u_pressure, uv - vec2(dx,0)).x;
    float right = texture(u_pressure, uv + vec2(dx,0)).x;
    float down = texture(u_pressure, uv - vec2(0,dy)).x;
    float up = texture(u_pressure, uv + vec2(0,dy)).x;

    vec2 vel = texture(u_velocity, uv).xy;
    vel.xy -= vec2(right - left, up - down) * 0.5;
    outColor = vec4(vel,0.0,1.0);
}
