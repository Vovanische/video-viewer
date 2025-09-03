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
  time: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
}

@Component({
  selector: 'app-video360',
  standalone: true,
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
  private cylinder!: THREE.Mesh;

  markMode = false;
  progress = 0;
  markers: Marker[] = [];

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

    const src = 'assets/video360.m3u8';

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

      this.hls.loadSource(src);
      this.hls.attachMedia(this.video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () =>
        this.video.play().catch(() => {})
      );

      this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        console.log('Сегмент загружен:', data.frag.sn); // порядковый номер сегмента

        // при желании можно отслеживать, какие сегменты уже загружены
      });
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = src;
      this.video.addEventListener('loadedmetadata', () =>
        this.video.play().catch(() => {})
      );
    }

    this.texture = new THREE.VideoTexture(this.video);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;

    const geometry = new THREE.SphereGeometry(50, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.BackSide,
    });
    this.cylinder = new THREE.Mesh(geometry, material);
    this.scene.add(this.cylinder);
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

    this.renderer.domElement.addEventListener('click', (event) => {
      if (!this.markMode) return;

      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.cylinder, false);

      if (intersects.length > 0) {
        const point = intersects[0].point.clone();
        const marker = this.createMarker();
        marker.position.copy(point);
        marker.visible = false; // по умолчанию скрыт
        this.scene.add(marker);

        this.markers.push({
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
    return new THREE.Mesh(geom, mat);
  }

  toggleMarking() {
    this.markMode = !this.markMode;
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();

    // обновляем видимость маркеров
    this.updateMarkers();

    this.renderer.render(this.scene, this.camera);
  };

  private updateMarkers() {
    const currentTime = this.video.currentTime;
    this.markers.forEach((marker) => {
      marker.mesh.visible = Math.abs(currentTime - marker.time) < 1;
      // показываем, если текущее время в пределах ±1 секунды от времени маркера
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
