import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, vi } from "vitest";
import { getWorkers } from "../../api/workers";
import { LanguageProvider } from "../../i18n/LanguageContext";
import Directory from "./Directory";
import WorkerProfile from "./WorkerProfile";

vi.mock("../../api/workers", () => ({
  averageRating: () => null,
  getReviews: vi.fn().mockResolvedValue([]),
  getWorker: vi.fn(),
  getWorkers: vi.fn().mockResolvedValue([
    {
      id: "worker-1",
      name: "Anu",
      profession: "ಮೆಹೆಂದಿ ಕಲಾವಿದ",
      skills: ["Bridal henna"],
      experience: 3,
      serviceAreas: ["Tumakuru"],
      status: "approved",
      verified: false,
      photo: "",
    },
  ]),
  isValidIndianMobile: () => false,
  normalizeMobile: (phone) => phone,
}));

beforeEach(() => {
  localStorage.setItem("namma-seva-language", "en");
});

test("matches the English service search with a Kannada worker profession", async () => {
  render(
    <MemoryRouter initialEntries={["/workers?service=Mehendi%20Artist&locality=Tumakuru"]}>
      <LanguageProvider>
        <Directory />
      </LanguageProvider>
    </MemoryRouter>
  );

  expect(await screen.findByRole("heading", { name: "Anu" })).toBeInTheDocument();
});

test("shows demo workers and opens a clearly labeled sample profile when none are approved", async () => {
  getWorkers.mockResolvedValueOnce([]);
  render(
    <MemoryRouter initialEntries={["/workers"]}>
      <LanguageProvider>
        <Routes>
          <Route path="/workers" element={<Directory />} />
          <Route path="/workers/:id" element={<WorkerProfile />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  );

  expect(await screen.findByText(/fictional sample profiles for preview only/i)).toBeInTheDocument();
  fireEvent.click((await screen.findAllByRole("link", { name: /view profile/i }))[0]);

  expect(await screen.findByRole("heading", { name: "Suresh (Demo)" })).toBeInTheDocument();
  expect(screen.getByText(/fictional examples, not a real worker/i)).toBeInTheDocument();
  expect(screen.getByText(/House wiring, Fan installation, Switchboard repair, MCB fitting/i)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /call worker/i })).not.toBeInTheDocument();
});

test("shows sample profiles when Supabase is not configured", async () => {
  getWorkers.mockRejectedValueOnce(new Error("Supabase is not configured."));
  render(
    <MemoryRouter initialEntries={["/workers"]}>
      <LanguageProvider>
        <Directory />
      </LanguageProvider>
    </MemoryRouter>
  );

  expect(await screen.findByText(/fictional sample profiles for preview only/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Suresh (Demo)" })).toBeInTheDocument();
});
