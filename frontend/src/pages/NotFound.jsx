import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <div className="not-found-glow" aria-hidden="true" />
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>Oops! The page you are looking for does not exist or has been moved.</p>
        <Link className="not-found-btn" to="/login">
          Go Back Home
        </Link>
      </section>
    </main>
  );
}

export default NotFound;
