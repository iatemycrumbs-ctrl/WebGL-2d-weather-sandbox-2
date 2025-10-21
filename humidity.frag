#version 300 es
precision highp float;
out vec4 outColor;

uniform sampler2D u_humidity;
uniform sampler2D u_temperature;
uniform vec2 u_resolution;

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float h = texture(u_humidity, uv).x;
    float t = texture(u_temperature, uv).x;

    // Condensation: reduce humidity if temp below certain threshold
    if(t < 0.6){
        h *= 0.99;
    } else {
        h += 0.001; // evaporation
    }

    h = clamp(h,0.0,1.0);
    outColor = vec4(h,0.0,0.0,1.0);
}
