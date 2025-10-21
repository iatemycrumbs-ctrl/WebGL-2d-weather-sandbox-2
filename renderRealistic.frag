#version 300 es
precision highp float;
out vec4 outColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

in vec2 v_uv;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
    vec2 u=f*f*(3.-2.*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}

void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec3 col = mix(vec3(0.4,0.7,0.9), vec3(0.8,0.9,1.0), uv.y);

    // Clouds
    float clouds = noise(uv*6.0 + u_time*0.05);
    float mask = smoothstep(0.5,0.75, clouds);
    col = mix(col, vec3(0.9), mask);

    // Simple precipitation
    float drops = step(0.97, fract(uv.y*20.0 + u_time*2.0));
    col = mix(col, vec3(0.5,0.6,1.0), drops*0.4);

    outColor = vec4(col,1.0);
}
