
import { useEffect, useRef } from "react";
import { Viewer, Entity, Globe } from "resium";
import {
  Cartesian3,
  Color,
  ArcType,
  UrlTemplateImageryProvider,
} from "cesium";

const drones = [
  {
    id: "DRONE-01",
    location: "Vijayawada",
    longitude: 80.648,
    latitude: 16.506,
    color: Color.LIME,
    moving: true,
  },
  {
    id: "DRONE-02",
    location: "Guntur",
    longitude: 80.4365,
    latitude: 16.3067,
    color: Color.DODGERBLUE,
    moving: false,
  },
  {
    id: "DRONE-03",
    location: "Tenali",
    longitude: 80.64,
    latitude: 16.243,
    color: Color.ORANGE,
    moving: false,
  },
];

const routePositions = Cartesian3.fromDegreesArray([
  80.648, 16.506,
  80.4365, 16.3067,
]);

function GlobeView({ progress }) {
  const viewerRef = useRef(null);

  // Load satellite imagery.
  useEffect(() => {
    let frameId;
    let cancelled = false;
    let satelliteLayer;

    const setupImagery = () => {
      if (cancelled) return;

      const viewer = viewerRef.current?.cesiumElement;

      if (!viewer || viewer.isDestroyed()) {
        frameId = requestAnimationFrame(setupImagery);
        return;
      }

      // Remove default imagery before adding satellite tiles.
      viewer.imageryLayers.removeAll();

      const satelliteProvider = new UrlTemplateImageryProvider({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        credit: "Tiles © Esri",
        maximumLevel: 19,
      });

      satelliteLayer =
        viewer.imageryLayers.addImageryProvider(
          satelliteProvider
        );

      viewer.scene.requestRender();
    };

    frameId = requestAnimationFrame(setupImagery);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);

      const viewer = viewerRef.current?.cesiumElement;

      if (
        viewer &&
        !viewer.isDestroyed() &&
        satelliteLayer
      ) {
        viewer.imageryLayers.remove(satelliteLayer, true);
      }
    };
  }, []);

  // Zoom into the drone delivery region.
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

      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          80.55,
          16.38,
          350000
        ),
        duration: 1.5,
      });
    };

    frameId = requestAnimationFrame(setCamera);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Add the delivery route.
  useEffect(() => {
    let frameId;
    let routeEntity;
    let cancelled = false;

    const addRoute = () => {
      if (cancelled) return;

      const viewer = viewerRef.current?.cesiumElement;

      if (!viewer || viewer.isDestroyed()) {
        frameId = requestAnimationFrame(addRoute);
        return;
      }

      routeEntity = viewer.entities.add({
        name: "Vijayawada to Guntur Delivery Route",
        polyline: {
          positions: routePositions,
          width: 5,
          material: Color.fromCssColorString("#2563eb"),
          arcType: ArcType.GEODESIC,
          clampToGround: true,
        },
      });

      viewer.scene.requestRender();
    };

    frameId = requestAnimationFrame(addRoute);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);

      const viewer = viewerRef.current?.cesiumElement;

      if (
        routeEntity &&
        viewer &&
        !viewer.isDestroyed()
      ) {
        viewer.entities.remove(routeEntity);
        viewer.scene.requestRender();
      }
    };
  }, []);

  // Animate DRONE-01 using mission progress.
  const routeProgress = Math.max(
    0,
    Math.min(1, (progress ?? 0) / 100)
  );

  const movingLongitude =
    80.648 + (80.4365 - 80.648) * routeProgress;

  const movingLatitude =
    16.506 + (16.3067 - 16.506) * routeProgress;

  return (
    <div style={{ height: "420px", width: "100%" }}>
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

        {drones.map((drone) => {
          const longitude = drone.moving
            ? movingLongitude
            : drone.longitude;

          const latitude = drone.moving
            ? movingLatitude
            : drone.latitude;

          return (
            <Entity
              key={drone.id}
              name={drone.id}
              description={`Location: ${drone.location}`}
              position={Cartesian3.fromDegrees(
                longitude,
                latitude,
                100
              )}
              point={{
                pixelSize: drone.moving ? 15 : 12,
                color: drone.color,
                outlineColor: Color.WHITE,
                outlineWidth: 2,
              }}
              label={{
                text: drone.id,
                font: "13px sans-serif",
                fillColor: Color.WHITE,
                showBackground: true,
                backgroundColor: Color.fromCssColorString(
                  "#172033"
                ),
                pixelOffset: new Cartesian3(0, -24, 0),
              }}
            />
          );
        })}
      </Viewer>
    </div>
  );
}

export default GlobeView;
