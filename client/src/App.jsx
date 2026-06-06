import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import SessionsList from "./pages/SessionsList";
import SessionDetail from "./pages/SessionDetail";
import ExercisesList from "./pages/ExercisesList";
import ExerciseDetail from "./pages/ExerciseDetail";
import Progress from "./pages/Progress";

import styles from "./App.module.scss";

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<SessionsList />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/exercises" element={<ExercisesList />} />
          <Route path="/exercises/:id" element={<ExerciseDetail />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/body" element={<div>Body</div>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
