import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "../hooks/useAuth";

// A tiny consumer that surfaces auth state and actions for assertions.
function Consumer() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? user.username : "none"}</div>
      <button onClick={() => login("paul", "pw")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AuthProvider", () => {
  it("bootstraps the user from /api/auth/me on mount", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ username: "paul" }) });

    renderWithProvider();
    // loading flips to false and the user is populated.
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("paul");
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/me");
  });

  it("leaves the user null when /me is unauthenticated", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => null });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("login posts credentials and sets the user", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url === "/api/auth/me") return { ok: false, json: async () => null };
      return { ok: true, json: async () => ({ username: "paul" }) };
    });
    global.fetch = fetchMock;

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await userEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("paul"));

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "paul", password: "pw" }),
    });
  });

  it("login throws on bad credentials and leaves the user null", async () => {
    let onMe = true;
    global.fetch = vi.fn(async () => {
      if (onMe) {
        onMe = false;
        return { ok: false, json: async () => null };
      }
      return { ok: false, json: async () => null }; // login fails
    });

    render(
      <AuthProvider>
        <FailingLogin />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("Invalid credentials"));
  });

  it("logout clears the user", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ username: "paul" }) });

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("paul"));

    await userEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
  });
});

// Consumer that calls login on mount and reports any thrown error.
import { useEffect, useState } from "react";
function FailingLogin() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  useEffect(() => {
    login("paul", "wrong").catch((e) => setError(e.message));
  }, [login]);
  return <div data-testid="error">{error}</div>;
}
