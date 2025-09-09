import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import Hls from 'hls.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VIDEO_CONSTS } from './consts/consts';

interface Marker {
  id: string;
  time: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
}

@Component({
  selector: 'app-video360',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-360.component.html',
  styleUrls: ['./video-360.component.scss'],
})
export class Video360Component implements OnInit, OnDestroy {
  @ViewChild('rendererContainer', { static: true }) container!: ElementRef;
  @ViewChild('timeline', { static: true })
  timelineRef!: ElementRef<HTMLDivElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private video!: HTMLVideoElement;
  private texture!: THREE.VideoTexture;
  private hls?: Hls;
  private sphere!: THREE.Mesh;

  src = 'assets/4k_splited_video/video360.m3u8';
  src2 = 'assets/video360Source.mp4';
  src3 = 'assets/wind_HEVC.mp4';
  src4 =
    'https://drive.google.com/drive/folders/1brM754Bic3IzmKbAG2OoKWys18fNffXg/view?usp=share_link';

  src_google_drive =
    'https://drive.google.com/file/d/1fYjh0mLqUMAicwOI2n_IyiPVteJVc64C/view?usp=sharing';

  // src5 = 'https://bnc5m8rz-3000.euw.devtunnels.ms/uploads/output/wind_HEVC.mp4';
  src5 = 'https://storage.googleapis.com/test-360-234564646/wind_HEVC.mp4';

  src_max_hls_1 =
    'https://customer-uoahtvo01gx6knj8.cloudflarestream.com/8cdb0da222dd46dca78400a13ccdf18e/manifest/video.m3u8';
  src_max_dash_1 =
    'https://customer-uoahtvo01gx6knj8.cloudflarestream.com/8cdb0da222dd46dca78400a13ccdf18e/manifest/video.mpd';

  src_max_hls_2 =
    'https://customer-uoahtvo01gx6knj8.cloudflarestream.com/60e748c4eacf31259be1966ad77c1f8e/manifest/video.m3u8';

  src_max_unknown =
    'https://stream.mux.com/XyWaIoimgC9sRnAmhr5BZ500dnJnnsXNTt4UFONEq8F4.m3u8';

  markMode = false;
  progress = 0;
  bufferedProgress = 0;
  markers: Marker[] = [];
  private highlightedMarkerId: string | null = null; // Track the currently highlighted marker
  private markerHighlightTimeout: any; // For clearing timeout

  uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  ngOnInit(): void {
    this.initScene();
    this.initVideo();
    this.animate();
    this.updateProgress();
  }

  private initVideo() {
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    // this.video.src = this.src5;
    // this.video.play();
    if (Hls.isSupported()) {
      this.hls = new Hls({
        startFragPrefetch: true,
        maxBufferLength: 600,
        maxMaxBufferLength: 600,
        maxBufferSize: 4 * 1024 ** 3,
        maxBufferHole: 0.5,
        progressive: true,
        fragLoadingTimeOut: 10000,
        fragLoadingMaxRetry: 5,
      });

      this.hls.loadSource(this.src_max_unknown);
      this.hls.attachMedia(this.video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () =>
        this.video.play().catch(() => {})
      );

      this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        console.log('Сегмент загружен:', data.frag.sn); // порядковый номер сегмента
      });
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = this.src;
      this.video.addEventListener('loadedmetadata', () =>
        this.video.play().catch(() => {})
      );
    }

    this.texture = new THREE.VideoTexture(this.video);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;
    this.texture.repeat.x = -1;
    this.texture.offset.x = 1;

    const geometry = new THREE.SphereGeometry(50, 64, 64);
    // geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.BackSide,
    });
    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      VIDEO_CONSTS.DEFAULT_CAMERA_FOW,
      window.innerWidth / window.innerHeight,
      VIDEO_CONSTS.DEFAULT_CAMERA_NEAR,
      VIDEO_CONSTS.DEFAULT_CAMERA_FAR
    );
    this.camera.position.set(0, 0, 0.1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    // this.controls.enableDamping = true;
    // this.controls.maxZoom = 50;
    // this.controls.maxZoom = 1;
    // this.controls.minZoom = 1;
    // this.controls.maxDistance = 50;
    // this.controls.minDistance = 0.01;

    this.renderer.domElement.addEventListener('wheel', (event) => {
      event.preventDefault();
      const zoomSpeed = 1.0;

      // Scrolling forward (deltaY < 0) means zooming in (decreasing FOV)
      // Scrolling backward (deltaY > 0) means zooming out (increasing FOV)
      if (event.deltaY < 0) {
        this.camera.fov = Math.max(1, this.camera.fov - zoomSpeed);
      } else {
        this.camera.fov = Math.min(120, this.camera.fov + zoomSpeed);
      }

      this.camera.updateProjectionMatrix();
    });

    this.renderer.domElement.addEventListener('click', (event) => {
      if (!this.markMode) return;

      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.sphere, false);

      if (intersects.length > 0) {
        const point = intersects[0].point.clone();
        const marker = this.createMarker();
        marker.position.copy(point);
        marker.visible = false; // по умолчанию скрыт
        this.scene.add(marker);

        this.markers.push({
          id: marker.name,
          time: this.video.currentTime,
          position: point,
          mesh: marker,
        });
      }
    });
  }

  private createMarker(): THREE.Mesh {
    const geom = new THREE.SphereGeometry(0.5, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(geom, mat);
    marker.name = `marker-${this.uid()}`; // Assign unique ID to mesh
    return marker;

    // return new THREE.Mesh(geom, mat);
  }

  toggleMarking() {
    this.markMode = !this.markMode;
  }

  goToMarker(marker: Marker) {
    this.video.currentTime = marker.time;
    this.pauseVideo(); // Start playing if paused

    // Highlight the clicked marker for a short duration
    this.highlightedMarkerId = marker.id;

    // Clear any previous timeout to avoid multiple markers being active
    // if (this.markerHighlightTimeout) {
    //   clearTimeout(this.markerHighlightTimeout);
    // }

    // Set a new timeout to hide the marker after markerDisplayDuration
    // this.markerHighlightTimeout = setTimeout(() => {
    //   this.highlightedMarkerId = null;
    // }, this.markerDisplayDuration * 1000); // Convert seconds to milliseconds

    // this.controls.target.copy(marker.position);
    // this.controls.update();

    // this.camera.fov = VIDEO_CONSTS.DEFAULT_CAMERA_FOW;
    // this.camera.updateProjectionMatrix();

    const controlsEnabledState = this.controls.enabled;
    // Временно отключаем OrbitControls
    // this.controls.enabled = false;

    // Направляем камеру прямо на маркер, не меняя ее положения
    this.camera.lookAt(marker.position);

    // Восстанавливаем исходное состояние controls.enabled
    // this.controls.enabled = true;
    // Обновляем OrbitControls, чтобы синхронизировать его с новой ориентацией камеры
    // (target остается прежним, поэтому центр вращения не меняется)
    this.controls.update();

    this.camera.fov = VIDEO_CONSTS.DEFAULT_CAMERA_FOW;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();

    // обновляем видимость маркеров
    this.updateMarkers();
    // this.camera.
    // const x = new THREE.Vector3();
    // this.camera.lookAt(x);

    this.renderer.render(this.scene, this.camera);
  };

  private updateMarkers() {
    const currentTime = this.video.currentTime;
    this.markers.forEach((marker) => {
      // marker.mesh.visible = Math.abs(currentTime - marker.time) < 0.02;
      marker.mesh.visible = currentTime === marker.time;
    });
  }

  // private updateProgress() {
  //   requestAnimationFrame(() => this.updateProgress());
  //   if (!this.video.duration) return;
  //   this.progress = (this.video.currentTime / this.video.duration) * 100;
  // }

  private updateProgress() {
    requestAnimationFrame(() => this.updateProgress());
    if (!this.video.duration) {
      this.progress = 0;
      this.bufferedProgress = 0;
      return;
    }
    this.progress = (this.video.currentTime / this.video.duration) * 100;
    let maxRelevantBufferedEnd = 0;
    // Calculate buffered progress
    for (let i = 0; i < this.video.buffered.length; i++) {
      const start = this.video.buffered.start(i);
      const end = this.video.buffered.end(i);

      // Case 1: The current time falls within this buffered range.
      // The buffered bar should extend to the end of this range.
      if (start <= this.video.currentTime && end >= this.video.currentTime) {
        maxRelevantBufferedEnd = end;
        break; // Found the most relevant buffer segment for current time, stop searching.
      }
      // Case 2: This buffered range ends completely *before* the current time.
      // We consider this range's end as a potential highest point *before* any gap,
      // but we continue searching in case a later range contains currentTime.
      else if (end < this.video.currentTime) {
        maxRelevantBufferedEnd = Math.max(maxRelevantBufferedEnd, end);
      }
      // Case 3: This buffered range starts *after* the current time.
      // This implies `currentTime` is in an unbuffered gap, or before any buffer.
      // In this case, the `maxRelevantBufferedEnd` should reflect only what was buffered
      // *before* this gap (or 0 if no buffer before).
      else if (start > this.video.currentTime) {
        // We've found a gap or only future buffered segments.
        // The visible buffered progress should stop at `maxRelevantBufferedEnd` found so far.
        break; // Stop iterating.
      }
    }
    this.bufferedProgress =
      (maxRelevantBufferedEnd / this.video.duration) * 100;
  }

  seekVideo(event: MouseEvent) {
    const timeline = this.timelineRef.nativeElement;
    const rect = timeline.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = clickX / rect.width;
    const newTime = percent * this.video.duration;

    this.video.currentTime = newTime;
    this.progress = percent * 100;
    this.bufferedProgress = 0;

    // if (this.markerHighlightTimeout) {
    //   clearTimeout(this.markerHighlightTimeout);
    // }
    this.highlightedMarkerId = null;
    this.updateProgress();
  }

  playVideo() {
    this.video.play().catch((err) => console.warn('Autoplay prevented:', err));
  }

  pauseVideo() {
    this.video.pause();
  }

  ngOnDestroy(): void {
    if (this.hls) this.hls.destroy();
    this.video.pause();
    this.texture.dispose();
    this.renderer.dispose();
  }
}
