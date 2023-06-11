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

function dcos(dividend: number, divisor: number) {
  return Math.cos(Math.PI * dividend / divisor);
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

export function render(
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
    const h = height - 1 - (i - w) / width;
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
      `vec3 k=f(f(texture(d,h+vec2(-1.)/g).rgb,texture(d,h+vec2(0.,-1.)/g).rgb,texture(d,h+vec2(1.,-1.)/g).rgb,texture(d,h+vec2(2.,-1.)/g).rgb,i.x),f(texture(d,h+vec2(-1.,0.)/g).rgb,texture(d,h).rgb,texture(d,h+vec2(1.,0.)/g).rgb,texture(d,h+vec2(2.,0.)/g).rgb,i.x),f(texture(d,h+vec2(-1.,1.)/g).rgb,texture(d,h+vec2(0.,1.)/g).rgb,texture(d,h+vec2(1.)/g).rgb,texture(d,h+vec2(2.,1.)/g).rgb,i.x),f(texture(d,h+vec2(-1.,2.)/g).rgb,texture(d,h+vec2(0.,2.)/g).rgb,texture(d,h+vec2(1.,2.)/g).rgb,texture(d,h+vec2(2.)/g).rgb,i.x),i.y),` +
           `l=pow(abs(k),vec3(1./2.4))*1.055-vec3(.055);` +
      `l=mix(k*12.92,l,step(.0031308,k));` +
      `e=vec4(l,1.);` +
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
