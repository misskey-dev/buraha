function base83decode(source: string) {
  let result = 0;
  for (let i = 0; i < source.length; i++) {
    result =
      result * 83 +
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~".indexOf(
        source[i]
      );
  }
  return result;
}

const SQRT2_NSQRT2 = Math.sqrt(2 - Math.SQRT2);
const SQRT2_PSQRT2 = Math.sqrt(2 + Math.SQRT2);
const SQRT3 = Math.sqrt(3);
const SQRT5 = Math.sqrt(5);
const PI1PER7RAD = 0.9009688679024191;
const PI2PER7RAD = 0.6234898018587335;
const PI3PER7RAD = 0.2225209339563144;
const PI1PER9RAD = 0.9396926207859084;
const PI2PER9RAD = 0.766044443118978;
const PI4PER9RAD = 0.17364817766693036;

// prettier-ignore
const cosMap = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, -1, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 0, -1, 0, 0, 0, 0, 0, 0, 0,
  1, 0.5, -0.5, -1, 0, 0, 0, 0, 0, 0,
  1, Math.SQRT2 / 2, 0, -Math.SQRT2 / 2, -1, 0, 0, 0, 0, 0,
  1, (SQRT5 + 1) / 4, (SQRT5 - 1) / 4, -(SQRT5 - 1) / 4, -(SQRT5 + 1) / 4, -1, 0, 0, 0, 0,
  1, SQRT3 / 2, 0.5, 0, -0.5, -SQRT3 / 2, -1, 0, 0, 0,
  1, PI1PER7RAD, PI2PER7RAD, PI3PER7RAD, -PI3PER7RAD, -PI2PER7RAD, -PI1PER7RAD, -1, 0, 0,
  1, SQRT2_PSQRT2 / 2, Math.SQRT2 / 2, SQRT2_NSQRT2, 0, -SQRT2_NSQRT2 / 2, -Math.SQRT2 / 2, -(SQRT2_PSQRT2 / 2), -1, 0,
  1, PI1PER9RAD, PI2PER9RAD, 0.5, PI4PER9RAD, -PI4PER9RAD, -0.5, -PI2PER9RAD, -PI1PER9RAD, -1,
]

function dcos(dividend: number, divisor: number) {
  const mod = dividend % divisor;
  const turn = (dividend - mod) / divisor;
  return cosMap[divisor * 10 + mod] * (turn % 2 ? -1 : 1);
}

function dc(source: number, target: Float32Array) {
  target[0] = dcInner(source >> 16);
  target[1] = dcInner((source >> 8) & 255);
  target[2] = dcInner(source & 255);
}

function dcInner(source: number) {
  const value = source / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function ac(source: number, target: Float32Array, maximum: number) {
  target[0] = acInner(Math.floor(source / 361)) * maximum;
  target[1] = acInner(Math.floor(source / 19) % 19) * maximum;
  target[2] = acInner(source % 19) * maximum;
}

function acInner(source: number) {
  const value = (source - 9) / 9;
  return Math.sign(value) * Math.abs(value) ** 2;
}

export default function render(
  source: string,
  target: HTMLCanvasElement | OffscreenCanvas,
  punch = 1
) {
  const size = base83decode(source[0]);
  const width = (size % 9) + 1;
  const height = (size - width + 1) / 9 + 1;
  const maximum = ((base83decode(source[1]) + 1) / 166) * punch;
  const parameters = new Float32Array(3 * width * height);
  for (let i = 0; i < width * height; i++) {
    if (i) {
      ac(
        base83decode(source.slice(i * 2 + 4, i * 2 + 6)),
        parameters.subarray(i * 3, (i + 1) * 3),
        maximum
      );
    } else {
      dc(base83decode(source.slice(2, 6)), parameters.subarray(0, 3));
    }
  }
  const colors = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const w = i % width;
    const h = (i - w) / width;
    const target = colors.subarray(i * 3, (i + 1) * 3);
    for (let y = 0; y < height; y++) {
      const z = dcos(y * h, height);
      for (let x = 0; x < width; x++) {
        const basis = z * dcos(x * w, width);
        const source = parameters.subarray(
          y * width * 3 + x * 3,
          y * width * 3 + (x + 1) * 3
        );
        for (let i = 0; i < 3; i++) {
          target[i] += source[i] * basis;
        }
      }
    }
  }
  const gl = target.getContext("webgl2")!;
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(
    vertexShader,
    `#version 300 es
in vec2 a;` +
      `in vec2 b;` +
      `out vec2 c;` +
      `void main(){` +
      `gl_Position=vec4(a,0.,1.);` +
      `c=b;` +
      `}`
  );
  gl.compileShader(vertexShader);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(
    fragmentShader,
    // prettier-ignore
    `#version 300 es
precision mediump float;` +
      `in vec2 c;` +
      `uniform sampler2D d;` +
      `out vec4 e;` +
      `vec3 f(vec3 a,vec3 b,vec3 c,vec3 d,float e){` +
      `float f=e*e,` +
            `g=f*e;` +
      `return(d/2.-c*3./2.+b*3./2.-a/2.)*g+(a-b*5./2.+c*2.-d/2.)*f+(c/2.-a/2.)*e+b;` +
      `}` +
      `void main(){` +
      `vec2 g=vec2(${width},${height}),` +
           `h=c*g+vec2(1.,0.),` +
           `i=fract(h);` +
      `h=(floor(h)-.5)/g;` +
      `vec3 k=texture(d,h+vec2(-1.)/g).rgb,` +
           `l=texture(d,h+vec2(0.,-1.)/g).rgb,` +
           `m=texture(d,h+vec2(1.,-1.)/g).rgb,` +
           `n=texture(d,h+vec2(2.,-1.)/g).rgb,` +
           `o=texture(d,h+vec2(-1.,0.)/g).rgb,` +
           `p=texture(d,h).rgb,` +
           `q=texture(d,h+vec2(1.,0.)/g).rgb,` +
           `r=texture(d,h+vec2(2.,0.)/g).rgb,` +
           `s=texture(d,h+vec2(-1.,1.)/g).rgb,` +
           `t=texture(d,h+vec2(0.,1.)/g).rgb,` +
           `u=texture(d,h+vec2(1.)/g).rgb,` +
           `v=texture(d,h+vec2(2.,1.)/g).rgb,` +
           `w=texture(d,h+vec2(-1.,2.)/g).rgb,` +
           `x=texture(d,h+vec2(0.,2.)/g).rgb,` +
           `y=texture(d,h+vec2(1.,2.)/g).rgb,` +
           `z=texture(d,h+vec2(2.)/g).rgb,` +
           `A=f(k,l,m,n,i.x),` +
           `B=f(o,p,q,r,i.x),` +
           `C=f(s,t,u,v,i.x),` +
           `D=f(w,x,y,z,i.x),` +
           `E=f(A,B,C,D,i.y),` +
           `F=pow(abs(E),vec3(1./2.4))*1.055-vec3(.055);` +
      `F=mix(E*12.92,F,step(.0031308,E));` +
      `e=vec4(F,1.);` +
      `}`
  );
  gl.compileShader(fragmentShader);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  const aPosition = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(aPosition);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  const aTexCoord = gl.getAttribLocation(program, "b");
  gl.enableVertexAttribArray(aTexCoord);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB16F,
    width,
    height,
    0,
    gl.RGB,
    gl.FLOAT,
    colors
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const uTexture = gl.getUniformLocation(program, "d");
  gl.uniform1i(uTexture, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
