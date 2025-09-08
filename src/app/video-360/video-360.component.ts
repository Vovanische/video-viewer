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

  src5 = 'https://bnc5m8rz-3000.euw.devtunnels.ms/uploads/output/wind_HEVC.mp4';
  // https://drive.google.com/file/d/1OhCsGiM9bFSzj8q1cKmanHdE7xOLD2gW/view?usp=drive_link
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing.
  // https://drive.google.com/file/d/1fYjh0mLqUMAicwOI2n_IyiPVteJVc64C/view?usp=sharing
  markMode = false;
  progress = 0;
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
    this.video.src = this.src3;
    this.video.play();
    // if (Hls.isSupported()) {
    //   this.hls = new Hls({
    //     startFragPrefetch: true,
    //     maxBufferLength: 600,
    //     maxMaxBufferLength: 600,
    //     maxBufferSize: 4 * 1024 ** 3,
    //     maxBufferHole: 0.5,
    //     progressive: true,
    //     fragLoadingTimeOut: 10000,
    //     fragLoadingMaxRetry: 5,
    //   });

    //   this.hls.loadSource(this.src);
    //   this.hls.attachMedia(this.video);
    //   this.hls.on(Hls.Events.MANIFEST_PARSED, () =>
    //     this.video.play().catch(() => {})
    //   );

    //   this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
    //     console.log('Сегмент загружен:', data.frag.sn); // порядковый номер сегмента

    //     // при желании можно отслеживать, какие сегменты уже загружены
    //   });
    // } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
    //   this.video.src = this.src;
    //   this.video.addEventListener('loadedmetadata', () =>
    //     this.video.play().catch(() => {})
    //   );
    // }

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
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
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

  private updateProgress() {
    requestAnimationFrame(() => this.updateProgress());
    if (!this.video.duration) return;
    this.progress = (this.video.currentTime / this.video.duration) * 100;
  }

  seekVideo(event: MouseEvent) {
    const timeline = this.timelineRef.nativeElement;
    const rect = timeline.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = clickX / rect.width;
    const newTime = percent * this.video.duration;

    this.video.currentTime = newTime;
    this.progress = percent * 100;

    // if (this.markerHighlightTimeout) {
    //   clearTimeout(this.markerHighlightTimeout);
    // }
    this.highlightedMarkerId = null;
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
