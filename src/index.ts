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

// prettier-ignore
const cosMap = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, -1, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 0, -1, 0, 0, 0, 0, 0, 0, 0,
  1, 0.5, -0.5, -1, 0, 0, 0, 0, 0, 0,
  1, Math.SQRT2 / 2, 0, -Math.SQRT2 / 2, -1, 0, 0, 0, 0, 0,
  1, (SQRT5 + 1) / 4, (SQRT5 - 1) / 4, -(SQRT5 - 1) / 4, -(SQRT5 + 1) / 4, -1, 0, 0, 0, 0,
  1, SQRT3 / 2, 0.5, 0, -0.5, -SQRT3 / 2, -1, 0, 0, 0,
  1, 0.9009688679024191, 0.6234898018587335, 0.2225209339563144, -0.2225209339563144, -0.6234898018587335, -0.9009688679024191, -1, 0, 0,
  1, SQRT2_PSQRT2 / 2, Math.SQRT2 / 2, SQRT2_NSQRT2, 0, -SQRT2_NSQRT2 / 2, -Math.SQRT2 / 2, -(SQRT2_PSQRT2 / 2), -1, 0,
  1, 0.9396926207859084, 0.766044443118978, 0.5, 0.17364817766693036, -0.17364817766693036, -0.5, -0.766044443118978, -0.9396926207859084, -1,
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
  const fragWidth = width - 1;
  const fragHeight = height - 1;
  gl.shaderSource(
    fragmentShader,
    // prettier-ignore
    `#version 300 es
precision mediump float;` +
      `in vec2 c;` +
      `uniform sampler2D d;` +
      `out vec4 e;` +
      // FIXME: rewrite with bi-cubic interpolation
      `void main(){` +
      `vec2 f=floor(c*vec2(${fragWidth},${fragHeight}))/vec2(${fragWidth},${fragHeight}),` +
           `g=f+vec2(1./${fragWidth}.,1./${fragHeight}.),` +
           `h=vec2(g.x,f.y),` +
           `i=vec2(f.x,g.y);` +
      `vec3 j=texture(d,f).rgb,` +
           `k=texture(d,h).rgb,` +
           `l=texture(d,i).rgb,` +
           `m=texture(d,g).rgb;` +
      `float n=(g.x-c.x)*(g.y-c.y),` +
            `o=(c.x-i.x)*(i.y-c.y),` +
            `p=(h.x-c.x)*(c.y-h.y),` +
            `q=(c.x-f.x)*(c.y-f.y);` +
      `vec3 r=(j*n+k*o+l*p+m*q)/(n+o+p+q),` +
           `s=pow(abs(r),vec3(1./2.4))*1.055-vec3(.055);` +
      `s=mix(r*12.92,s,step(.0031308,r));` +
      `e=vec4(s,1.);` +
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
