import { useState, useCallback } from 'react';

export interface AtmosphereConfig {
  atmosphere: {
    brightnessShift: number;
    hueShift: number;
    saturationShift: number;
    lightIntensity: number;
  };
  skyAtmosphere: {
    brightnessShift: number;
    hueShift: number;
    saturationShift: number;
  };
  logo: {
    scale: number; // Scale factor for the logo (0.5 to 3.0)
  };
  bloom: {
    enabled: boolean;
    contrast: number;    // -255 to 255, affects bloom contrast
    brightness: number;  // -1 to 1, adds to brightness
    glowOnly: boolean;   // If true, shows only the glow effect
    delta: number;       // 0.1 to 5.0, blur spread factor
    sigma: number;       // 0.5 to 10.0, gaussian blur strength
    stepSize: number;    // 0.1 to 5.0, sampling step size
  };
  scattering: {
    rayleighR: number;
    rayleighG: number;
    rayleighB: number;
    mieScattering: number;
    mieAnisotropy: number;
    rayleighScaleHeight: number; // meters - controls blue atmosphere thickness
    mieScaleHeight: number; // meters - controls haze layer thickness
  };
  animation: {
    enabled: boolean;
    pulseSpeed: number;
    pulseAmount: number;
    baseBrightness: number;
  };
  lighting: {
    fadeOutDistance: number;
    fadeInDistance: number;
    dynamicAtmosphereLighting: boolean; // Use sun position for atmosphere lighting
    dynamicAtmosphereLightingFromSun: boolean; // Use actual sun position
    minimumBrightness: number; // 0-1, minimum brightness when on night side
    nightIntensity: number; // 0-1, atmosphere intensity on night side
    twilightAngle: number; // Degrees, angle for twilight transition
  };
  sunPosition: {
    enabled: boolean;
    azimuth: number;
    elevation: number;
    intensity: number;
  };
  sunVisuals: {
    showSun: boolean;
    glowSize: number;
    colorTemperature: number; // 0-1 (0=cool, 0.5=neutral, 1=warm)
  };
  timeOfDay: {
    enabled: boolean;
    hour: number; // 0-24
    animationSpeed: number; // multiplier for time progression
  };
  camera: {
    distance: number; // Distance from globe in meters
    minDistance: number; // Minimum zoom distance
    maxDistance: number; // Maximum zoom distance
  };
  depthLayers: {
    particles: {
      enabled: boolean;
      count: number;
      speed: number;
      sizeMin: number;
      sizeMax: number;
      opacityMin: number;
      opacityMax: number;
    };
    orbitalRings: {
      enabled: boolean;
      count: number;
      opacity: number;
      rotationSpeed: number;
    };
    starField: {
      enabled: boolean;
      count: number;
      brightness: number;
    };
    clouds: {
      layerCount: number;
      lowOpacity: number;
      midOpacity: number;
      highOpacity: number;
      // Texture controls
      textureScaleX: number;
      textureScaleY: number;
      textureOffsetX: number;
      textureOffsetY: number;
      // Individual layer controls
      lowRotation: number;
      midRotation: number;
      highRotation: number;
      lowSpeed: number;
      midSpeed: number;
      highSpeed: number;
      // Shape controls
      coverage: number;
      density: number;
      feathering: number;
    };
  };
}

const defaultConfig: AtmosphereConfig = {
  atmosphere: {
    brightnessShift: -0.05,  // Subtle darkening for better satellite imagery contrast
    hueShift: 0,  // Neutral - no color shift for realistic colors
    saturationShift: 0.15,  // Reduced from 0.54 to prevent blue oversaturation
    lightIntensity: 10,  // Reduced to let satellite imagery show through
  },
  skyAtmosphere: {
    brightnessShift: 0.05,  // Subtle sky glow without washing out globe
    hueShift: -0.01,
    saturationShift: 0.09,
  },
  logo: {
    scale: 3, // Default scale for the logo
  },
  bloom: {
    enabled: false,  // Disabled by default for performance
    contrast: 128,   // Default contrast (neutral)
    brightness: -0.3, // Slight brightness reduction for natural glow
    glowOnly: false, // Mix with original image
    delta: 1.0,      // Default blur spread
    sigma: 2.0,      // Default gaussian blur strength
    stepSize: 1.0,   // Default step size
  },
  scattering: {
    rayleighR: 5.8e-6,
    rayleighG: 13.5e-6,
    rayleighB: 33.1e-6,
    mieScattering: 21e-6,
    mieAnisotropy: -0.1,
    rayleighScaleHeight: 19900, // meters - default atmosphere thickness
    mieScaleHeight: 3550, // meters - default haze layer thickness
  },
  animation: {
    enabled: true,
    pulseSpeed: 0.0008,
    pulseAmount: 0.08,
    baseBrightness: 0.15,
  },
  lighting: {
    fadeOutDistance: 200099999999,
    fadeInDistance: 3,
    dynamicAtmosphereLighting: true, // Enable dynamic sun-based lighting
    dynamicAtmosphereLightingFromSun: false, // Use configured sun position
    minimumBrightness: 0.92, // 92% brightness on night side (eliminates gray overcast)
    nightIntensity: 0.88, // 88% atmosphere intensity (nearly uniform illumination)
    twilightAngle: 10, // 10 degree twilight transition zone
  },
  sunPosition: {
    enabled: true,
    azimuth: 85,
    elevation: 42,
    intensity: 5,
  },
  sunVisuals: {
    showSun: true,
    glowSize: 3,
    colorTemperature: 0.34,
  },
  timeOfDay: {
    enabled: false,
    hour: 12, // noon
    animationSpeed: 1.0,
  },
  camera: {
    distance: 14900000, // 14,900 km default (final position after ease-in)
    minDistance: 100, // 100 meters minimum to allow zooming to landmarks
    maxDistance: 50000000, // 50,000 km maximum
  },
  depthLayers: {
    particles: {
      enabled: false,
      count: 100,
      speed: 0.0001,
      sizeMin: 1,
      sizeMax: 3,
      opacityMin: 0.1,
      opacityMax: 0.3,
    },
    orbitalRings: {
      enabled: false,
      count: 2,
      opacity: 0.15,
      rotationSpeed: 0.0001,
    },
    starField: {
      enabled: false,
      count: 1700,
      brightness: 0.95,
    },
    clouds: {
      layerCount: 3,
      lowOpacity: 0.65,  // Increased from 0.5 for more visible clouds
      midOpacity: 0.4,   // Increased from 0.25
      highOpacity: 0.45, // Increased from 0.31
      // Texture controls
      textureScaleX: 2.4,
      textureScaleY: 2.2,
      textureOffsetX: 0,
      textureOffsetY: 0,
      // Individual layer controls
      lowRotation: 31,
      midRotation: 58,
      highRotation: 0,
      lowSpeed: 0,
      midSpeed: 0,
      highSpeed: 0.001,
      // Shape controls
      coverage: 0.8,
      density: 0.7,
      feathering: 0.5,
    },
  },
};

export const presets: Record<string, AtmosphereConfig> = {
  default: defaultConfig,
  space: {
    ...defaultConfig,
    logo: {
      scale: 1.0,
    },
    bloom: {
      enabled: true,     // Enable bloom for space view
      contrast: 150,     // Higher contrast for space
      brightness: -0.2,  // Slightly brighter bloom
      glowOnly: false,
      delta: 1.5,        // Wider blur for space glow
      sigma: 3.0,        // Stronger blur for ethereal effect
      stepSize: 1.2,     // Larger steps for performance
    },
    atmosphere: {
      brightnessShift: 0.2,
      hueShift: -0.15,
      saturationShift: 0.5,
      lightIntensity: 4.0,
    },
    skyAtmosphere: {
      brightnessShift: 0.15,
      hueShift: -0.1,
      saturationShift: 0.4,
    },
    scattering: {
      rayleighR: 5.8e-6,
      rayleighG: 13.5e-6,
      rayleighB: 40.1e-6,
      mieScattering: 15e-6,
      mieAnisotropy: 0.95,
      rayleighScaleHeight: 10000, // Thicker atmosphere for space view
      mieScaleHeight: 1500, // Extended haze layer
    },
    sunPosition: {
      enabled: true,
      azimuth: 200,
      elevation: 30,
      intensity: 3.0,
    },
    sunVisuals: {
      showSun: true,
      glowSize: 1.5,
      colorTemperature: 0.3, // Cool for space
    },
    timeOfDay: {
      enabled: false,
      hour: 12,
      animationSpeed: 1.0,
    },
    camera: {
      distance: 25000000, // Farther for space view
      minDistance: 100, // Allow close zooming
      maxDistance: 50000000,
    },
    depthLayers: {
      particles: {
        enabled: true,
        count: 200,
        speed: 0.00015,
        sizeMin: 0.8,
        sizeMax: 4,
        opacityMin: 0.05,
        opacityMax: 0.25,
      },
      orbitalRings: {
        enabled: false,
        count: 3,
        opacity: 0.2,
        rotationSpeed: 0.00015,
      },
      starField: {
        enabled: true,
        count: 1000,
        brightness: 0.9,
      },
      clouds: {
        layerCount: 3,
        lowOpacity: 0.5,
        midOpacity: 0.25,
        highOpacity: 0.1,
        textureScaleX: 3.0,
        textureScaleY: 1.5,
        textureOffsetX: 0,
        textureOffsetY: 0,
        lowRotation: 15,
        midRotation: 60,
        highRotation: 120,
        lowSpeed: 0.008,
        midSpeed: 0.015,
        highSpeed: 0.02,
        coverage: 0.75,
        density: 0.6,
        feathering: 0.7,
      },
    },
  },
  cinematic: {
    ...defaultConfig,
    logo: {
      scale: 1.0,
    },
    bloom: {
      enabled: true,     // Enable for cinematic feel
      contrast: 100,     // Softer contrast for cinematic
      brightness: -0.4,  // Darker for moodier look
      glowOnly: false,
      delta: 0.8,        // Tighter blur for cinematic
      sigma: 1.5,        // Moderate blur strength
      stepSize: 0.8,     // Finer steps for quality
    },
    atmosphere: {
      brightnessShift: 0.1,
      hueShift: 0.0,
      saturationShift: 0.6,
      lightIntensity: 2.5,
    },
    skyAtmosphere: {
      brightnessShift: 0.05,
      hueShift: 0.0,
      saturationShift: 0.5,
    },
    animation: {
      enabled: true,
      pulseSpeed: 0.0005,
      pulseAmount: 0.05,
      baseBrightness: 0.1,
    },
    sunPosition: {
      enabled: true,
      azimuth: 225,
      elevation: 15,
      intensity: 2.5,
    },
    sunVisuals: {
      showSun: true,
      glowSize: 2.0,
      colorTemperature: 0.7, // Warm for cinematic
    },
    timeOfDay: {
      enabled: false,
      hour: 17, // Late afternoon
      animationSpeed: 0.5,
    },
    camera: {
      distance: 18000000, // Closer for cinematic
      minDistance: 100, // Allow close zooming
      maxDistance: 50000000,
    },
    depthLayers: {
      particles: {
        enabled: true,
        count: 50,
        speed: 0.00005,
        sizeMin: 1.5,
        sizeMax: 2.5,
        opacityMin: 0.15,
        opacityMax: 0.35,
      },
      orbitalRings: {
        enabled: false,
        count: 2,
        opacity: 0.15,
        rotationSpeed: 0.0001,
      },
      starField: {
        enabled: true,
        count: 300,
        brightness: 0.6,
      },
      clouds: {
        layerCount: 3,
        lowOpacity: 0.7,
        midOpacity: 0.4,
        highOpacity: 0.2,
        textureScaleX: 2.5,
        textureScaleY: 1.2,
        textureOffsetX: 0,
        textureOffsetY: 0,
        lowRotation: 0,
        midRotation: 30,
        highRotation: 75,
        lowSpeed: 0.005,
        midSpeed: 0.01,
        highSpeed: 0.015,
        coverage: 0.85,
        density: 0.75,
        feathering: 0.6,
      },
    },
  },
  vibrant: {
    ...defaultConfig,
    logo: {
      scale: 1.0,
    },
    bloom: {
      enabled: true,     // Enable for vibrant look
      contrast: 180,     // High contrast for punch
      brightness: -0.1,  // Brighter bloom for vibrant
      glowOnly: false,
      delta: 2.0,        // Wide blur for vibrant glow
      sigma: 4.0,        // Strong blur for impact
      stepSize: 1.5,     // Balanced for performance
    },
    atmosphere: {
      brightnessShift: 0.25,
      hueShift: -0.2,
      saturationShift: 0.8,
      lightIntensity: 5.0,
    },
    skyAtmosphere: {
      brightnessShift: 0.2,
      hueShift: -0.15,
      saturationShift: 0.7,
    },
    scattering: {
      rayleighR: 4.8e-6,
      rayleighG: 11.5e-6,
      rayleighB: 45.1e-6,
      mieScattering: 25e-6,
      mieAnisotropy: 0.85,
      rayleighScaleHeight: 12000, // Very thick atmosphere for vibrant
      mieScaleHeight: 2000, // Extended haze for depth
    },
    sunPosition: {
      enabled: true,
      azimuth: 135,
      elevation: 60,
      intensity: 4.0,
    },
    sunVisuals: {
      showSun: true,
      glowSize: 1.2,
      colorTemperature: 0.5, // Neutral for vibrant
    },
    timeOfDay: {
      enabled: false,
      hour: 14,
      animationSpeed: 2.0,
    },
    camera: {
      distance: 20000000, // Normal distance
      minDistance: 100, // Allow close zooming
      maxDistance: 50000000,
    },
    depthLayers: {
      particles: {
        enabled: true,
        count: 300,
        speed: 0.0002,
        sizeMin: 1,
        sizeMax: 5,
        opacityMin: 0.1,
        opacityMax: 0.4,
      },
      orbitalRings: {
        enabled: false,
        count: 4,
        opacity: 0.25,
        rotationSpeed: 0.0002,
      },
      starField: {
        enabled: true,
        count: 1500,
        brightness: 1.0,
      },
      clouds: {
        layerCount: 3,
        lowOpacity: 0.8,
        midOpacity: 0.5,
        highOpacity: 0.3,
        textureScaleX: 2.0,
        textureScaleY: 1.0,
        textureOffsetX: 0,
        textureOffsetY: 0,
        lowRotation: 25,
        midRotation: 90,
        highRotation: 180,
        lowSpeed: 0.012,
        midSpeed: 0.02,
        highSpeed: 0.025,
        coverage: 0.9,
        density: 0.8,
        feathering: 0.5,
      },
    },
  },
};

export function useAtmosphereConfig() {
  const [config, setConfig] = useState<AtmosphereConfig>(defaultConfig);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);

  const updateConfig = useCallback((updates: Partial<AtmosphereConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
      atmosphere: {
        ...prev.atmosphere,
        ...(updates.atmosphere || {}),
      },
      skyAtmosphere: {
        ...prev.skyAtmosphere,
        ...(updates.skyAtmosphere || {}),
      },
      scattering: {
        ...prev.scattering,
        ...(updates.scattering || {}),
      },
      animation: {
        ...prev.animation,
        ...(updates.animation || {}),
      },
      lighting: {
        ...prev.lighting,
        ...(updates.lighting || {}),
      },
      sunPosition: {
        ...prev.sunPosition,
        ...(updates.sunPosition || {}),
      },
      logo: {
        ...prev.logo,
        ...(updates.logo || {}),
      },
      bloom: {
        ...prev.bloom,
        ...(updates.bloom || {}),
      },
      depthLayers: {
        particles: {
          ...prev.depthLayers.particles,
          ...(updates.depthLayers?.particles || {}),
        },
        orbitalRings: {
          ...prev.depthLayers.orbitalRings,
          ...(updates.depthLayers?.orbitalRings || {}),
        },
        starField: {
          ...prev.depthLayers.starField,
          ...(updates.depthLayers?.starField || {}),
        },
        clouds: {
          ...prev.depthLayers.clouds,
          ...(updates.depthLayers?.clouds || {}),
        },
      },
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  const loadPreset = useCallback((presetName: string) => {
    const preset = presets[presetName];
    if (preset) {
      setConfig(preset);
    }
  }, []);

  const exportConfig = useCallback(() => {
    const configString = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(configString);
  }, [config]);

  const toggleDebugPanel = useCallback(() => {
    setIsDebugPanelOpen(prev => !prev);
  }, []);

  return {
    config,
    updateConfig,
    resetToDefaults,
    loadPreset,
    exportConfig,
    isDebugPanelOpen,
    toggleDebugPanel,
  };
}