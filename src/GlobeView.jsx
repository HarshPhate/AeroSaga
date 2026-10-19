
import { useEffect, useMemo, useRef } from "react";
import { Viewer, Entity, Globe } from "resium";
import {
  Cartesian3,
  Color,
  ArcType,
  UrlTemplateImageryProvider,
} from "cesium";

// Coordinates for locations supported by this demo.
const locations = {
  vijayawada: { longitude: 80.648, latitude: 16.506 },
  guntur: { longitude: 80.4365, latitude: 16.3067 },
  tenali: { longitude: 80.64, latitude: 16.243 },
};

const fleet = [
  {
    id: "DRONE-01",
    location: "Vijayawada",
    longitude: 80.648,
    latitude: 16.506,
    color: Color.LIME,
  },
  {
    id: "DRONE-02",
    location: "Guntur",
    longitude: 80.4365,
    latitude: 16.3067,
    color: Color.DODGERBLUE,
  },
  {
    id: "DRONE-03",
    location: "Tenali",
    longitude: 80.64,
    latitude: 16.243,
    color: Color.ORANGE,
  },
];

function findLocation(name, fallback) {
  if (!name) return fallback;

  return locations[name.trim().toLowerCase()] ?? fallback;
}

function GlobeView({
  progress = 0,
  mission = null,
  height = 420,
  showFleet,
}) {
  const viewerRef = useRef(null);

  // When a mission is supplied, render its route.
  // Otherwise, render the overview fleet map.
  const isMissionView = Boolean(mission);
  const displayFleet = showFleet ?? !isMissionView;

  const droneId =
    mission?.droneId ??
    mission?.selectedDrone ??
    mission?.drone?.id ??
    "DRONE-01";

  const pickupName =
    mission?.pickupLocation ??
    mission?.pickup ??
    mission?.startPoint ??
    "Vijayawada";

  const destinationName =
    mission?.deliveryLocation ??
    mission?.destination ??
    mission?.endPoint ??
    "Guntur";

  const pickup = findLocation(
    pickupName,
    locations.vijayawada
  );

  const destination = findLocation(
    destinationName,
    locations.guntur
  );

  const routeProgress = Math.max(
    0,
    Math.min(100, Number(progress) || 0)
  ) / 100;

  const currentPosition = useMemo(
    () => ({
      longitude:
        pickup.longitude +
        (destination.longitude - pickup.longitude) *
          routeProgress,
      latitude:
        pickup.latitude +
        (destination.latitude - pickup.latitude) *
          routeProgress,
    }),
    [
      pickup.longitude,
      pickup.latitude,
      destination.longitude,
      destination.latitude,
      routeProgress,
    ]
  );

  useEffect(() => {
    let frameId;
    let cancelled = false;

    const setupImagery = () => {
      if (cancelled) return;

      const viewer = viewerRef.current?.cesiumElement;

      if (!viewer || viewer.isDestroyed()) {
        frameId = requestAnimationFrame(setupImagery);
        return;
      }

      viewer.imageryLayers.removeAll();

      const provider = new UrlTemplateImageryProvider({
        url:
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        credit: "Tiles © Esri",
        maximumLevel: 19,
      });

      viewer.imageryLayers.addImageryProvider(provider);
      viewer.scene.requestRender();
    };

    frameId = requestAnimationFrame(setupImagery);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Fly to the selected mission, or show the full fleet.
  useEffect(() => {
    let frameId;
    let cancelled = false;

    const setCamera = () => {
      if (cancelled) return;

      const viewer = viewerRef.current?.cesiumElement;

      if (!viewer || viewer.isDestroyed()) {
        frameId = requestAnimationFrame(setCamera);
        return;
      }

      if (isMissionView) {
        const centerLongitude =
          (pickup.longitude + destination.longitude) / 2;
        const centerLatitude =
          (pickup.latitude + destination.latitude) / 2;

        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(
            centerLongitude,
            centerLatitude,
            45000
          ),
          duration: 1,
        });
      } else {
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(
            80.55,
            16.38,
            350000
          ),
          duration: 1,
        });
      }
    };

    frameId = requestAnimationFrame(setCamera);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [
    isMissionView,
    pickup.longitude,
    pickup.latitude,
    destination.longitude,
    destination.latitude,
  ]);

  const routePositions = Cartesian3.fromDegreesArray([
    pickup.longitude,
    pickup.latitude,
    destination.longitude,
    destination.latitude,
  ]);

  return (
    <div style={{ height, width: "100%", overflow: "hidden" }}>
      <Viewer
        ref={viewerRef}
        full={false}
        animation={false}
        timeline={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton
        sceneModePicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        style={{ height: "100%", width: "100%" }}
      >
        <Globe enableLighting={false} />

        {/* Full pickup-to-destination route */}
        <Entity
          name={`${pickupName} to ${destinationName} route`}
          polyline={{
            positions: routePositions,
            width: 5,
            material: Color.fromCssColorString("#2563eb"),
            arcType: ArcType.GEODESIC,
            clampToGround: true,
          }}
        />

        {/* Pickup marker */}
        <Entity
          name={`Pickup: ${pickupName}`}
          position={Cartesian3.fromDegrees(
            pickup.longitude,
            pickup.latitude,
            50
          )}
          point={{
            pixelSize: 12,
            color: Color.LIME,
            outlineColor: Color.WHITE,
            outlineWidth: 2,
          }}
          label={{
            text: `PICKUP: ${pickupName}`,
            font: "13px sans-serif",
            fillColor: Color.WHITE,
            showBackground: true,
            backgroundColor: Color.fromCssColorString("#172033"),
            pixelOffset: new Cartesian3(0, -22, 0),
          }}
        />

        {/* Destination marker */}
        <Entity
          name={`Destination: ${destinationName}`}
          position={Cartesian3.fromDegrees(
            destination.longitude,
            destination.latitude,
            50
          )}
          point={{
            pixelSize: 12,
            color: Color.RED,
            outlineColor: Color.WHITE,
            outlineWidth: 2,
          }}
          label={{
            text: `DESTINATION: ${destinationName}`,
            font: "13px sans-serif",
            fillColor: Color.WHITE,
            showBackground: true,
            backgroundColor: Color.fromCssColorString("#172033"),
            pixelOffset: new Cartesian3(0, -22, 0),
          }}
        />

        {isMissionView ? (
          /* Only the selected mission's drone */
          <Entity
            name={droneId}
            position={Cartesian3.fromDegrees(
              routeProgress >= 1
                ? destination.longitude
                : currentPosition.longitude,
              routeProgress >= 1
                ? destination.latitude
                : currentPosition.latitude,
              100
            )}
            point={{
              pixelSize: 16,
              color: Color.DODGERBLUE,
              outlineColor: Color.WHITE,
              outlineWidth: 3,
            }}
            label={{
              text: `${droneId} · ${routeProgress * 100}%`,
              font: "13px sans-serif",
              fillColor: Color.WHITE,
              showBackground: true,
              backgroundColor: Color.fromCssColorString("#172033"),
              pixelOffset: new Cartesian3(0, -25, 0),
            }}
          />
        ) : (
          /* All drones on the overview map */
          fleet.map((drone) => (
            <Entity
              key={drone.id}
              name={drone.id}
              description={`Location: ${drone.location}`}
              position={Cartesian3.fromDegrees(
                drone.longitude,
                drone.latitude,
                100
              )}
              point={{
                pixelSize: 13,
                color: drone.color,
                outlineColor: Color.WHITE,
                outlineWidth: 2,
              }}
              label={{
                text: drone.id,
                font: "13px sans-serif",
                fillColor: Color.WHITE,
                showBackground: true,
                backgroundColor:
                  Color.fromCssColorString("#172033"),
                pixelOffset: new Cartesian3(0, -24, 0),
              }}
            />
          ))
        )}
      </Viewer>
    </div>
  );
}

export default GlobeView;
