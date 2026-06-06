import { BrowserRouter, Routes, Route } from "react-router-dom";
import SessionsList from "./pages/SessionsList";
import SessionDetail from "./pages/SessionDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SessionsList />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
