import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Nav from "./components/Nav";
import SessionsList from "./pages/SessionsList";
import SessionDetail from "./pages/SessionDetail";
import ExercisesList from "./pages/ExercisesList";
import ExerciseDetail from "./pages/ExerciseDetail";
import Progress from "./pages/Progress";
import Body from "./pages/Body";
import Login from "./pages/Login";
import NewSession from "./pages/NewSession";
import LogSession from "./pages/LogSession";

import styles from "./App.module.scss";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Nav />
                <main className={styles.main}>
                  <Routes>
                    <Route path="/" element={<SessionsList />} />
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/exercises" element={<ExercisesList />} />
                    <Route path="/exercises/:id" element={<ExerciseDetail />} />
                    <Route path="/progress" element={<Progress />} />
                    <Route path="/body" element={<Body />} />
                    <Route path="/sessions/new" element={<NewSession />} />
                    <Route path="/sessions/:id/log" element={<LogSession />} />
                  </Routes>
                </main>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
