import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import "./MenuAdmin.css";
import "./AdminLayout.css";

const { Title, Text } = Typography;

export default function AdminLogin() {
  const { login, logout, isAuthenticated, isAdmin, isInitializing } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!isInitializing && isAuthenticated && isAdmin) return <Navigate to="/" replace />;

  async function onFinish(values) {
    setError("");
    setLoading(true);
    try {
      const user = await login(values);
      if (user.role !== "admin") {
        await logout();
        setError("That account does not have staff access. Please use the Customer Portal.");
      } else {
        navigate("/", { replace: true });
      }
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <Card className="admin-login-card">
        <Text className="eyebrow">RESTAURANT CONTROL</Text>
        <Title level={3} style={{ marginTop: 4 }}>Staff sign in</Title>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: "Email is required" }]}>
            <Input type="email" autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: "Password is required" }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>Sign in</Button>
        </Form>
      </Card>
    </div>
  );
}
