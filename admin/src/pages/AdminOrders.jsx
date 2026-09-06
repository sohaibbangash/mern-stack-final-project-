import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Descriptions, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import { orderApi } from "../services/orderApi.js";
import { formatDate, formatPrice } from "../utils/format.js";
import "./MenuAdmin.css";

const { Title, Text } = Typography;

// Mirrors the server transition table; the server is still the authority and rejects anything else.
const NEXT_STATUSES = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

const STATUS_COLOUR = {
  pending: "gold",
  confirmed: "blue",
  preparing: "purple",
  ready: "cyan",
  completed: "green",
  cancelled: "red",
};

const STATUS_OPTIONS = [
  { label: "All orders", value: "" },
  ...Object.keys(NEXT_STATUSES).map((status) => ({ label: status[0].toUpperCase() + status.slice(1), value: status })),
];

export default function AdminOrders() {
  const { message } = App.useApp();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderApi.listAll({ status: status || undefined, page, limit: 20 });
      setOrders(response.data);
      setMeta(response.meta);
      setApiError("");
    } catch (error) {
      setApiError(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const changeStatus = async (order, next) => {
    setUpdatingId(order._id);
    try {
      const response = await orderApi.updateStatus(order._id, next);
      setOrders((current) => current.map((row) => (row._id === order._id ? { ...row, ...response.data } : row)));
      message.success(`${order.orderNumber} is now ${next}`);
    } catch (error) {
      message.error(error.message || "Could not update this order.");
    } finally {
      setUpdatingId("");
    }
  };

  const columns = [
    { title: "Order", dataIndex: "orderNumber", render: (orderNumber, order) => <div><strong>{orderNumber}</strong><br /><Text type="secondary">{formatDate(order.createdAt)}</Text></div> },
    { title: "Customer", key: "customer", render: (_, order) => <div><strong>{order.contact?.name}</strong><br /><Text type="secondary">{order.user?.email || "—"}</Text></div> },
    { title: "Items", key: "items", render: (_, order) => order.items.reduce((sum, item) => sum + item.quantity, 0) },
    { title: "Total", dataIndex: "total", render: (total) => formatPrice(total) },
    { title: "Payment", key: "payment", render: (_, order) => `${order.paymentMethod === "stripe" ? "Stripe" : order.paymentMethod === "mock_card" ? "Mock card" : "Cash"} · ${order.paymentStatus}` },
    { title: "Status", dataIndex: "status", render: (value) => <Tag color={STATUS_COLOUR[value]}>{value}</Tag> },
    {
      title: "Actions",
      key: "actions",
      render: (_, order) => {
        const next = NEXT_STATUSES[order.status] ?? [];
        if (!next.length) return <Text type="secondary">No further action</Text>;
        return (
          <Space>
            {next.map((target) => {
              const isRejectOrCancel = target === "cancelled";
              const label = isRejectOrCancel
                ? order.status === "pending"
                  ? "Reject"
                  : "Cancel"
                : `Mark ${target}`;
              const confirmTitle = isRejectOrCancel
                ? order.status === "pending"
                  ? `Reject order ${order.orderNumber}?`
                  : `Cancel order ${order.orderNumber}?`
                : `Mark ${order.orderNumber} as ${target}?`;

              return (
                <Popconfirm key={target} title={confirmTitle} onConfirm={() => changeStatus(order, target)}>
                  <Button type="link" danger={isRejectOrCancel} loading={updatingId === order._id}>
                    {label}
                  </Button>
                </Popconfirm>
              );
            })}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <div className="admin-title">
        <div>
          <Text className="eyebrow">RESTAURANT CONTROL</Text>
          <Title level={2}>Orders</Title>
          <Text type="secondary">Track incoming orders and move them through the kitchen.</Text>
        </div>
        <Space>
          <Select value={status} options={STATUS_OPTIONS} style={{ width: 160 }} onChange={(value) => { setStatus(value); setPage(1); }} />
          <Button onClick={loadData}>Refresh</Button>
        </Space>
      </div>

      {apiError && <Alert className="api-alert" type="warning" showIcon message="Could not load orders" description={apiError} action={<Button size="small" onClick={loadData}>Retry</Button>} />}

      <Card className="admin-table-card">
        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={orders}
          scroll={{ x: 900 }}
          pagination={{ current: meta.page, pageSize: meta.limit, total: meta.total, showSizeChanger: false, onChange: setPage }}
          expandable={{
            expandedRowRender: (order) => (
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="Items">
                  {order.items.map((item) => `${item.quantity} × ${item.name} (${formatPrice(item.lineTotal)})`).join(", ")}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">{order.contact?.phone}</Descriptions.Item>
                <Descriptions.Item label="Address">{order.contact?.address}</Descriptions.Item>
                {order.contact?.note ? <Descriptions.Item label="Note">{order.contact.note}</Descriptions.Item> : null}
              </Descriptions>
            ),
          }}
        />
      </Card>
    </>
  );
}
