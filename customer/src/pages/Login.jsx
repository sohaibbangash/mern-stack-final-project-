import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { safeNext } from "../utils/safeNext.js";
import "./Account.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const user = await login(form);
      if (user?.role === "admin") {
        await logout();
        setError("This is the customer portal. Administrator accounts must sign in through the Admin Portal.");
        return;
      }
      navigate(next, { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="account-page">
      <div className="account-card narrow">
        <h1 className="account-title">Welcome back</h1>
        <p className="account-subtitle">Sign in to order from the GHALIB kitchen.</p>

        {location.state?.message && <div className="alert success">{location.state.message}</div>}
        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={update("email")} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={update("password")} autoComplete="current-password" required />
          </label>
          <button className="btn block" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="form-note"><Link to="/forgot-password">Forgot your password?</Link></p>
        <p className="form-note">New here? <Link to={`/register?next=${encodeURIComponent(next)}`}>Create an account</Link></p>
      </div>
    </div>
  );
}
