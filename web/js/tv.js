// The TV plays a real YouTube video: an embedded player placed with CSS3DRenderer exactly where the TV screen is.
// The WebGL canvas sits on top and leaves a transparent hole over the screen, so the desk clutter in front of the
// TV still covers the video correctly.
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const PX = { w: 1280, h: 720 };

export function youtubeScreen(screenMesh, size, videoId) {
  const params = new URLSearchParams({
    autoplay: 1, mute: 1, loop: 1, playlist: videoId, controls: 0, rel: 0, playsinline: 1,
    iv_load_policy: 3, disablekb: 1, fs: 0, enablejsapi: 1, origin: location.origin,
  });
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${videoId}?${params}`;
  iframe.allow = 'autoplay; encrypted-media';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  Object.assign(iframe.style, { width: `${PX.w}px`, height: `${PX.h}px`, border: '0', background: '#000' });

  const object = new CSS3DObject(iframe);
  screenMesh.updateWorldMatrix(true, false);
  screenMesh.matrixWorld.decompose(object.position, object.quaternion, object.scale);
  object.scale.multiplyScalar(size.w / PX.w);

  const send = (func, args = []) => iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  return {
    object,
    // browsers only allow sound after a user gesture, so the first click or key press turns it on
    unmute() {
      send('unMute');
      send('setVolume', [100]);
      send('playVideo');
    },
  };
}
