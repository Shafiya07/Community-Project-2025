import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "./App";

test("renders the Namma Seva service landing page", async () => {
  const { container } = render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(await screen.findByRole("heading", { name: /home services at your doorstep/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /explore services/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /short-term jobs & services/i })).toBeInTheDocument();
  expect(container.querySelectorAll(".short-term-card")).toHaveLength(14);
  const serviceImages = container.querySelectorAll(".short-term-card img");
  expect(serviceImages).toHaveLength(14);
  expect(Array.from(serviceImages).every((image) => image.getAttribute("src"))).toBe(true);
});

test("sends a popular service search to the worker directory", async () => {
  localStorage.setItem("namma-seva-language", "en");
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole("button", { name: "Cleaning" }));
  expect(screen.getByRole("combobox", { name: /i need a service/i })).toHaveValue("Home Cleaning");
  fireEvent.click(screen.getByRole("button", { name: /search services/i }));

  expect(await screen.findByRole("heading", { name: /find local workers/i })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /profession or keyword/i })).toHaveValue("Home Cleaning");
});

test("lets visitors close and reopen the homepage sidebar", async () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  const sidebar = await screen.findByRole("complementary", { name: /namma seva navigation/i });

  fireEvent.click(screen.getByRole("button", { name: "Close navigation sidebar" }));
  expect(sidebar).toHaveClass("is-closed");
  expect(sidebar).toHaveAttribute("aria-hidden", "true");

  fireEvent.click(screen.getByRole("button", { name: "Open navigation sidebar" }));
  expect(sidebar).not.toHaveClass("is-closed");
  expect(sidebar).toHaveAttribute("aria-hidden", "false");
});

test("offers the new short-term services in worker registration", async () => {
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <App />
    </MemoryRouter>
  );
  const profession = await screen.findByLabelText(/primary profession/i);

  for (const service of ["Mehendi Artist", "Home Baker", "Photographer", "Makeup Artist", "Tailoring Service", "Tuition Teacher", "Rangoli Artist", "Pet Sitter", "Car Washing Service", "Home Cook", "Event Decorator", "Beauty Service Provider", "Mobile Repair Service", "Yoga Instructor"]) {
    expect(profession).toHaveTextContent(service);
  }
});

test("provides an owner sign-in route", async () => {
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <App />
    </MemoryRouter>
  );
  expect(await screen.findByRole("heading", { name: /owner dashboard/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/admin email/i)).toBeInTheDocument();
});

test("lets visitors switch the worker directory to a Tumakuru map", async () => {
  localStorage.setItem("namma-seva-language", "en");
  render(
    <MemoryRouter initialEntries={["/workers"]}>
      <App />
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole("button", { name: "Map" }));

  expect(screen.getByTitle("Map of Tumakuru")).toBeInTheDocument();
  expect(screen.getByText(/not an individual worker/i)).toBeInTheDocument();
});

test("disables registration and explains missing production anti-spam setup", async () => {
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
  localStorage.setItem("namma-seva-language", "en");

  try {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/VITE_TURNSTILE_SITE_KEY in Vercel/i);
    expect(screen.getByRole("button", { name: /submit for review/i })).toBeDisabled();
  } finally {
    vi.unstubAllEnvs();
  }
});
