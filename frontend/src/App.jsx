import { Routes, Route } from "react-router-dom";
import Overview from "./pages/Overview";
import StockDetail from "./pages/StockDetail";
import Sectors from "./pages/Sectors";
import SectorDetail from "./pages/SectorDetail";
import Briefing from "./pages/Briefing";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/stock/:ticker" element={<StockDetail />} />
      <Route path="/sectors" element={<Sectors />} />
      <Route path="/sectors/:sector" element={<SectorDetail />} />
      <Route path="/briefing" element={<Briefing />} />
    </Routes>
  );
}
