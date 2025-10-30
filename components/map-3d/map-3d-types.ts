/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-explicit-any */

import type React from 'react';

// add an overload signature for the useMapsLibrary hook
declare module '@vis.gl/react-google-maps' {
  export function useMapsLibrary(
    name: 'maps3d'
  ): google.maps.Maps3DLibrary | null;
  export function useMapsLibrary(
    name: 'elevation'
  ): google.maps.ElevationLibrary | null;
}

// Extend global google.maps types for Maps 3D
declare global {
  namespace google.maps {
    // Maps3D Library types
    interface Maps3DLibrary {
      Marker3DInteractiveElement: {
        new (options: any): HTMLElement;
      };
      Marker3DElement: {
        new (options: any): HTMLElement;
      };
    }

    namespace maps3d {
      interface CameraOptions {
        center?: google.maps.LatLngAltitudeLiteral;
        heading?: number;
        range?: number;
        roll?: number;
        tilt?: number;
      }

      interface FlyToAnimationOptions {
        endCamera: CameraOptions;
        durationMillis?: number;
      }

      interface Map3DElement extends HTMLElement {
        mode?: 'HYBRID' | 'SATELLITE';
        flyCameraTo: (options: FlyToAnimationOptions) => void;
        center?: google.maps.LatLngAltitudeLiteral | null;
        heading?: number | null;
        range?: number | null;
        roll?: number | null;
        tilt?: number | null;
        defaultUIHidden?: boolean;
      }

      interface Map3DElementOptions {
        center?: google.maps.LatLngAltitudeLiteral | null;
        heading?: number | null;
        range?: number | null;
        roll?: number | null;
        tilt?: number | null;
        defaultUIHidden?: boolean;
      }
    }
  }
}

// add the <gmp-map-3d> custom-element to JSX
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      ['gmp-map-3d']: Partial<
        google.maps.maps3d.Map3DElement &
          React.DOMAttributes<google.maps.maps3d.Map3DElement> &
          React.RefAttributes<google.maps.maps3d.Map3DElement> & {
            children: any;
          }
      >;
    }
  }
}
