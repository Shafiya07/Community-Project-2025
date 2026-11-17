import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Footer from "../Components/shilajit/Footer";

const Home = React.lazy(() => import("./shilajit/Home"));
const Directory = React.lazy(() => import("./shilajit/Directory"));
const WorkerRegistration = React.lazy(() => import("./shilajit/WorkerRegistration"));
const WorkerProfile = React.lazy(() => import("./shilajit/WorkerProfile"));
const About = React.lazy(() => import("./shilajit/About"));
const InfoPage = React.lazy(() => import("./shilajit/InfoPage"));
const Admin = React.lazy(() => import("./shilajit/Admin"));

const AllRoutes = () => {
  return (
    <div>
      <React.Suspense fallback={<div role="status">Loading page...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workers" element={<Directory />} />
          <Route path="/workers/:id" element={<WorkerProfile />} />
          <Route path="/register" element={<WorkerRegistration />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<InfoPage page="contact" />} />
          <Route path="/privacy" element={<InfoPage page="privacy" />} />
          <Route path="/terms" element={<InfoPage page="terms" />} />
          <Route path="/allservices" element={<Navigate to="/workers" replace />} />
          <Route path="/services" element={<Navigate to="/register" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
      <Footer />
    </div>
  )
}

export default AllRoutes