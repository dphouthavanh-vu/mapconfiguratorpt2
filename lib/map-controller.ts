/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Copyright 2024 Google LLC
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

import { Map3DCameraProps } from '@/components/map-3d';
import { lookAtWithPadding } from './look-at';
import { MapMarker } from './map-state';
import { createCustomMarkerElement } from './custom-marker-element';
import { getContrastTextColor } from './color-utils';

type MapControllerDependencies = {
  map: google.maps.maps3d.Map3DElement;
  maps3dLib: google.maps.Maps3DLibrary;
  elevationLib: google.maps.ElevationLibrary;
};

/**
 * A controller class to centralize all interactions with the Google Maps 3D element.
 */
export class MapController {
  private map: google.maps.maps3d.Map3DElement;
  private maps3dLib: google.maps.Maps3DLibrary;
  private elevationLib: google.maps.ElevationLibrary;
  private markerElements: HTMLElement[] = [];

  constructor(deps: MapControllerDependencies) {
    this.map = deps.map;
    this.maps3dLib = deps.maps3dLib;
    this.elevationLib = deps.elevationLib;
  }

  /**
   * Clears all child elements (like markers) from the map.
   */
  clearMap() {
    this.map.innerHTML = '';
    this.markerElements = [];
  }

  /**
   * Adds a list of markers to the map.
   * @param markers - An array of marker data to be rendered.
   * @param onMarkerClick - Optional callback when a marker is clicked.
   */
  addMarkers(markers: MapMarker[], onMarkerClick?: (index: number, label: string) => void) {
    console.log('[MapController] addMarkers called with', markers.length, 'markers');
    console.log('[MapController] onMarkerClick callback provided:', !!onMarkerClick);
    this.markerElements = [];

    markers.forEach((markerData, index) => {
      console.log('[MapController] Creating marker', index, ':', markerData.label);

      // Get colors with fallbacks
      const markerColor = markerData.color || '#34A853'; // Default green from Apple Maps style
      const markerAccentColor = markerData.accentColor || '#2E7D32'; // Default dark green
      const textColor = markerData.textColor || getContrastTextColor(markerColor);

      // Create custom SVG marker element
      const svgMarker = createCustomMarkerElement({
        label: markerData.label,
        color: markerColor,
        accentColor: markerAccentColor,
        textColor: textColor,
        showLabel: markerData.showLabel,
      });

      // Create Google Maps 3D Marker3DInteractiveElement (required for click events)
      const marker = new this.maps3dLib.Marker3DInteractiveElement({
        position: markerData.position,
        altitudeMode: 'RELATIVE_TO_MESH',
        drawsWhenOccluded: true,
      });

      // Add click handlers to SVG FIRST
      if (onMarkerClick) {
        console.log('[MapController] Adding click listeners to marker', index);

        // Add click handler to SVG
        svgMarker.addEventListener('click', (event) => {
          console.log('[MapController] SVG CLICK!', markerData.label);
          event.stopPropagation();
          onMarkerClick(index, markerData.label);
        });

        svgMarker.addEventListener('mousedown', (event) => {
          console.log('[MapController] SVG MOUSEDOWN!', markerData.label);
        });

        svgMarker.addEventListener('mouseenter', () => {
          console.log('[MapController] SVG HOVER!', markerData.label);
        });
      }

      // Create template element and append SVG directly (no wrapper div)
      // Google Maps 3D API requires template content to be HTMLImageElement or SVGElement
      const template = document.createElement('template');
      template.content.appendChild(svgMarker);

      // Append template to marker
      marker.appendChild(template);

      console.log('[MapController] Custom marker created:', marker);

      // Append marker to map
      this.map.appendChild(marker);
      this.markerElements.push(marker);
      console.log('[MapController] Marker appended to map');

      // Add click handlers to marker element after appending
      if (onMarkerClick) {

        // Strategy 1: Click on the marker element itself
        marker.addEventListener('click', (event) => {
          console.log('[MapController] MARKER ELEMENT CLICK!', markerData.label, 'index:', index);
          console.log('[MapController] Event details:', event);
          onMarkerClick(index, markerData.label);
        });

        // Strategy 2: Google Maps specific click event
        marker.addEventListener('gmp-click', (event) => {
          console.log('[MapController] GMP-CLICK EVENT!', markerData.label);
          onMarkerClick(index, markerData.label);
        });

        // Strategy 3: Wait for the marker to fully render in shadow DOM
        // Use requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
          const svg = marker.querySelector('svg');
          if (svg) {
            console.log('[MapController] Found SVG in shadow DOM after render');

            // Make sure SVG can receive pointer events
            svg.style.pointerEvents = 'auto';
            svg.style.cursor = 'pointer';

            svg.addEventListener('click', (event) => {
              console.log('[MapController] SVG IN SHADOW DOM CLICK!', markerData.label);
              event.stopPropagation();
              onMarkerClick(index, markerData.label);
            });

            // Also add to all child elements to ensure clicks are captured
            const allElements = svg.querySelectorAll('*');
            allElements.forEach(el => {
              (el as HTMLElement).style.pointerEvents = 'auto';
            });
          } else {
            console.warn('[MapController] Could not find SVG in marker shadow DOM after render');

            // Try using a longer delay
            setTimeout(() => {
              const svgDelayed = marker.querySelector('svg');
              if (svgDelayed) {
                console.log('[MapController] Found SVG in shadow DOM after delay');
                svgDelayed.style.pointerEvents = 'auto';
                svgDelayed.style.cursor = 'pointer';
                svgDelayed.addEventListener('click', (event) => {
                  console.log('[MapController] SVG DELAYED CLICK!', markerData.label);
                  event.stopPropagation();
                  onMarkerClick(index, markerData.label);
                });
              }
            }, 500);
          }
        });

        // Strategy 4: Set pointer events on marker
        marker.style.pointerEvents = 'auto';
        marker.style.cursor = 'pointer';
      }
    });

    console.log('[MapController] Total markers added:', this.markerElements.length);
  }

  /**
   * Get all marker elements
   */
  getMarkerElements() {
    return this.markerElements;
  }

  /**
   * Animate the camera to a specific set of camera properties.
   * @param cameraProps - The target camera position, range, tilt, etc.
   */
  flyTo(cameraProps: Map3DCameraProps) {
    this.map.flyCameraTo({
      durationMillis: 5000,
      endCamera: {
        center: {
          lat: cameraProps.center.lat,
          lng: cameraProps.center.lng,
          altitude: cameraProps.center.altitude,
        },
        range: cameraProps.range,
        heading: cameraProps.heading,
        tilt: cameraProps.tilt,
        roll: cameraProps.roll,
      },
    });
  }

  /**
   * Calculates the optimal camera view to frame a set of entities and animates to it.
   * @param entities - An array of entities to frame (must have a `position` property).
   * @param padding - The padding to apply around the entities.
   */
  async frameEntities(
    entities: { position: { lat: number; lng: number } }[],
    padding: [number, number, number, number],
  ) {
    if (entities.length === 0) return;

    const elevator = new this.elevationLib.ElevationService();
    const cameraProps = await lookAtWithPadding(
      entities.map(e => e.position),
      elevator,
      0, // heading
      padding,
    );

    this.flyTo({
      center: {
        lat: cameraProps.lat,
        lng: cameraProps.lng,
        altitude: cameraProps.altitude,
      },
      range: cameraProps.range + 1000, // Add a bit of extra range
      heading: cameraProps.heading,
      tilt: cameraProps.tilt,
      roll: 0,
    });
  }
}
