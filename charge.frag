#version 300 es
precision highp float;
out vec4 outColor;

uniform sampler2D u_charge;
uniform sampler2D u_humidity;
uniform vec2 u_resolution;
uniform float u_time;

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float c = texture(u_charge, uv).x;
    float h = texture(u_humidity, uv).x;

    // Generate charge in strong updraft / high humidity
    float gen = (h > 0.7) ? 0.01 : 0.0;
    c += gen * sin(u_time*5.0 + uv.x*10.0);

    // Decay slowly
    c *= 0.995;
    outColor = vec4(c,0.0,0.0,1.0);
}
