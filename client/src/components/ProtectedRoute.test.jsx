import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { AuthContext } from "../context/AuthContext";

// Render ProtectedRoute with an explicit auth context value, inside a router
// so the redirect target ("/login") can be asserted.
function renderWith(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={["/secret"]}>
        <Routes>
          <Route
            path="/secret"
            element={
              <ProtectedRoute>
                <div>secret content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("renders nothing while auth is still loading", () => {
    const { container } = renderWith({ user: null, loading: true });
    expect(container).toHaveTextContent("");
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("redirects to /login when there is no user", () => {
    renderWith({ user: null, loading: false });
    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    renderWith({ user: { username: "paul" }, loading: false });
    expect(screen.getByText("secret content")).toBeInTheDocument();
  });
});
