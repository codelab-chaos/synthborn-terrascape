import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const SHADER_EFFECTS = Object.freeze({
  none: 0,
  tiltShift: 1,
  pixelMap: 2,
  vignette: 3,
  bloomLite: 4,
  cartographicInk: 5,
  nightScan: 6,
});

const CATALOG_SHADER = {
  name: 'SynthWorldviewShaderCatalog',
  uniforms: {
    tDiffuse: { value: null },
    mode: { value: SHADER_EFFECTS.none },
    resolution: { value: [1, 1] },
    time: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform int mode;
    uniform vec2 resolution;
    uniform float time;
    varying vec2 vUv;

    vec3 sampleColor(vec2 uv) {
      return texture2D(tDiffuse, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
    }

    float luma(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    vec3 tiltShift(vec2 uv) {
      float distanceFromFocus = abs(uv.y - 0.53);
      float blur = smoothstep(0.18, 0.48, distanceFromFocus);
      vec2 texel = vec2(1.0) / resolution;
      vec3 color = sampleColor(uv) * 0.28;
      color += sampleColor(uv + vec2(texel.x * 1.5, 0.0) * blur) * 0.18;
      color += sampleColor(uv - vec2(texel.x * 1.5, 0.0) * blur) * 0.18;
      color += sampleColor(uv + vec2(0.0, texel.y * 2.2) * blur) * 0.18;
      color += sampleColor(uv - vec2(0.0, texel.y * 2.2) * blur) * 0.18;
      color += vec3(0.025, 0.016, 0.0);
      return mix(sampleColor(uv), color, 0.88);
    }

    vec3 pixelMap(vec2 uv) {
      float pixelSize = 3.0;
      vec2 pixelUv = (floor(uv * resolution / pixelSize) * pixelSize + pixelSize * 0.5) / resolution;
      vec3 color = sampleColor(pixelUv);
      color = floor(color * 14.0) / 14.0;
      return color * vec3(1.04, 1.02, 0.96);
    }

    vec3 vignette(vec2 uv) {
      vec3 color = sampleColor(uv);
      float distanceFromCenter = distance(uv, vec2(0.5));
      float edge = smoothstep(0.36, 0.76, distanceFromCenter);
      color *= mix(1.08, 0.62, edge);
      color = mix(color, vec3(luma(color)), 0.08);
      return color;
    }

    vec3 bloomLite(vec2 uv) {
      vec2 texel = vec2(1.0) / resolution;
      vec3 color = sampleColor(uv);
      vec3 glow = vec3(0.0);
      glow += sampleColor(uv + texel * vec2(2.0, 0.0));
      glow += sampleColor(uv + texel * vec2(-2.0, 0.0));
      glow += sampleColor(uv + texel * vec2(0.0, 2.0));
      glow += sampleColor(uv + texel * vec2(0.0, -2.0));
      glow += sampleColor(uv + texel * vec2(2.0, 2.0));
      glow += sampleColor(uv + texel * vec2(-2.0, -2.0));
      glow /= 6.0;
      float bright = smoothstep(0.48, 0.92, luma(glow));
      return color + glow * bright * 0.28;
    }

    vec3 cartographicInk(vec2 uv) {
      vec2 texel = vec2(1.0) / resolution;
      vec3 color = sampleColor(uv);
      float c = luma(color);
      float dx = abs(c - luma(sampleColor(uv + vec2(texel.x, 0.0)))) + abs(c - luma(sampleColor(uv - vec2(texel.x, 0.0))));
      float dy = abs(c - luma(sampleColor(uv + vec2(0.0, texel.y)))) + abs(c - luma(sampleColor(uv - vec2(0.0, texel.y))));
      float edge = smoothstep(0.08, 0.22, dx + dy);
      vec3 ink = vec3(0.025, 0.045, 0.045);
      color = floor(color * 18.0) / 18.0;
      return mix(color * vec3(1.05, 1.03, 0.94), ink, edge * 0.56);
    }

    vec3 nightScan(vec2 uv) {
      vec3 color = sampleColor(uv);
      float scan = sin((uv.y * resolution.y + time * 26.0) * 0.72) * 0.5 + 0.5;
      color = mix(color, color * vec3(0.58, 0.96, 0.86), 0.42);
      color += vec3(0.0, 0.03, 0.02) * scan;
      color *= 0.86 + scan * 0.08;
      return color;
    }

    void main() {
      vec3 color = sampleColor(vUv);
      if (mode == 1) {
        color = tiltShift(vUv);
      } else if (mode == 2) {
        color = pixelMap(vUv);
      } else if (mode == 3) {
        color = vignette(vUv);
      } else if (mode == 4) {
        color = bloomLite(vUv);
      } else if (mode == 5) {
        color = cartographicInk(vUv);
      } else if (mode == 6) {
        color = nightScan(vUv);
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export function createPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const shaderPass = new ShaderPass(CATALOG_SHADER);
  shaderPass.enabled = false;
  composer.addPass(shaderPass);
  return { composer, shaderPass, mode: 'none' };
}

export function setShaderEffect(post, value) {
  const mode = SHADER_EFFECTS[value] ?? SHADER_EFFECTS.none;
  post.mode = value in SHADER_EFFECTS ? value : 'none';
  post.shaderPass.uniforms.mode.value = mode;
  post.shaderPass.enabled = mode !== SHADER_EFFECTS.none;
}

export function resizePostProcessing(post, width, height, pixelRatio) {
  post.composer.setPixelRatio(pixelRatio);
  post.composer.setSize(width, height);
  post.shaderPass.uniforms.resolution.value = [Math.max(1, width * pixelRatio), Math.max(1, height * pixelRatio)];
}

export function renderPostProcessing(post, renderer, scene, camera, deltaSeconds, elapsedSeconds) {
  if (post.shaderPass.enabled) {
    post.shaderPass.uniforms.time.value = elapsedSeconds;
    post.composer.render(deltaSeconds);
    return;
  }
  renderer.render(scene, camera);
}
