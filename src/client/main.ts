import type { InitResponse } from '../shared/api';

declare global {
  interface Window {
    Module: any;
    GM_tick?: (time: number) => void;
    onGameSetWindowSize?: (width: number, height: number) => void;
    manifestFiles?: () => string;
    manifestFilesMD5?: () => string[];
    log_next_game_state?: () => void;
    wallpaper_update_config?: (config: string) => void;
    wallpaper_reset_config?: () => void;
    setAddAsyncMethod?: (method: any) => void;
    setJSExceptionHandler?: (handler: any) => void;
    hasJSExceptionHandler?: () => boolean;
    doJSExceptionHandler?: (exceptionJSON: string) => void;
    setWadLoadCallback?: (callback: any) => void;
    onFirstFrameRendered?: () => void;
    triggerAd?: (adId: string, ...callbacks: any[]) => void;
    triggerPayment?: (itemId: string, callback: any) => void;
    toggleElement?: (id: string) => void;
    set_acceptable_rollback?: (frames: number) => void;
    report_stats?: (statsData: any) => void;
    g_pAddAsyncMethod?: any;
    g_pJSExceptionHandler?: any;
    g_pWadLoadCallback?: any;
  }
}

// This is the manifest file data structure for type checking security
type RunnerManifest = {
  manifestFiles: string[];
  manifestFilesMD5: string[];
  mainJS?: string;
  unx?: string;
  index?: string;
  runner?: { version?: string; yyc?: boolean };
};

class GameLoader {
  private statusElement: HTMLElement;
  private progressElement: HTMLProgressElement;
  private spinnerElement: HTMLElement;
  private canvasElement: HTMLCanvasElement;
  private loadingElement: HTMLElement;
  private startingHeight?: number;
  private startingWidth?: number;
  private startingAspect?: number;

  constructor() {
    this.statusElement = document.getElementById('status') as HTMLElement;
    this.progressElement = document.getElementById(
      'progress'
    ) as HTMLProgressElement;
    this.spinnerElement = document.getElementById('spinner') as HTMLElement;
    this.canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    this.loadingElement = document.getElementById('loading') as HTMLElement;

    this.canvasElement.addEventListener('click', () => {
      this.canvasElement.focus();
    });

    this.setupModule();
    this.setupResizeObserver();
    this.loadGame();
  }

  private setupModule() {
    window.Module = {
      preRun: [],
      postRun: [],
      print: (text: string) => {
        console.log(text);
        if (text === 'Entering main loop.') {
          this.ensureAspectRatio();
        }
      },
      printErr: (text: string) => {
        console.error(text);
      },
      canvas: this.canvasElement,
      setStatus: (text: string) => {
        if (!window.Module.setStatus.last) {
          window.Module.setStatus.last = { time: Date.now(), text: '' };
        }
        if (text === window.Module.setStatus.last.text) return;

        const m = text.match(/([^(]+)\((\d+(?:\.\d+)?)\/(\d+)\)/);
        const now = Date.now();
        if (m && now - window.Module.setStatus.last.time < 30) return;

        window.Module.setStatus.last.time = now;
        window.Module.setStatus.last.text = text;

        if (m) {
          this.progressElement.value = parseInt(m[2]!) * 100;
          this.progressElement.max = parseInt(m[3]!) * 100;
          this.progressElement.hidden = false;
          this.spinnerElement.hidden = false;
        } else {
          this.progressElement.value = 0;
          this.progressElement.max = 100;
          this.progressElement.hidden = true;

          if (!text) {
            this.spinnerElement.style.display = 'none';
            this.canvasElement.style.display = 'block';
            this.loadingElement.style.display = 'none';
          }
        }
        this.statusElement.innerHTML = text;
      },
      totalDependencies: 0,
      monitorRunDependencies: (left: number) => {
        window.Module.totalDependencies = Math.max(
          window.Module.totalDependencies,
          left
        );
        window.Module.setStatus(
          left
            ? `Preparing... (${window.Module.totalDependencies - left}/${window.Module.totalDependencies})`
            : 'All downloads complete.'
        );
      },
    };

    window.Module.setStatus('Downloading...');

    window.onerror = () => {
      window.Module.setStatus('Exception thrown, see JavaScript console');
      this.spinnerElement.style.display = 'none';
      window.Module.setStatus = (text: string) => {
        if (text) window.Module.printErr(`[post-exception status] ${text}`);
      };
    };

    if (typeof window === 'object') {
      window.Module.arguments = window.location.search
        .substr(1)
        .trim()
        .split('&');
      if (!window.Module.arguments[0]) {
        window.Module.arguments = [];
      }
    }
  }

  private setupResizeObserver() {
    window.onGameSetWindowSize = (width: number, height: number) => {
      console.log(`Window size set to width: ${width}, height: ${height}`);
      this.startingHeight = height;
      this.startingWidth = width;
      this.startingAspect = this.startingWidth / this.startingHeight;
    };

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => this.ensureAspectRatio());
      setTimeout(
        () => window.requestAnimationFrame(() => this.ensureAspectRatio()),
        100
      );
    });
    resizeObserver.observe(document.body);

    if (/Android|iPhone|iPod/i.test(navigator.userAgent)) {
      document.body.classList.add('scrollingDisabled');
    }
  }

  private ensureAspectRatio() {
    if (!this.canvasElement || !this.startingHeight || !this.startingWidth) {
      return;
    }

    this.canvasElement.classList.add('active');

    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    let newHeight: number, newWidth: number;

    const heightQuotient = this.startingHeight / maxHeight;
    const widthQuotient = this.startingWidth / maxWidth;

    if (heightQuotient > widthQuotient) {
      newHeight = maxHeight;
      newWidth = newHeight * this.startingAspect!;
    } else {
      newWidth = maxWidth;
      newHeight = newWidth / this.startingAspect!;
    }

    this.canvasElement.style.height = '100%'; //`${newHeight}px`;
    this.canvasElement.style.width = '100%'; //`${newWidth}px`;
  }

  private async loadRunnerManifest(): Promise<void> {
    try {
      const res = await fetch('/runner.json', {
        credentials: 'include', // keep Devvit context; same-origin
        cache: 'no-cache', // avoid stale manifest after deploys
      });
      if (!res.ok) throw new Error(`runner.json HTTP ${res.status}`);
      const manifest = (await res.json()) as RunnerManifest;

      // Basic validation
      if (
        !Array.isArray(manifest.manifestFiles) ||
        !Array.isArray(manifest.manifestFilesMD5)
      ) {
        throw new Error('runner.json missing arrays');
      }
      if (manifest.manifestFiles.length !== manifest.manifestFilesMD5.length) {
        console.warn(
          '[runner.json] manifestFiles and manifestFilesMD5 length mismatch'
        );
      }

      // Wire the global getters from the manifest
      window.manifestFiles = () => manifest.manifestFiles.join(';');
      window.manifestFilesMD5 = () => manifest.manifestFilesMD5.slice(); // return a copy
    } catch (e) {
      console.warn(
        'Falling back to hardcoded manifest (runner.json not available):',
        e
      );

      // Fallback to current hardcoded values (this should never happen)
      window.manifestFiles = () =>
        [
          'runner.data',
          'runner.js',
          'runner.wasm',
          'audio-worklet.js',
          'game.unx',
        ].join(';');

      window.manifestFilesMD5 = () => [
        '585214623b669175a702fed30de7d21d',
        '8669aa66d44cfb4f13a098cd6b0296e1',
        'd29ac123833b56dcfbe188f10e5ecb85',
        'e8f1e8db8cf996f8715a6f2164c2e44e',
        '00a26996df3ce310bb5836ef7f4b0e3c',
      ];
    }
  }

  private setupGameMakerGlobals() {
    // GameMaker async method support - make variables globally accessible
    window.g_pAddAsyncMethod = -1;
    window.setAddAsyncMethod = (asyncMethod: any) => {
      window.g_pAddAsyncMethod = asyncMethod;
      console.log('setAddAsyncMethod called with:', asyncMethod);
    };

    // Exception handling - make variables globally accessible
    window.g_pJSExceptionHandler = undefined;
    window.setJSExceptionHandler = (exceptionHandler: any) => {
      if (typeof exceptionHandler === 'function') {
        window.g_pJSExceptionHandler = exceptionHandler;
      }
    };

    window.hasJSExceptionHandler = () => {
      return (
        window.g_pJSExceptionHandler !== undefined &&
        typeof window.g_pJSExceptionHandler === 'function'
      );
    };

    window.doJSExceptionHandler = (exceptionJSON: string) => {
      if (typeof window.g_pJSExceptionHandler === 'function') {
        const exception = JSON.parse(exceptionJSON);
        window.g_pJSExceptionHandler(exception);
      }
    };

    // WAD/Resource loading - make variables globally accessible
    window.g_pWadLoadCallback = undefined;
    window.setWadLoadCallback = (wadLoadCallback: any) => {
      window.g_pWadLoadCallback = wadLoadCallback;
    };

    window.onFirstFrameRendered = () => {
      console.log('First frame rendered!');
    };

    // Ad system stubs
    window.triggerAd = (adId: string, ...callbacks: any[]) => {
      console.log('triggerAd called with adId:', adId);
      // For now, just call the callbacks to simulate ad completion
      if (callbacks.length > 0 && typeof callbacks[0] === 'function') {
        setTimeout(() => callbacks[0](), 100);
      }
    };

    window.triggerPayment = (itemId: string, callback: any) => {
      console.log('triggerPayment called with itemId:', itemId);
      // Simulate payment completion
      if (typeof callback === 'function') {
        setTimeout(() => callback({ id: itemId }), 1000);
      }
    };

    // UI utility functions
    window.toggleElement = (id: string) => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.style.display = elem.style.display === 'block' ? 'none' : 'block';
      }
    };

    // Multiplayer/networking stubs
    // @ts-expect-error - here to show as an example
    let acceptable_rollback_frames = 0;
    window.set_acceptable_rollback = (frames: number) => {
      acceptable_rollback_frames = frames;
      console.log('Set acceptable rollback frames:', frames);
    };

    window.report_stats = (statsData: any) => {
      console.log('Game stats reported:', statsData);
    };

    window.log_next_game_state = () => {
      console.log('Game state logging requested');
    };

    window.wallpaper_update_config = (config: string) => {
      console.log('Wallpaper config update:', config);
    };

    window.wallpaper_reset_config = () => {
      console.log('Wallpaper config reset');
    };

    // Mock accelerometer API to prevent permissions policy violations
    if (!('DeviceMotionEvent' in window)) {
      (window as any).DeviceMotionEvent = class MockDeviceMotionEvent extends (
        Event
      ) {
        constructor(type: string, eventInitDict?: any) {
          super(type, eventInitDict);
        }
      };
    }

    if (!('DeviceOrientationEvent' in window)) {
      (window as any).DeviceOrientationEvent =
        class MockDeviceOrientationEvent extends Event {
          constructor(type: string, eventInitDict?: any) {
            super(type, eventInitDict);
          }
        };
    }
  }

  private async loadGame() {
    try {
      // First try to get initial data from the server
      await this.fetchInitialData();

      // Load manifest data that GameMaker runtime expects
      await this.loadRunnerManifest();

      // Setup required global functions before loading GameMaker script
      this.setupGameMakerGlobals();

      // Load the GameMaker runner script
      const script = document.createElement('script');
      script.src = '/runner.js';
      script.async = true;
      script.type = 'text/javascript';

      script.onload = () => {
        console.log('Game script loaded successfully');
      };

      script.onerror = (error) => {
        console.error('Failed to load game script:', error);
        this.statusElement.textContent = 'Failed to load game';
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading game:', error);
      this.statusElement.textContent = 'Error loading game';
    }
  }

  private async fetchInitialData() {
    try {
      const response = await fetch('/api/init');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as InitResponse;
      if (data.type === 'init') {
        console.log(
          `Game initialized for user: ${data.username}, post: ${data.postId}`
        );
      } else {
        console.error('Invalid response type from /api/init', data);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }
}

// Initialize the game when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GameLoader());
} else {
  new GameLoader();
}
