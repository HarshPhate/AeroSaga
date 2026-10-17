
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Ion } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./index.css";
import App from "./App.jsx";

// Configure the Cesium ion access token.
Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
