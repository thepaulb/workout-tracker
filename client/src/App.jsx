import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import SessionsList from "./pages/SessionsList";
import SessionDetail from "./pages/SessionDetail";
import styles from "./App.module.scss";

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<SessionsList />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/exercises" element={<div>Exercises</div>} />
          <Route path="/progress" element={<div>Progress</div>} />
          <Route path="/body" element={<div>Body</div>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
